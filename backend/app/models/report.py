from datetime import datetime
from app.extensions import db

class Report(db.Model):
    __tablename__ = "reports"

    id = db.Column(db.Integer, primary_key=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reported_user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True)
    reason = db.Column(db.String(150), nullable=False)
    details = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(30), nullable=False, default="open")  # 'open', 'resolved', 'dismissed'
    admin_action = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    reporter = db.relationship("User", foreign_keys=[reporter_id])
    reported_user = db.relationship("User", foreign_keys=[reported_user_id])
    session = db.relationship("Session")

    def to_dict(self):
        return {
            "id": self.id,
            "reporter_id": self.reporter_id,
            "reporter_name": self.reporter.name if self.reporter else None,
            "reported_user_id": self.reported_user_id,
            "reported_user_name": self.reported_user.name if self.reported_user else None,
            "session_id": self.session_id,
            "reason": self.reason,
            "details": self.details,
            "status": self.status,
            "admin_action": self.admin_action,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None
        }
