from datetime import datetime
from app.extensions import db

class Session(db.Model):
    __tablename__ = "sessions"

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("learning_requests.id", ondelete="SET NULL"), nullable=True)
    mentor_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    learner_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    scheduled_start = db.Column(db.DateTime, nullable=False)
    scheduled_end = db.Column(db.DateTime, nullable=False)
    mode = db.Column(db.String(20), nullable=False, default="online")  # 'online' or 'offline'
    meeting_info = db.Column(db.String(255), nullable=True)  # link or physical campus location
    fee_paise = db.Column(db.Integer, nullable=False, default=0)
    status = db.Column(db.String(30), nullable=False, default="scheduled")  # 'scheduled', 'completed', 'cancelled'
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    request = db.relationship("LearningRequest", back_populates="sessions")
    mentor = db.relationship("User", foreign_keys=[mentor_id], back_populates="sessions_as_mentor")
    learner = db.relationship("User", foreign_keys=[learner_id], back_populates="sessions_as_learner")
    skill = db.relationship("Skill")
    reviews = db.relationship("Review", back_populates="session", cascade="all, delete-orphan")
    transactions = db.relationship("PaymentTransaction", back_populates="session", cascade="all, delete-orphan")

    VALID_TRANSITIONS = {
        "scheduled": ["completed", "cancelled"],
        "completed": [],
        "cancelled": []
    }

    def can_transition_to(self, new_status: str) -> bool:
        return new_status in self.VALID_TRANSITIONS.get(self.status, [])

    @property
    def latest_transaction(self):
        if not self.transactions:
            return None
        # Return most recently updated transaction
        return sorted(self.transactions, key=lambda t: t.updated_at or t.created_at, reverse=True)[0]

    @property
    def payment_status(self) -> str:
        if self.fee_paise == 0:
            return "free"
        tx = self.latest_transaction
        if not tx:
            return "unpaid"
        return tx.status

    def to_dict(self):
        tx = self.latest_transaction
        return {
            "id": self.id,
            "request_id": self.request_id,
            "mentor_id": self.mentor_id,
            "mentor_name": self.mentor.name if self.mentor else None,
            "mentor_email": self.mentor.email if self.mentor else None,
            "learner_id": self.learner_id,
            "learner_name": self.learner.name if self.learner else None,
            "learner_email": self.learner.email if self.learner else None,
            "skill_id": self.skill_id,
            "skill_name": self.skill.name if self.skill else None,
            "title": self.title,
            "scheduled_start": self.scheduled_start.isoformat() if self.scheduled_start else None,
            "scheduled_end": self.scheduled_end.isoformat() if self.scheduled_end else None,
            "mode": self.mode,
            "meeting_info": self.meeting_info,
            "fee_paise": self.fee_paise,
            "fee_inr": round(self.fee_paise / 100, 2),
            "status": self.status,
            "notes": self.notes,
            "payment_status": self.payment_status,
            "transaction_id": tx.id if tx else None,
            "gateway_order_id": tx.gateway_order_id if tx else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "has_review": len(self.reviews) > 0
        }
