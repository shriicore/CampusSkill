from app.models.user import User
from app.models.skill import UserSkill, Skill

class MatchingService:
    """
    Deterministic, rule-based matching engine.
    Calculates genuine peer compatibility strictly based on explicit skill overlaps.
    No random numbers, no pseudo-AI heuristics.
    """

    PROFICIENCY_SCORES = {
        "Beginner": 1,
        "Intermediate": 2,
        "Advanced": 3,
        "Expert": 4
    }

    @classmethod
    def find_matches_for_user(cls, current_user_id: int, limit: int = 20) -> list[dict]:
        current_user = User.query.get(current_user_id)
        if not current_user:
            return []

        # Current user's wanted skills and offered skills
        current_wanted = {
            us.skill_id: {
                "skill_name": us.skill.name,
                "proficiency": us.proficiency
            }
            for us in current_user.wanted_skills
        }
        current_offered = {
            us.skill_id: {
                "skill_name": us.skill.name,
                "proficiency": us.proficiency,
                "fee_paise": us.fee_paise
            }
            for us in current_user.offered_skills
        }

        # Query all other active students
        other_students = User.query.filter(
            User.id != current_user_id,
            User.is_active == True,
            User.role == "student"
        ).all()

        scored_matches = []

        for peer in other_students:
            peer_offered = {
                us.skill_id: {
                    "skill_name": us.skill.name,
                    "proficiency": us.proficiency,
                    "fee_paise": us.fee_paise
                }
                for us in peer.offered_skills
            }
            peer_wanted = {
                us.skill_id: {
                    "skill_name": us.skill.name,
                    "proficiency": us.proficiency
                }
                for us in peer.wanted_skills
            }

            # 1. Direct overlap: Peer offers what current user wants
            direct_overlaps = []
            for skill_id, want_info in current_wanted.items():
                if skill_id in peer_offered:
                    offered_info = peer_offered[skill_id]
                    direct_overlaps.append({
                        "skill_id": skill_id,
                        "skill_name": want_info["skill_name"],
                        "peer_proficiency": offered_info["proficiency"],
                        "user_target_proficiency": want_info["proficiency"],
                        "fee_paise": offered_info["fee_paise"]
                    })

            # 2. Reverse overlap: Current user offers what peer wants
            reverse_overlaps = []
            for skill_id, want_info in peer_wanted.items():
                if skill_id in current_offered:
                    offered_info = current_offered[skill_id]
                    reverse_overlaps.append({
                        "skill_id": skill_id,
                        "skill_name": want_info["skill_name"],
                        "user_proficiency": offered_info["proficiency"],
                        "peer_target_proficiency": want_info["proficiency"]
                    })

            # If no direct overlap, only include if there's reverse overlap with high relevance
            if not direct_overlaps and not reverse_overlaps:
                continue

            # Deterministic compatibility calculation:
            # Reciprocal exchanges get highest baseline score
            is_reciprocal = len(direct_overlaps) > 0 and len(reverse_overlaps) > 0
            
            # Base deterministic score calculation
            score = 0
            explanation_points = []

            if is_reciprocal:
                score += 50
                explanation_points.append(
                    f"Reciprocal Match: {peer.name} teaches {len(direct_overlaps)} skill(s) you want, and wants {len(reverse_overlaps)} skill(s) you teach."
                )
            elif direct_overlaps:
                score += 30
                explanation_points.append(
                    f"Direct Teacher: {peer.name} offers {len(direct_overlaps)} skill(s) you are seeking."
                )
            elif reverse_overlaps:
                score += 15
                explanation_points.append(
                    f"Potential Learner: {peer.name} wants {len(reverse_overlaps)} skill(s) you teach."
                )

            # Additional points for skill count and proficiency depth
            for d in direct_overlaps:
                prof_val = cls.PROFICIENCY_SCORES.get(d["peer_proficiency"], 2)
                score += prof_val * 4
                explanation_points.append(
                    f"Offers {d['skill_name']} at {d['peer_proficiency']} level."
                )

            for r in reverse_overlaps:
                prof_val = cls.PROFICIENCY_SCORES.get(r["user_proficiency"], 2)
                score += prof_val * 3

            # Small bonus if same department (easier campus collaboration)
            if current_user.department and peer.department and current_user.department.lower() == peer.department.lower():
                score += 5
                explanation_points.append(f"Same department ({peer.department})")

            # High peer rating bonus (up to 5 points)
            if peer.average_rating > 0:
                score += int(peer.average_rating)

            # Clamp deterministic score between 10 and 100
            score = min(score, 100)

            scored_matches.append({
                "peer": peer.to_dict(),
                "compatibility_score": score,
                "is_reciprocal": is_reciprocal,
                "direct_overlaps": direct_overlaps,
                "reverse_overlaps": reverse_overlaps,
                "explanation": " • ".join(explanation_points)
            })

        # Sort descending by compatibility_score
        scored_matches.sort(key=lambda m: (m["is_reciprocal"], m["compatibility_score"]), reverse=True)
        return scored_matches[:limit]
