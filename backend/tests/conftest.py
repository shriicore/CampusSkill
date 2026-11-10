import pytest
from app import create_app
from app.config import TestConfig
from app.extensions import db
from app.models.user import User
from app.models.skill import SkillCategory, Skill, UserSkill
from app.utils.auth_helpers import generate_token

@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.drop_all()
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def test_users(app):
    with app.app_context():
        admin = User(name="Test Admin", email="admin@test.edu", role="admin")
        admin.set_password("AdminPass123!")

        student1 = User(name="Student One", email="student1@test.edu", role="student", department="Computer Science", hourly_rate_paise=40000)
        student1.set_password("Pass123!")

        student2 = User(name="Student Two", email="student2@test.edu", role="student", department="Design", hourly_rate_paise=50000)
        student2.set_password("Pass123!")

        db.session.add_all([admin, student1, student2])
        db.session.commit()

        s1_id = student1.id
        s2_id = student2.id
        adm_id = admin.id

        return {
            "admin": {"id": adm_id, "token": generate_token(adm_id, "admin")},
            "student1": {"id": s1_id, "token": generate_token(s1_id, "student")},
            "student2": {"id": s2_id, "token": generate_token(s2_id, "student")}
        }
