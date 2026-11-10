from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.skill import SkillCategory, Skill, UserSkill
from app.utils.auth_helpers import token_required
from app.utils.validators import validate_paise_amount

skills_bp = Blueprint("skills", __name__)

@skills_bp.route("/categories", methods=["GET"])
def get_categories():
    categories = SkillCategory.query.order_by(SkillCategory.name.asc()).all()
    return jsonify({"categories": [c.to_dict() for c in categories]}), 200

@skills_bp.route("", methods=["GET"])
def get_skills():
    search = request.args.get("search", "").strip().lower()
    category_id = request.args.get("category_id", type=int)

    query = Skill.query
    if search:
        query = query.filter(Skill.name.ilike(f"%{search}%"))
    if category_id:
        query = query.filter_by(category_id=category_id)

    skills = query.order_by(Skill.name.asc()).all()
    return jsonify({"skills": [s.to_dict() for s in skills]}), 200

@skills_bp.route("/my-skills", methods=["GET"])
@token_required
def get_my_skills():
    user = request.current_user
    return jsonify({
        "offered": [us.to_dict() for us in user.offered_skills],
        "wanted": [us.to_dict() for us in user.wanted_skills]
    }), 200

@skills_bp.route("/my-skills", methods=["POST"])
@token_required
def add_my_skill():
    user = request.current_user
    data = request.get_json() or {}

    skill_id = data.get("skill_id")
    skill_name = (data.get("new_skill_name") or "").strip()
    category_id = data.get("category_id")
    skill_type = (data.get("skill_type") or "").strip().lower()
    proficiency = (data.get("proficiency") or "Intermediate").strip()
    fee_paise = data.get("fee_paise", 0)
    years_experience = data.get("years_experience", 1.0)

    if skill_type not in ["offered", "wanted"]:
        return jsonify({"error": "Skill type must be either 'offered' or 'wanted'."}), 400

    # If creating a new skill on the fly
    if not skill_id and skill_name:
        existing_skill = Skill.query.filter(Skill.name.ilike(skill_name)).first()
        if existing_skill:
            skill = existing_skill
        else:
            skill = Skill(name=skill_name, category_id=category_id or None)
            db.session.add(skill)
            db.session.flush()
    elif skill_id:
        skill = Skill.query.get(skill_id)
        if not skill:
            return jsonify({"error": "Selected skill does not exist."}), 404
    else:
        return jsonify({"error": "Please provide a valid skill or skill name."}), 400

    # Check for duplicate assignment
    existing_assignment = UserSkill.query.filter_by(
        user_id=user.id,
        skill_id=skill.id,
        skill_type=skill_type
    ).first()
    if existing_assignment:
        return jsonify({"error": f"You have already added '{skill.name}' to your {skill_type} skills."}), 409

    # Fee validation
    paise_val = 0
    if skill_type == "offered":
        is_valid_fee, fee_err = validate_paise_amount(fee_paise)
        if not is_valid_fee:
            return jsonify({"error": fee_err}), 400
        paise_val = int(fee_paise)

    user_skill = UserSkill(
        user_id=user.id,
        skill_id=skill.id,
        skill_type=skill_type,
        proficiency=proficiency,
        fee_paise=paise_val,
        years_experience=float(years_experience) if years_experience else 1.0
    )
    db.session.add(user_skill)
    db.session.commit()

    return jsonify({
        "message": f"Successfully added '{skill.name}' to your {skill_type} skills.",
        "user_skill": user_skill.to_dict()
    }), 201

@skills_bp.route("/my-skills/<int:user_skill_id>", methods=["PUT"])
@token_required
def update_my_skill(user_skill_id: int):
    user = request.current_user
    user_skill = UserSkill.query.get_or_404(user_skill_id)

    if user_skill.user_id != user.id:
        return jsonify({"error": "Unauthorized: Cannot edit another user's skill."}), 403

    data = request.get_json() or {}
    if "proficiency" in data:
        user_skill.proficiency = data["proficiency"]
    if "years_experience" in data:
        try:
            user_skill.years_experience = float(data["years_experience"])
        except Exception:
            pass
    if "fee_paise" in data and user_skill.skill_type == "offered":
        is_valid, err = validate_paise_amount(data["fee_paise"])
        if is_valid:
            user_skill.fee_paise = int(data["fee_paise"])
        else:
            return jsonify({"error": err}), 400

    db.session.commit()
    return jsonify({
        "message": "Skill details updated successfully.",
        "user_skill": user_skill.to_dict()
    }), 200

@skills_bp.route("/my-skills/<int:user_skill_id>", methods=["DELETE"])
@token_required
def delete_my_skill(user_skill_id: int):
    user = request.current_user
    user_skill = UserSkill.query.get_or_404(user_skill_id)

    if user_skill.user_id != user.id:
        return jsonify({"error": "Unauthorized: Cannot delete another user's skill."}), 403

    db.session.delete(user_skill)
    db.session.commit()
    return jsonify({"message": "Skill removed from your profile."}), 200
