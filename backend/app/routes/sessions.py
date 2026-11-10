from datetime import datetime
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.session import Session
from app.models.request import LearningRequest
from app.models.skill import UserSkill
from app.utils.auth_helpers import token_required
from app.utils.validators import parse_iso_datetime, validate_paise_amount
from app.services.notification_service import NotificationService

sessions_bp = Blueprint("sessions", __name__)

@sessions_bp.route("", methods=["GET"])
@token_required
def get_user_sessions():
    user = request.current_user
    status_filter = request.args.get("status")

    # Fetch sessions where user is either learner or mentor
    query = Session.query.filter(
        (Session.mentor_id == user.id) | (Session.learner_id == user.id)
    )
    if status_filter:
        query = query.filter_by(status=status_filter)

    sessions = query.order_by(Session.scheduled_start.desc()).all()
    return jsonify({"sessions": [s.to_dict() for s in sessions]}), 200

@sessions_bp.route("/<int:session_id>", methods=["GET"])
@token_required
def get_session_detail(session_id: int):
    user = request.current_user
    session_obj = Session.query.get_or_404(session_id)

    if session_obj.mentor_id != user.id and session_obj.learner_id != user.id and user.role != "admin":
        return jsonify({"error": "Unauthorized: Access denied to this session."}), 403

    return jsonify({"session": session_obj.to_dict()}), 200

@sessions_bp.route("", methods=["POST"])
@token_required
def schedule_session():
    user = request.current_user
    data = request.get_json() or {}

    request_id = data.get("request_id")
    title = (data.get("title") or "").strip()
    scheduled_start_str = data.get("scheduled_start")
    scheduled_end_str = data.get("scheduled_end")
    mode = (data.get("mode") or "online").strip().lower()
    meeting_info = (data.get("meeting_info") or "").strip()
    notes = (data.get("notes") or "").strip()

    if not request_id or not title or not scheduled_start_str or not scheduled_end_str:
        return jsonify({"error": "Request ID, title, start time, and end time are required."}), 400

    req_obj = LearningRequest.query.get(request_id)
    if not req_obj:
        return jsonify({"error": "Learning request not found."}), 404

    if req_obj.status != "accepted":
        return jsonify({"error": "Sessions can only be scheduled for accepted learning requests."}), 400

    if req_obj.requester_id != user.id and req_obj.mentor_id != user.id:
        return jsonify({"error": "Unauthorized: You are not a participant in this request."}), 403

    start_dt = parse_iso_datetime(scheduled_start_str)
    end_dt = parse_iso_datetime(scheduled_end_str)

    if not start_dt or not end_dt:
        return jsonify({"error": "Invalid date-time format. Use standard ISO 8601 (e.g. 2026-10-25T14:00:00)."}), 400

    if end_dt <= start_dt:
        return jsonify({"error": "Session end time must be after start time."}), 400

    # Conflict check for mentor
    conflict = Session.query.filter(
        Session.mentor_id == req_obj.mentor_id,
        Session.status == "scheduled",
        Session.scheduled_start < end_dt,
        Session.scheduled_end > start_dt
    ).first()
    if conflict:
        return jsonify({"error": f"The mentor already has another active session scheduled between {conflict.scheduled_start.strftime('%H:%M')} and {conflict.scheduled_end.strftime('%H:%M')}."}), 409

    # Determine fee from mentor's offered skill record
    user_skill = UserSkill.query.filter_by(
        user_id=req_obj.mentor_id,
        skill_id=req_obj.skill_id,
        skill_type="offered"
    ).first()

    fee_paise = user_skill.fee_paise if user_skill else req_obj.mentor.hourly_rate_paise or 0

    new_session = Session(
        request_id=req_obj.id,
        mentor_id=req_obj.mentor_id,
        learner_id=req_obj.requester_id,
        skill_id=req_obj.skill_id,
        title=title,
        scheduled_start=start_dt,
        scheduled_end=end_dt,
        mode=mode if mode in ["online", "offline"] else "online",
        meeting_info=meeting_info or ("Online link to be shared" if mode == "online" else "Campus library/room"),
        fee_paise=fee_paise,
        status="scheduled",
        notes=notes or None
    )
    db.session.add(new_session)
    db.session.commit()

    # Notify counterparty
    counterparty_id = req_obj.mentor_id if user.id == req_obj.requester_id else req_obj.requester_id
    NotificationService.create_notification(
        user_id=counterparty_id,
        title="Session Scheduled",
        message=f"Session '{title}' has been scheduled for {start_dt.strftime('%b %d, %Y at %I:%M %p')}.",
        notif_type="session",
        link="/sessions"
    )

    return jsonify({
        "message": "Session scheduled successfully.",
        "session": new_session.to_dict()
    }), 201

@sessions_bp.route("/<int:session_id>/status", methods=["PUT"])
@token_required
def update_session_status(session_id: int):
    user = request.current_user
    session_obj = Session.query.get_or_404(session_id)
    data = request.get_json() or {}
    new_status = (data.get("status") or "").strip().lower()

    if session_obj.mentor_id != user.id and session_obj.learner_id != user.id and user.role != "admin":
        return jsonify({"error": "Unauthorized to update this session."}), 403

    if not session_obj.can_transition_to(new_status):
        return jsonify({"error": f"Cannot transition session from '{session_obj.status}' to '{new_status}'."}), 400

    session_obj.status = new_status
    db.session.commit()

    other_user_id = session_obj.mentor_id if user.id == session_obj.learner_id else session_obj.learner_id
    NotificationService.create_notification(
        user_id=other_user_id,
        title=f"Session {new_status.capitalize()}",
        message=f"Session '{session_obj.title}' was marked as {new_status} by {user.name}.",
        notif_type="session",
        link="/sessions"
    )

    return jsonify({
        "message": f"Session marked as '{new_status}'.",
        "session": session_obj.to_dict()
    }), 200
