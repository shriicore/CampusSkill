from flask import Blueprint, request, jsonify, current_app
from app.extensions import db
from app.models.session import Session
from app.models.payment import PaymentTransaction, RefundRequest
from app.utils.auth_helpers import token_required
from app.services.payment_service import PaymentService
from app.services.notification_service import NotificationService

payments_bp = Blueprint("payments", __name__)

@payments_bp.route("/config", methods=["GET"])
def get_payment_config():
    """Returns only public gateway details (never secret keys)"""
    return jsonify({
        "razorpay_key_id": current_app.config.get("RAZORPAY_KEY_ID"),
        "currency": current_app.config.get("RAZORPAY_CURRENCY", "INR"),
        "is_test_mode": PaymentService.is_placeholder_mode()
    }), 200

@payments_bp.route("/create-order", methods=["POST"])
@token_required
def create_order():
    user = request.current_user
    data = request.get_json() or {}
    session_id = data.get("session_id")

    if not session_id:
        return jsonify({"error": "Session ID is required."}), 400

    session_obj = Session.query.get(session_id)
    if not session_obj:
        return jsonify({"error": "Session not found."}), 404

    success, result, status_code = PaymentService.create_order_for_session(session_obj, user.id)
    return jsonify(result), status_code

@payments_bp.route("/verify", methods=["POST"])
@token_required
def verify_payment():
    user = request.current_user
    data = request.get_json() or {}

    order_id = data.get("razorpay_order_id")
    payment_id = data.get("razorpay_payment_id")
    signature = data.get("razorpay_signature")

    if not order_id or not payment_id or not signature:
        return jsonify({"error": "Order ID, payment ID, and signature are required for verification."}), 400

    success, result, status_code = PaymentService.process_payment_verification(
        order_id=order_id,
        payment_id=payment_id,
        signature=signature,
        payer_id=user.id
    )
    return jsonify(result), status_code

@payments_bp.route("/transactions", methods=["GET"])
@token_required
def get_user_transactions():
    user = request.current_user
    # Fetch transactions where user is payer or payee
    transactions = PaymentTransaction.query.filter(
        (PaymentTransaction.payer_id == user.id) | (PaymentTransaction.payee_id == user.id)
    ).order_by(PaymentTransaction.created_at.desc()).all()

    return jsonify({"transactions": [t.to_dict() for t in transactions]}), 200

@payments_bp.route("/transactions/<int:tx_id>", methods=["GET"])
@token_required
def get_transaction_detail(tx_id: int):
    user = request.current_user
    tx = PaymentTransaction.query.get_or_404(tx_id)

    if tx.payer_id != user.id and tx.payee_id != user.id and user.role != "admin":
        return jsonify({"error": "Unauthorized access to transaction details."}), 403

    return jsonify({"transaction": tx.to_dict()}), 200

@payments_bp.route("/refund-request", methods=["POST"])
@token_required
def request_refund():
    user = request.current_user
    data = request.get_json() or {}

    transaction_id = data.get("transaction_id")
    reason = (data.get("reason") or "").strip()

    if not transaction_id or not reason:
        return jsonify({"error": "Transaction ID and a clear reason are required."}), 400

    tx = PaymentTransaction.query.get_or_404(transaction_id)
    if tx.payer_id != user.id:
        return jsonify({"error": "Unauthorized: Only the payer can request a refund."}), 403

    if tx.status != "paid":
        return jsonify({"error": f"Cannot request refund for transaction with status '{tx.status}'."}), 400

    existing_refund = RefundRequest.query.filter_by(transaction_id=tx.id).first()
    if existing_refund:
        return jsonify({"error": f"A refund request for this transaction is already '{existing_refund.status}'."}), 409

    refund_req = RefundRequest(
        transaction_id=tx.id,
        user_id=user.id,
        amount_paise=tx.amount_paise,
        reason=reason,
        status="pending"
    )
    tx.status = "refund_pending"
    db.session.add(refund_req)
    db.session.commit()

    # Notify admins/mentors
    NotificationService.create_notification(
        user_id=tx.payee_id,
        title="Refund Requested",
        message=f"{user.name} submitted a refund request for session '{tx.session.title}'.",
        notif_type="payment",
        link="/transactions"
    )

    return jsonify({
        "message": "Refund request submitted successfully. It will be reviewed by an administrator.",
        "refund_request": refund_req.to_dict()
    }), 201
