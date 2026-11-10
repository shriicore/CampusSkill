from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(180), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="student")  # 'student' or 'admin'
    department = db.Column(db.String(100), nullable=True)
    semester = db.Column(db.Integer, nullable=True)
    bio = db.Column(db.Text, nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    hourly_rate_paise = db.Column(db.Integer, default=0)  # default session fee in paise (INR * 100)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user_skills = db.relationship("UserSkill", back_populates="user", cascade="all, delete-orphan")
    sent_requests = db.relationship("LearningRequest", foreign_keys="LearningRequest.requester_id", back_populates="requester", cascade="all, delete-orphan")
    received_requests = db.relationship("LearningRequest", foreign_keys="LearningRequest.mentor_id", back_populates="mentor", cascade="all, delete-orphan")
    sessions_as_mentor = db.relationship("Session", foreign_keys="Session.mentor_id", back_populates="mentor", cascade="all, delete-orphan")
    sessions_as_learner = db.relationship("Session", foreign_keys="Session.learner_id", back_populates="learner", cascade="all, delete-orphan")
    reviews_given = db.relationship("Review", foreign_keys="Review.reviewer_id", back_populates="reviewer", cascade="all, delete-orphan")
    reviews_received = db.relationship("Review", foreign_keys="Review.reviewee_id", back_populates="reviewee", cascade="all, delete-orphan")
    notifications = db.relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    transactions_paid = db.relationship("PaymentTransaction", foreign_keys="PaymentTransaction.payer_id", back_populates="payer")
    transactions_received = db.relationship("PaymentTransaction", foreign_keys="PaymentTransaction.payee_id", back_populates="payee")

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    @property
    def average_rating(self) -> float:
        if not self.reviews_received:
            return 0.0
        return round(sum(r.rating for r in self.reviews_received) / len(self.reviews_received), 1)

    @property
    def total_reviews(self) -> int:
        return len(self.reviews_received)

    @property
    def offered_skills(self):
        return [us for us in self.user_skills if us.skill_type == "offered"]

    @property
    def wanted_skills(self):
        return [us for us in self.user_skills if us.skill_type == "wanted"]

    def to_dict(self, include_sensitive=False):
        data = {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "department": self.department,
            "semester": self.semester,
            "bio": self.bio,
            "avatar_url": self.avatar_url,
            "hourly_rate_paise": self.hourly_rate_paise,
            "hourly_rate_inr": round(self.hourly_rate_paise / 100, 2) if self.hourly_rate_paise else 0,
            "is_active": self.is_active,
            "average_rating": self.average_rating,
            "total_reviews": self.total_reviews,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "offered_skills_count": len(self.offered_skills),
            "wanted_skills_count": len(self.wanted_skills),
            "offered_skills": [us.to_dict() for us in self.offered_skills],
            "wanted_skills": [us.to_dict() for us in self.wanted_skills],
        }
        return data

    def to_detailed_dict(self):
        data = self.to_dict()
        data["reviews"] = [r.to_dict() for r in self.reviews_received[:15]]
        return data
