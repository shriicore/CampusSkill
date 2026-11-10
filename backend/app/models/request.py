from datetime import datetime
from app.extensions import db

class LearningRequest(db.Model):
    __tablename__ = "learning_requests"

    id = db.Column(db.Integer, primary_key=True)
    requester_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mentor_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    message = db.Column(db.Text, nullable=True)
    preferred_mode = db.Column(db.String(20), default="online")  # 'online' or 'offline'
    status = db.Column(db.String(30), nullable=False, default="pending")  # 'pending', 'accepted', 'rejected', 'cancelled'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    requester = db.relationship("User", foreign_keys=[requester_id], back_populates="sent_requests")
    mentor = db.relationship("User", foreign_keys=[mentor_id], back_populates="received_requests")
    skill = db.relationship("Skill")
    sessions = db.relationship("Session", back_populates="request", cascade="all, delete-orphan")

    VALID_TRANSITIONS = {
        "pending": ["accepted", "rejected", "cancelled"],
        "accepted": ["cancelled"],  # or transitions to sessions
        "rejected": [],
        "cancelled": []
    }

    def can_transition_to(self, new_status: str) -> bool:
        return new_status in self.VALID_TRANSITIONS.get(self.status, [])

    def to_dict(self):
        return {
            "id": self.id,
            "requester_id": self.requester_id,
            "requester_name": self.requester.name if self.requester else None,
            "requester_department": self.requester.department if self.requester else None,
            "mentor_id": self.mentor_id,
            "mentor_name": self.mentor.name if self.mentor else None,
            "mentor_department": self.mentor.department if self.mentor else None,
            "skill_id": self.skill_id,
            "skill_name": self.skill.name if self.skill else None,
            "message": self.message,
            "preferred_mode": self.preferred_mode,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "has_session": len(self.sessions) > 0
        }
