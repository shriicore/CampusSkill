from flask import Blueprint, request, jsonify
from app.utils.auth_helpers import token_required
from app.services.matching_service import MatchingService

matches_bp = Blueprint("matches", __name__)

@matches_bp.route("", methods=["GET"])
@token_required
def get_matches():
    user = request.current_user
    limit = min(request.args.get("limit", 20, type=int), 50)
    matches = MatchingService.find_matches_for_user(user.id, limit=limit)
    return jsonify({
        "matches": matches,
        "total_matches": len(matches)
    }), 200
