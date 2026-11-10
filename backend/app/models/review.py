from datetime import datetime
from app.extensions import db

class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reviewee_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1 to 5
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Unique constraint prevents duplicate reviews for the same session by the same reviewer
    __table_args__ = (
        db.UniqueConstraint("session_id", "reviewer_id", name="uq_session_reviewer"),
        db.CheckConstraint("rating >= 1 AND rating <= 5", name="chk_rating_range")
    )

    # Relationships
    session = db.relationship("Session", back_populates="reviews")
    reviewer = db.relationship("User", foreign_keys=[reviewer_id], back_populates="reviews_given")
    reviewee = db.relationship("User", foreign_keys=[reviewee_id], back_populates="reviews_received")

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "session_title": self.session.title if self.session else None,
            "reviewer_id": self.reviewer_id,
            "reviewer_name": self.reviewer.name if self.reviewer else None,
            "reviewee_id": self.reviewee_id,
            "reviewee_name": self.reviewee.name if self.reviewee else None,
            "rating": self.rating,
            "comment": self.comment,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
