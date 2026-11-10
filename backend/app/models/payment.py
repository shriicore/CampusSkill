from datetime import datetime
from app.extensions import db

class PaymentTransaction(db.Model):
    __tablename__ = "payment_transactions"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    payer_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    payee_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount_paise = db.Column(db.Integer, nullable=False)  # Integer paise (e.g., 50000 = 500.00 INR)
    currency = db.Column(db.String(10), nullable=False, default="INR")
    gateway = db.Column(db.String(50), nullable=False, default="razorpay")
    gateway_order_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    gateway_payment_id = db.Column(db.String(100), unique=True, nullable=True, index=True)
    gateway_signature = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(40), nullable=False, default="pending")
    # Allowed statuses: 'pending', 'processing', 'paid', 'failed', 'cancelled', 'refund_pending', 'partially_refunded', 'refunded'
    error_code = db.Column(db.String(100), nullable=True)
    error_description = db.Column(db.Text, nullable=True)
    paid_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    session = db.relationship("Session", back_populates="transactions")
    payer = db.relationship("User", foreign_keys=[payer_id], back_populates="transactions_paid")
    payee = db.relationship("User", foreign_keys=[payee_id], back_populates="transactions_received")
    refund_requests = db.relationship("RefundRequest", back_populates="transaction", cascade="all, delete-orphan")

    VALID_TRANSITIONS = {
        "pending": ["processing", "paid", "failed", "cancelled"],
        "processing": ["paid", "failed", "cancelled"],
        "paid": ["refund_pending", "refunded", "partially_refunded"],
        "refund_pending": ["refunded", "partially_refunded", "paid"],
        "partially_refunded": ["refunded"],
        "failed": [],
        "cancelled": [],
        "refunded": []
    }

    def can_transition_to(self, new_status: str) -> bool:
        return new_status in self.VALID_TRANSITIONS.get(self.status, [])

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "session_title": self.session.title if self.session else None,
            "payer_id": self.payer_id,
            "payer_name": self.payer.name if self.payer else None,
            "payer_email": self.payer.email if self.payer else None,
            "payee_id": self.payee_id,
            "payee_name": self.payee.name if self.payee else None,
            "payee_email": self.payee.email if self.payee else None,
            "amount_paise": self.amount_paise,
            "amount_inr": round(self.amount_paise / 100, 2),
            "currency": self.currency,
            "gateway": self.gateway,
            "gateway_order_id": self.gateway_order_id,
            "gateway_payment_id": self.gateway_payment_id,
            "status": self.status,
            "error_code": self.error_code,
            "error_description": self.error_description,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "has_refund_request": len(self.refund_requests) > 0
        }

class RefundRequest(db.Model):
    __tablename__ = "refund_requests"

    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey("payment_transactions.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount_paise = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(30), nullable=False, default="pending")  # 'pending', 'approved', 'rejected', 'processed'
    admin_notes = db.Column(db.Text, nullable=True)
    gateway_refund_id = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    transaction = db.relationship("PaymentTransaction", back_populates="refund_requests")
    user = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "transaction_id": self.transaction_id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else None,
            "amount_paise": self.amount_paise,
            "amount_inr": round(self.amount_paise / 100, 2),
            "reason": self.reason,
            "status": self.status,
            "admin_notes": self.admin_notes,
            "gateway_refund_id": self.gateway_refund_id,
            "gateway_payment_id": self.transaction.gateway_payment_id if self.transaction else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None
        }
