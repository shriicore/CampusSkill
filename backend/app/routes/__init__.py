from app.routes.auth import auth_bp
from app.routes.users import users_bp
from app.routes.skills import skills_bp
from app.routes.matches import matches_bp
from app.routes.requests import requests_bp
from app.routes.sessions import sessions_bp
from app.routes.reviews import reviews_bp
from app.routes.notifications import notifications_bp
from app.routes.payments import payments_bp
from app.routes.webhooks import webhooks_bp
from app.routes.admin import admin_bp
from app.routes.reports import reports_bp

__all__ = [
    "auth_bp",
    "users_bp",
    "skills_bp",
    "matches_bp",
    "requests_bp",
    "sessions_bp",
    "reviews_bp",
    "notifications_bp",
    "payments_bp",
    "webhooks_bp",
    "admin_bp",
    "reports_bp"
]
