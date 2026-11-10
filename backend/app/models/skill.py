from datetime import datetime
from app.extensions import db

class SkillCategory(db.Model):
    __tablename__ = "skill_categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    icon_name = db.Column(db.String(50), nullable=True, default="Code")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    skills = db.relationship("Skill", back_populates="category", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "icon_name": self.icon_name,
            "skills_count": len(self.skills)
        }

class Skill(db.Model):
    __tablename__ = "skills"

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey("skill_categories.id", ondelete="SET NULL"), nullable=True)
    name = db.Column(db.String(100), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    category = db.relationship("SkillCategory", back_populates="skills")
    user_skills = db.relationship("UserSkill", back_populates="skill", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else "General"
        }

class UserSkill(db.Model):
    __tablename__ = "user_skills"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    skill_type = db.Column(db.String(20), nullable=False)  # 'offered' or 'wanted'
    proficiency = db.Column(db.String(20), nullable=False, default="Intermediate")  # Beginner, Intermediate, Advanced, Expert
    fee_paise = db.Column(db.Integer, default=0)  # fee in paise (only relevant for offered)
    years_experience = db.Column(db.Float, default=1.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Unique constraint prevents duplicate assignments of same skill_type to user
    __table_args__ = (
        db.UniqueConstraint("user_id", "skill_id", "skill_type", name="uq_user_skill_type"),
    )

    user = db.relationship("User", back_populates="user_skills")
    skill = db.relationship("Skill", back_populates="user_skills")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "skill_id": self.skill_id,
            "skill_name": self.skill.name if self.skill else None,
            "category_name": self.skill.category.name if self.skill and self.skill.category else "General",
            "skill_type": self.skill_type,
            "proficiency": self.proficiency,
            "fee_paise": self.fee_paise,
            "fee_inr": round(self.fee_paise / 100, 2) if self.fee_paise else 0,
            "years_experience": self.years_experience,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
