from app.extensions import db
from app.models.skill import SkillCategory, Skill, UserSkill

def test_deterministic_matching_reciprocal(client, test_users):
    s1_id = test_users["student1"]["id"]
    s2_id = test_users["student2"]["id"]
    s1_token = test_users["student1"]["token"]

    # Setup skills
    cat = SkillCategory(name="Tech", description="Technology")
    db.session.add(cat)
    db.session.flush()

    skill_python = Skill(name="Python", category_id=cat.id)
    skill_figma = Skill(name="Figma", category_id=cat.id)
    db.session.add_all([skill_python, skill_figma])
    db.session.flush()

    # Student 1 offers Python, wants Figma
    db.session.add(UserSkill(user_id=s1_id, skill_id=skill_python.id, skill_type="offered", proficiency="Advanced", fee_paise=40000))
    db.session.add(UserSkill(user_id=s1_id, skill_id=skill_figma.id, skill_type="wanted", proficiency="Beginner"))

    # Student 2 offers Figma, wants Python (Reciprocal match!)
    db.session.add(UserSkill(user_id=s2_id, skill_id=skill_figma.id, skill_type="offered", proficiency="Expert", fee_paise=50000))
    db.session.add(UserSkill(user_id=s2_id, skill_id=skill_python.id, skill_type="wanted", proficiency="Beginner"))
    db.session.commit()

    # Query matches for Student 1
    res = client.get("/api/matches", headers={"Authorization": f"Bearer {s1_token}"})
    assert res.status_code == 200
    data = res.get_json()
    matches = data["matches"]
    assert len(matches) > 0
    top_match = matches[0]

    assert top_match["peer"]["id"] == s2_id
    assert top_match["is_reciprocal"] is True
    assert "Reciprocal Match" in top_match["explanation"]
    assert len(top_match["direct_overlaps"]) > 0
    assert len(top_match["reverse_overlaps"]) > 0
    assert top_match["compatibility_score"] >= 60
