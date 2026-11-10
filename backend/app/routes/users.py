from flask import Blueprint, request, jsonify
from app.models.user import User
from app.models.skill import UserSkill, Skill
from app.utils.auth_helpers import token_required

users_bp = Blueprint("users", __name__)

@users_bp.route("", methods=["GET"])
@token_required
def get_students():
    search = request.args.get("search", "").strip()
    department = request.args.get("department", "").strip()
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 50)

    # Discover Skills must display only students who have created teaching listings (offered skills)
    query = User.query.join(UserSkill, User.id == UserSkill.user_id).outerjoin(Skill, UserSkill.skill_id == Skill.id).filter(
        User.is_active == True,
        User.role == "student",
        UserSkill.skill_type == "offered"
    )

    if search:
        query = query.filter(
            (User.name.ilike(f"%{search}%")) |
            (Skill.name.ilike(f"%{search}%"))
        )

    if department:
        query = query.filter(User.department.ilike(f"%{department}%"))

    query = query.distinct()
    total = query.count()
    users = query.order_by(User.name.asc()).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        "students": [u.to_dict() for u in users],
        "total": total,
        "page": page,
        "per_page": per_page
    }), 200

@users_bp.route("/<int:user_id>", methods=["GET"])
@token_required
def get_student_detail(user_id: int):
    student = User.query.get_or_404(user_id)
    if not student.is_active:
        return jsonify({"error": "Student account is not active."}), 404

    return jsonify({"student": student.to_detailed_dict()}), 200
