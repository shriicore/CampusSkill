from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.notification import Notification
from app.utils.auth_helpers import token_required

notifications_bp = Blueprint("notifications", __name__)

@notifications_bp.route("", methods=["GET"])
@token_required
def get_notifications():
    user = request.current_user
    notifications = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc()).limit(50).all()
    unread_count = Notification.query.filter_by(user_id=user.id, is_read=False).count()
    return jsonify({
        "notifications": [n.to_dict() for n in notifications],
        "unread_count": unread_count
    }), 200

@notifications_bp.route("/<int:notif_id>/read", methods=["PUT"])
@token_required
def mark_read(notif_id: int):
    user = request.current_user
    notif = Notification.query.get_or_404(notif_id)

    if notif.user_id != user.id:
        return jsonify({"error": "Unauthorized access to notification."}), 403

    notif.is_read = True
    db.session.commit()
    return jsonify({"message": "Notification marked as read."}), 200

@notifications_bp.route("/mark-all-read", methods=["PUT"])
@token_required
def mark_all_read():
    user = request.current_user
    Notification.query.filter_by(user_id=user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "All notifications marked as read."}), 200
