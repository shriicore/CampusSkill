from datetime import datetime
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.report import Report
from app.utils.auth_helpers import token_required, admin_required

reports_bp = Blueprint("reports", __name__)

@reports_bp.route("", methods=["POST"])
@token_required
def submit_report():
    user = request.current_user
    data = request.get_json() or {}

    reported_user_id = data.get("reported_user_id")
    session_id = data.get("session_id")
    reason = (data.get("reason") or "").strip()
    details = (data.get("details") or "").strip()

    if not reported_user_id or not reason or not details:
        return jsonify({"error": "Target user, reason, and details are required."}), 400

    report = Report(
        reporter_id=user.id,
        reported_user_id=reported_user_id,
        session_id=session_id or None,
        reason=reason,
        details=details,
        status="open"
    )
    db.session.add(report)
    db.session.commit()

    return jsonify({
        "message": "Report submitted. Our moderation team will review this shortly.",
        "report": report.to_dict()
    }), 201

@reports_bp.route("", methods=["GET"])
@admin_required
def list_reports():
    status = request.args.get("status")
    query = Report.query
    if status:
        query = query.filter_by(status=status)

    reports = query.order_by(Report.created_at.desc()).all()
    return jsonify({"reports": [r.to_dict() for r in reports]}), 200

@reports_bp.route("/<int:report_id>/resolve", methods=["PUT"])
@admin_required
def resolve_report(report_id: int):
    report = Report.query.get_or_404(report_id)
    data = request.get_json() or {}
    status = (data.get("status") or "resolved").strip()
    action = (data.get("admin_action") or "").strip()

    report.status = status
    report.admin_action = action or "Action logged by administrator."
    report.resolved_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"message": "Report status updated.", "report": report.to_dict()}), 200
