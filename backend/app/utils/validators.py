import re
from datetime import datetime

EMAIL_REGEX = re.compile(r"^[\w\.-]+@([\w\.-]+\.)+[a-zA-Z]{2,}$")

def validate_email(email: str) -> bool:
    if not email or not isinstance(email, str):
        return False
    return bool(EMAIL_REGEX.match(email.strip()))

def validate_password(password: str) -> tuple[bool, str]:
    if not password or len(password) < 6:
        return False, "Password must be at least 6 characters long."
    return True, ""

def validate_rating(rating) -> tuple[bool, str]:
    try:
        r = int(rating)
        if 1 <= r <= 5:
            return True, ""
        return False, "Rating must be between 1 and 5."
    except (ValueError, TypeError):
        return False, "Rating must be a valid integer."

def validate_paise_amount(amount) -> tuple[bool, str]:
    try:
        amt = int(amount)
        if amt < 0:
            return False, "Amount cannot be negative."
        if amt > 10000000:  # Max 1 lakh rupees (100,000 * 100 paise)
            return False, "Amount exceeds permitted maximum limit."
        return True, ""
    except (ValueError, TypeError):
        return False, "Amount must be a valid integer in paise."

def parse_iso_datetime(dt_str: str) -> datetime | None:
    if not dt_str:
        return None
    try:
        # Support both '2026-10-20T14:30:00' and '2026-10-20 14:30:00'
        cleaned = dt_str.replace("Z", "").replace("+00:00", "")
        if "T" in cleaned:
            return datetime.fromisoformat(cleaned)
        return datetime.strptime(cleaned, "%Y-%m-%d %H:%M:%S")
    except Exception:
        return None
