import json
from flask import Blueprint, request, jsonify
from app.services.payment_service import PaymentService

webhooks_bp = Blueprint("webhooks", __name__)

@webhooks_bp.route("/razorpay", methods=["POST"])
def razorpay_webhook():
    # Retrieve the raw unmodified request body bytes
    raw_body = request.get_data()
    received_signature = request.headers.get("X-Razorpay-Signature", "")

    if not received_signature:
        return jsonify({"error": "Missing X-Razorpay-Signature header."}), 400

    # Cryptographic signature validation
    if not PaymentService.verify_webhook_signature(raw_body, received_signature):
        return jsonify({"error": "Invalid webhook cryptographic signature."}), 400

    try:
        event_data = json.loads(raw_body.decode("utf-8"))
    except Exception as e:
        return jsonify({"error": f"Invalid JSON payload: {str(e)}"}), 400

    success, message = PaymentService.process_webhook_event(event_data)
    return jsonify({"status": "received", "message": message}), 200
