import os
from pathlib import Path
from dotenv import load_dotenv

# Locate base directory and load .env
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key-student-exchange")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback-jwt-secret-student-exchange")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

    # Database configuration: MySQL as primary, SQLite as local fallback
    raw_db_url = os.getenv("DATABASE_URL", "sqlite:///skill_exchange.db")
    if raw_db_url.startswith("sqlite:///") and not raw_db_url.startswith("sqlite:////"):
        # Ensure SQLite path resolves to an absolute path inside backend
        db_filename = raw_db_url.replace("sqlite:///", "")
        db_path = BASE_DIR / db_filename
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_path}"
    else:
        SQLALCHEMY_DATABASE_URI = raw_db_url

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False

    # CORS origins
    CORS_ORIGINS = [
        origin.strip() 
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") 
        if origin.strip()
    ]

    # Razorpay configurations
    RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_placeholder_key_id")
    RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "rzp_test_placeholder_secret")
    RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "rzp_webhook_secret_key")
    RAZORPAY_CURRENCY = os.getenv("RAZORPAY_CURRENCY", "INR")

    # Platform default admin
    ADMIN_NAME = os.getenv("ADMIN_NAME", "System Administrator")
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@campusskills.edu")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "AdminSecurePass123!")

class TestConfig(Config):
    TESTING = True
    db_test_path = BASE_DIR / "test_skill_exchange.db"
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_test_path}"
    WTF_CSRF_ENABLED = False
    JWT_EXPIRATION_HOURS = 2
