from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.review import Review
from app.models.session import Session
from app.utils.auth_helpers import token_required
from app.utils.validators import validate_rating
from app.services.notification_service import NotificationService

reviews_bp = Blueprint("reviews", __name__)

@reviews_bp.route("", methods=["POST"])
@token_required
def create_review():
    user = request.current_user
    data = request.get_json() or {}

    session_id = data.get("session_id")
    rating_raw = data.get("rating")
    comment = (data.get("comment") or "").strip()

    if not session_id or rating_raw is None:
        return jsonify({"error": "Session ID and rating are required."}), 400

    is_valid_rating, rating_err = validate_rating(rating_raw)
    if not is_valid_rating:
        return jsonify({"error": rating_err}), 400
    rating = int(rating_raw)

    session_obj = Session.query.get(session_id)
    if not session_obj:
        return jsonify({"error": "Session not found."}), 404

    # Enforce completed status
    if session_obj.status != "completed":
        return jsonify({"error": "Reviews can only be submitted for completed sessions."}), 400

    # Ensure current user was an eligible participant
    if user.id != session_obj.learner_id and user.id != session_obj.mentor_id:
        return jsonify({"error": "Only session participants are eligible to review this session."}), 403

    # Reviewee is the counterparty
    reviewee_id = session_obj.mentor_id if user.id == session_obj.learner_id else session_obj.learner_id

    # Prevent duplicate reviews by the same reviewer for this session
    existing_review = Review.query.filter_by(session_id=session_id, reviewer_id=user.id).first()
    if existing_review:
        return jsonify({"error": "You have already submitted a review for this session."}), 409

    review = Review(
        session_id=session_id,
        reviewer_id=user.id,
        reviewee_id=reviewee_id,
        rating=rating,
        comment=comment or None
    )
    db.session.add(review)
    db.session.commit()

    NotificationService.create_notification(
        user_id=reviewee_id,
        title="New Feedback Received",
        message=f"{user.name} rated your session with {rating} stars.",
        notif_type="review",
        link=f"/profile/{reviewee_id}"
    )

    return jsonify({
        "message": "Review submitted successfully.",
        "review": review.to_dict()
    }), 201

@reviews_bp.route("/user/<int:user_id>", methods=["GET"])
def get_user_reviews(user_id: int):
    reviews = Review.query.filter_by(reviewee_id=user_id).order_by(Review.created_at.desc()).all()
    return jsonify({
        "reviews": [r.to_dict() for r in reviews],
        "total_reviews": len(reviews)
    }), 200
