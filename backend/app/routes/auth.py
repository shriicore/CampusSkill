from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.user import User
from app.utils.auth_helpers import generate_token, token_required
from app.utils.validators import validate_email, validate_password, validate_paise_amount

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    department = (data.get("department") or "").strip()
    semester = data.get("semester")
    bio = (data.get("bio") or "").strip()

    if not name:
        return jsonify({"error": "Full name is required."}), 400

    if not validate_email(email):
        return jsonify({"error": "Please provide a valid college or personal email address."}), 400

    is_valid_pw, pw_err = validate_password(password)
    if not is_valid_pw:
        return jsonify({"error": pw_err}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists."}), 409

    try:
        sem_val = int(semester) if semester is not None and str(semester).isdigit() else None
    except Exception:
        sem_val = None

    user = User(
        name=name,
        email=email,
        role="student",
        department=department or None,
        semester=sem_val,
        bio=bio or None,
        hourly_rate_paise=0
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    token = generate_token(user.id, user.role)
    return jsonify({
        "message": "Registration successful.",
        "token": token,
        "user": user.to_dict()
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password."}), 401

    if not user.is_active:
        return jsonify({"error": "Your account has been deactivated. Please contact support."}), 403

    token = generate_token(user.id, user.role)
    return jsonify({
        "message": "Login successful.",
        "token": token,
        "user": user.to_dict()
    }), 200

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_current_user():
    user = request.current_user
    return jsonify({"user": user.to_detailed_dict()}), 200

@auth_bp.route("/profile", methods=["PUT"])
@token_required
def update_profile():
    user = request.current_user
    data = request.get_json() or {}

    if "name" in data and data["name"].strip():
        user.name = data["name"].strip()
    if "department" in data:
        user.department = (data.get("department") or "").strip()
    if "semester" in data:
        try:
            user.semester = int(data["semester"]) if str(data["semester"]).isdigit() else None
        except Exception:
            pass
    if "bio" in data:
        user.bio = (data.get("bio") or "").strip()
    if "avatar_url" in data:
        user.avatar_url = (data.get("avatar_url") or "").strip()
    if "hourly_rate_paise" in data:
        is_valid, err = validate_paise_amount(data["hourly_rate_paise"])
        if is_valid:
            user.hourly_rate_paise = int(data["hourly_rate_paise"])
        else:
            return jsonify({"error": err}), 400

    db.session.commit()
    return jsonify({
        "message": "Profile updated successfully.",
        "user": user.to_detailed_dict()
    }), 200

@auth_bp.route("/change-password", methods=["POST"])
@token_required
def change_password():
    user = request.current_user
    data = request.get_json() or {}
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""

    if not user.check_password(current_password):
        return jsonify({"error": "Incorrect current password."}), 400

    is_valid, err = validate_password(new_password)
    if not is_valid:
        return jsonify({"error": err}), 400

    user.set_password(new_password)
    db.session.commit()
    return jsonify({"message": "Password changed successfully."}), 200
