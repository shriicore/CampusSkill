from datetime import datetime
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.user import User
from app.models.skill import SkillCategory, Skill
from app.models.session import Session
from app.models.payment import PaymentTransaction, RefundRequest
from app.models.report import Report
from app.utils.auth_helpers import admin_required
from app.services.payment_service import PaymentService

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/stats", methods=["GET"])
@admin_required
def get_stats():
    total_students = User.query.filter_by(role="student").count()
    active_students = User.query.filter_by(role="student", is_active=True).count()
    total_skills = Skill.query.count()
    total_categories = SkillCategory.query.count()
    total_sessions = Session.query.count()
    completed_sessions = Session.query.filter_by(status="completed").count()

    # Financial stats
    paid_transactions = PaymentTransaction.query.filter_by(status="paid").all()
    total_volume_paise = sum(t.amount_paise for t in paid_transactions)
    refunded_transactions = PaymentTransaction.query.filter_by(status="refunded").all()
    pending_refunds_count = RefundRequest.query.filter_by(status="pending").count()
    open_reports_count = Report.query.filter_by(status="open").count()

    return jsonify({
        "total_students": total_students,
        "active_students": active_students,
        "total_skills": total_skills,
        "total_categories": total_categories,
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "paid_transactions_count": len(paid_transactions),
        "total_volume_inr": round(total_volume_paise / 100, 2),
        "refunded_count": len(refunded_transactions),
        "pending_refunds_count": pending_refunds_count,
        "open_reports_count": open_reports_count
    }), 200

@admin_bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    search = request.args.get("search", "").strip().lower()
    role = request.args.get("role")
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 30, type=int), 100)

    query = User.query
    if search:
        query = query.filter((User.name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%")))
    if role:
        query = query.filter_by(role=role)

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        "users": [u.to_dict() for u in users],
        "total": total,
        "page": page,
        "per_page": per_page
    }), 200

@admin_bp.route("/users/<int:user_id>/toggle-status", methods=["PUT"])
@admin_required
def toggle_user_status(user_id: int):
    user = User.query.get_or_404(user_id)
    if user.id == request.current_user.id:
        return jsonify({"error": "Cannot deactivate your own administrator account."}), 400

    user.is_active = not user.is_active
    db.session.commit()
    status_str = "activated" if user.is_active else "deactivated"
    return jsonify({
        "message": f"User account {status_str} successfully.",
        "user": user.to_dict()
    }), 200

@admin_bp.route("/categories", methods=["POST"])
@admin_required
def create_category():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip()
    icon_name = (data.get("icon_name") or "Code").strip()

    if not name:
        return jsonify({"error": "Category name is required."}), 400

    if SkillCategory.query.filter_by(name=name).first():
        return jsonify({"error": "Category already exists."}), 409

    cat = SkillCategory(name=name, description=description or None, icon_name=icon_name)
    db.session.add(cat)
    db.session.commit()
    return jsonify({"message": "Category created.", "category": cat.to_dict()}), 201

@admin_bp.route("/categories/<int:cat_id>", methods=["DELETE"])
@admin_required
def delete_category(cat_id: int):
    cat = SkillCategory.query.get_or_404(cat_id)
    db.session.delete(cat)
    db.session.commit()
    return jsonify({"message": "Category deleted."}), 200

@admin_bp.route("/transactions", methods=["GET"])
@admin_required
def get_all_transactions():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 30, type=int), 100)
    status = request.args.get("status")

    query = PaymentTransaction.query
    if status:
        query = query.filter_by(status=status)

    total = query.count()
    txs = query.order_by(PaymentTransaction.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        "transactions": [t.to_dict() for t in txs],
        "total": total,
        "page": page,
        "per_page": per_page
    }), 200

@admin_bp.route("/refund-requests", methods=["GET"])
@admin_required
def get_refund_requests():
    refunds = RefundRequest.query.order_by(RefundRequest.created_at.desc()).all()
    return jsonify({"refund_requests": [r.to_dict() for r in refunds]}), 200

@admin_bp.route("/refund-requests/<int:req_id>/process", methods=["POST"])
@admin_required
def process_refund(req_id: int):
    admin_user = request.current_user
    refund_req = RefundRequest.query.get_or_404(req_id)
    data = request.get_json() or {}
    action = (data.get("action") or "").strip().lower()  # 'approve' or 'reject'
    admin_notes = (data.get("admin_notes") or "").strip()

    if refund_req.status != "pending":
        return jsonify({"error": f"Refund request has already been resolved as '{refund_req.status}'."}), 400

    if action == "reject":
        refund_req.status = "rejected"
        refund_req.admin_notes = admin_notes or "Rejected by platform administrator."
        refund_req.resolved_at = datetime.utcnow()
        # Restore transaction status back to paid
        refund_req.transaction.status = "paid"
        db.session.commit()
        return jsonify({"message": "Refund request rejected.", "refund": refund_req.to_dict()}), 200

    elif action == "approve":
        success, result, status_code = PaymentService.execute_refund(refund_req, admin_user.id)
        return jsonify(result), status_code

    else:
        return jsonify({"error": "Action must be either 'approve' or 'reject'."}), 400
