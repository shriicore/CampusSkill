from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.request import LearningRequest
from app.models.skill import Skill
from app.models.user import User
from app.utils.auth_helpers import token_required
from app.services.notification_service import NotificationService

requests_bp = Blueprint("requests", __name__)

@requests_bp.route("", methods=["GET"])
@token_required
def get_user_requests():
    user = request.current_user
    filter_type = request.args.get("type", "all")  # 'sent', 'received', 'all'

    sent = []
    received = []

    if filter_type in ["sent", "all"]:
        sent = [r.to_dict() for r in user.sent_requests]
    if filter_type in ["received", "all"]:
        received = [r.to_dict() for r in user.received_requests]

    return jsonify({
        "sent_requests": sent,
        "received_requests": received
    }), 200

@requests_bp.route("", methods=["POST"])
@token_required
def create_request():
    user = request.current_user
    data = request.get_json() or {}

    mentor_id = data.get("mentor_id")
    skill_id = data.get("skill_id")
    message = (data.get("message") or "").strip()
    preferred_mode = (data.get("preferred_mode") or "online").strip().lower()

    if not mentor_id or not skill_id:
        return jsonify({"error": "Mentor and skill are required."}), 400

    if mentor_id == user.id:
        return jsonify({"error": "You cannot send a learning request to yourself."}), 400

    mentor = User.query.get(mentor_id)
    if not mentor or not mentor.is_active:
        return jsonify({"error": "Selected mentor account not found or inactive."}), 404

    skill = Skill.query.get(skill_id)
    if not skill:
        return jsonify({"error": "Target skill not found."}), 404

    # Prevent duplicate active pending requests
    existing = LearningRequest.query.filter_by(
        requester_id=user.id,
        mentor_id=mentor_id,
        skill_id=skill_id,
        status="pending"
    ).first()
    if existing:
        return jsonify({"error": "You already have a pending learning request with this student for this skill."}), 409

    new_request = LearningRequest(
        requester_id=user.id,
        mentor_id=mentor_id,
        skill_id=skill_id,
        message=message or None,
        preferred_mode=preferred_mode if preferred_mode in ["online", "offline"] else "online",
        status="pending"
    )
    db.session.add(new_request)
    db.session.commit()

    # Notify mentor
    NotificationService.create_notification(
        user_id=mentor_id,
        title="New Learning Request",
        message=f"{user.name} sent you a request to learn '{skill.name}'.",
        notif_type="request",
        link="/requests"
    )

    return jsonify({
        "message": "Learning request sent successfully.",
        "request": new_request.to_dict()
    }), 201

@requests_bp.route("/<int:req_id>/status", methods=["PUT"])
@token_required
def update_request_status(req_id: int):
    user = request.current_user
    req_obj = LearningRequest.query.get_or_404(req_id)
    data = request.get_json() or {}
    new_status = (data.get("status") or "").strip().lower()

    if not req_obj.can_transition_to(new_status):
        return jsonify({"error": f"Cannot transition request from '{req_obj.status}' to '{new_status}'."}), 400

    # Authorization
    if new_status in ["accepted", "rejected"]:
        if req_obj.mentor_id != user.id:
            return jsonify({"error": "Only the mentor can accept or reject this request."}), 403
    elif new_status == "cancelled":
        if req_obj.requester_id != user.id and req_obj.mentor_id != user.id:
            return jsonify({"error": "Unauthorized to cancel this request."}), 403

    req_obj.status = new_status
    db.session.commit()

    # Send status update notification to appropriate user
    if new_status == "accepted":
        NotificationService.create_notification(
            user_id=req_obj.requester_id,
            title="Request Accepted!",
            message=f"{user.name} accepted your learning request for '{req_obj.skill.name}'. You can now book a session.",
            notif_type="request",
            link="/sessions"
        )
    elif new_status == "rejected":
        NotificationService.create_notification(
            user_id=req_obj.requester_id,
            title="Request Declined",
            message=f"{user.name} was unable to accept your learning request for '{req_obj.skill.name}'.",
            notif_type="request",
            link="/requests"
        )
    elif new_status == "cancelled":
        target_id = req_obj.mentor_id if user.id == req_obj.requester_id else req_obj.requester_id
        NotificationService.create_notification(
            user_id=target_id,
            title="Request Cancelled",
            message=f"{user.name} cancelled the learning request for '{req_obj.skill.name}'.",
            notif_type="request",
            link="/requests"
        )

    return jsonify({
        "message": f"Request status updated to '{new_status}'.",
        "request": req_obj.to_dict()
    }), 200
