from flask import Flask, jsonify
from app.config import Config
from app.extensions import db, migrate, cors
from app.routes import (
    auth_bp,
    users_bp,
    skills_bp,
    matches_bp,
    requests_bp,
    sessions_bp,
    reviews_bp,
    notifications_bp,
    payments_bp,
    webhooks_bp,
    admin_bp,
    reports_bp
)

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}},
        supports_credentials=True
    )

    # Register API Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(skills_bp, url_prefix="/api/skills")
    app.register_blueprint(matches_bp, url_prefix="/api/matches")
    app.register_blueprint(requests_bp, url_prefix="/api/requests")
    app.register_blueprint(sessions_bp, url_prefix="/api/sessions")
    app.register_blueprint(reviews_bp, url_prefix="/api/reviews")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(payments_bp, url_prefix="/api/payments")
    app.register_blueprint(webhooks_bp, url_prefix="/api/webhooks")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "Student Skill Exchange Platform API",
            "database": "connected"
        }), 200

    # Centralized JSON error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({"error": "Requested resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({"error": "Internal server error occurred"}), 500

    return app
