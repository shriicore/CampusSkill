from datetime import datetime, timedelta
from app.extensions import db
from app.models.skill import SkillCategory, Skill, UserSkill
from app.models.request import LearningRequest
from app.models.session import Session

def test_request_lifecycle_and_session_scheduling(client, test_users):
    s1_id = test_users["student1"]["id"]
    s2_id = test_users["student2"]["id"]
    s1_token = test_users["student1"]["token"]
    s2_token = test_users["student2"]["token"]

    # Setup a skill
    cat = SkillCategory(name="Coding")
    db.session.add(cat)
    db.session.flush()
    skill = Skill(name="Flask Web Dev", category_id=cat.id)
    db.session.add(skill)
    db.session.flush()
    db.session.add(UserSkill(user_id=s2_id, skill_id=skill.id, skill_type="offered", fee_paise=30000))
    db.session.commit()

    # Student 1 sends request to Student 2
    res = client.post(
        "/api/requests",
        headers={"Authorization": f"Bearer {s1_token}"},
        json={
            "mentor_id": s2_id,
            "skill_id": skill.id,
            "message": "Can we exchange knowledge on Flask?",
            "preferred_mode": "online"
        }
    )
    assert res.status_code == 201
    req_id = res.get_json()["request"]["id"]

    # Duplicate pending request prevented
    dup_res = client.post(
        "/api/requests",
        headers={"Authorization": f"Bearer {s1_token}"},
        json={"mentor_id": s2_id, "skill_id": skill.id}
    )
    assert dup_res.status_code == 409

    # Student 2 accepts the request
    accept_res = client.put(
        f"/api/requests/{req_id}/status",
        headers={"Authorization": f"Bearer {s2_token}"},
        json={"status": "accepted"}
    )
    assert accept_res.status_code == 200
    assert accept_res.get_json()["request"]["status"] == "accepted"

    # Schedule session
    start_time = (datetime.utcnow() + timedelta(days=1)).isoformat()
    end_time = (datetime.utcnow() + timedelta(days=1, hours=1)).isoformat()

    sess_res = client.post(
        "/api/sessions",
        headers={"Authorization": f"Bearer {s1_token}"},
        json={
            "request_id": req_id,
            "title": "Intro to Flask & Jinja",
            "scheduled_start": start_time,
            "scheduled_end": end_time,
            "mode": "online",
            "meeting_info": "https://meet.google.com/test-room"
        }
    )
    assert sess_res.status_code == 201
    sess_data = sess_res.get_json()["session"]
    sess_id = sess_data["id"]
    assert sess_data["fee_paise"] == 30000
    assert sess_data["status"] == "scheduled"

    # Mark session as completed
    comp_res = client.put(
        f"/api/sessions/{sess_id}/status",
        headers={"Authorization": f"Bearer {s2_token}"},
        json={"status": "completed"}
    )
    assert comp_res.status_code == 200

    # Student 1 submits rating
    rev_res = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {s1_token}"},
        json={
            "session_id": sess_id,
            "rating": 5,
            "comment": "Great session, learned a lot!"
        }
    )
    assert rev_res.status_code == 201

    # Duplicate review prevented
    dup_rev = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {s1_token}"},
        json={"session_id": sess_id, "rating": 4}
    )
    assert dup_rev.status_code == 409
