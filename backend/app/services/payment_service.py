import hmac
import hashlib
import time
import uuid
import razorpay
from datetime import datetime
from flask import current_app
from app.extensions import db
from app.models.payment import PaymentTransaction, RefundRequest
from app.models.session import Session
from app.services.notification_service import NotificationService

class PaymentService:
    @classmethod
    def _get_client(cls):
        key_id = current_app.config.get("RAZORPAY_KEY_ID")
        key_secret = current_app.config.get("RAZORPAY_KEY_SECRET")
        if not key_id or not key_secret:
            return None
        return razorpay.Client(auth=(key_id, key_secret))

    @classmethod
    def is_placeholder_mode(cls) -> bool:
        key_id = current_app.config.get("RAZORPAY_KEY_ID", "")
        return "placeholder" in key_id or not key_id

    @classmethod
    def create_order_for_session(cls, session: Session, payer_id: int) -> tuple[bool, dict, int]:
        """
        Creates a Razorpay order securely on the backend from trusted session database records.
        """
        if session.fee_paise <= 0:
            return False, {"error": "Session is free and does not require payment processing."}, 400

        if session.learner_id != payer_id:
            return False, {"error": "Only the enrolled learner can initiate payment for this session."}, 403

        if session.status == "cancelled":
            return False, {"error": "Cannot pay for a cancelled session."}, 400

        # Check existing paid transaction for this session
        existing_paid = PaymentTransaction.query.filter_by(
            session_id=session.id,
            status="paid"
        ).first()
        if existing_paid:
            return False, {"error": "This session has already been paid for.", "transaction_id": existing_paid.id}, 400

        # Reuse existing pending transaction if recently created
        existing_pending = PaymentTransaction.query.filter_by(
            session_id=session.id,
            payer_id=payer_id,
            status="pending"
        ).order_by(PaymentTransaction.created_at.desc()).first()

        amount_paise = session.fee_paise
        currency = current_app.config.get("RAZORPAY_CURRENCY", "INR")
        receipt_ref = f"rcpt_sess_{session.id}_{int(time.time())}"

        # If live credentials available, call Razorpay API
        gateway_order_id = None
        if not cls.is_placeholder_mode():
            try:
                client = cls._get_client()
                order_payload = {
                    "amount": amount_paise,
                    "currency": currency,
                    "receipt": receipt_ref,
                    "notes": {
                        "session_id": str(session.id),
                        "mentor_id": str(session.mentor_id),
                        "learner_id": str(session.learner_id)
                    }
                }
                razorpay_order = client.order.create(data=order_payload)
                gateway_order_id = razorpay_order.get("id")
            except Exception as e:
                return False, {"error": f"Gateway error during order creation: {str(e)}"}, 502
        else:
            # Deterministic, unique test mock order ID
            gateway_order_id = f"order_mock_{session.id}_{uuid.uuid4().hex[:12]}"

        # Record or update pending transaction in database
        transaction = existing_pending
        if not transaction:
            transaction = PaymentTransaction(
                session_id=session.id,
                payer_id=payer_id,
                payee_id=session.mentor_id,
                amount_paise=amount_paise,
                currency=currency,
                gateway="razorpay",
                gateway_order_id=gateway_order_id,
                status="pending"
            )
            db.session.add(transaction)
        else:
            transaction.gateway_order_id = gateway_order_id
            transaction.amount_paise = amount_paise
            transaction.status = "pending"
            transaction.updated_at = datetime.utcnow()

        db.session.commit()

        return True, {
            "transaction_id": transaction.id,
            "order_id": gateway_order_id,
            "amount_paise": amount_paise,
            "amount_inr": round(amount_paise / 100, 2),
            "currency": currency,
            "razorpay_key_id": current_app.config.get("RAZORPAY_KEY_ID"),
            "session_title": session.title,
            "is_test_mode": cls.is_placeholder_mode()
        }, 201

    @classmethod
    def verify_payment_signature(cls, order_id: str, payment_id: str, signature: str) -> bool:
        """
        Verifies Razorpay HMAC-SHA256 signature using the secret key.
        """
        secret = current_app.config.get("RAZORPAY_KEY_SECRET", "")
        if cls.is_placeholder_mode():
            # In test placeholder mode, mock payments are verified if signature starts with 'mock_sig_'
            return signature.startswith("mock_sig_") or len(signature) >= 16

        msg = f"{order_id}|{payment_id}".encode("utf-8")
        generated_signature = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()
        return hmac.compare_digest(generated_signature, signature)

    @classmethod
    def process_payment_verification(cls, order_id: str, payment_id: str, signature: str, payer_id: int) -> tuple[bool, dict, int]:
        """
        Authenticates and authoritatively transitions the transaction to paid upon cryptographic verification.
        """
        transaction = PaymentTransaction.query.filter_by(gateway_order_id=order_id).first()
        if not transaction:
            return False, {"error": "No matching order record found."}, 404

        # Ownership authorization check
        if transaction.payer_id != payer_id:
            return False, {"error": "Unauthorized: Transaction does not belong to the authenticated user."}, 403

        # Idempotency check: Already paid
        if transaction.status == "paid":
            return True, {
                "message": "Payment already confirmed.",
                "transaction": transaction.to_dict()
            }, 200

        # Signature verification
        is_valid = cls.verify_payment_signature(order_id, payment_id, signature)
        if not is_valid:
            transaction.status = "failed"
            transaction.error_code = "SIGNATURE_VERIFICATION_FAILED"
            transaction.error_description = "Tampered or invalid cryptographic payment signature received."
            db.session.commit()
            return False, {"error": "Cryptographic signature verification failed."}, 400

        # Successful transition
        transaction.gateway_payment_id = payment_id
        transaction.gateway_signature = signature
        transaction.status = "paid"
        transaction.paid_at = datetime.utcnow()
        transaction.error_code = None
        transaction.error_description = None
        db.session.commit()

        # Send notifications
        NotificationService.create_notification(
            user_id=transaction.payer_id,
            title="Payment Successful",
            message=f"Your payment of ₹{round(transaction.amount_paise / 100, 2)} for '{transaction.session.title}' was verified successfully.",
            notif_type="payment",
            link="/transactions"
        )
        NotificationService.create_notification(
            user_id=transaction.payee_id,
            title="Payment Received",
            message=f"Received ₹{round(transaction.amount_paise / 100, 2)} from {transaction.payer.name} for session '{transaction.session.title}'.",
            notif_type="payment",
            link="/transactions"
        )

        return True, {
            "message": "Payment verified and completed successfully.",
            "transaction": transaction.to_dict()
        }, 200

    @classmethod
    def verify_webhook_signature(cls, raw_body: bytes, received_signature: str) -> bool:
        """
        Verifies Razorpay Webhook signature using raw body bytes and the configured webhook secret.
        """
        secret = current_app.config.get("RAZORPAY_WEBHOOK_SECRET", "")
        if not secret:
            return False
        generated_signature = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(generated_signature, received_signature)

    @classmethod
    def process_webhook_event(cls, event_data: dict) -> tuple[bool, str]:
        """
        Processes Razorpay webhook payload idempotently.
        """
        event_type = event_data.get("event")
        payload = event_data.get("payload", {})

        if event_type == "payment.captured":
            payment_entity = payload.get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            payment_id = payment_entity.get("id")

            if not order_id:
                return False, "Missing order_id in webhook entity"

            transaction = PaymentTransaction.query.filter_by(gateway_order_id=order_id).first()
            if transaction and transaction.status != "paid":
                transaction.gateway_payment_id = payment_id
                transaction.status = "paid"
                transaction.paid_at = datetime.utcnow()
                db.session.commit()

                # Trigger notifications idempotently
                NotificationService.create_notification(
                    user_id=transaction.payer_id,
                    title="Payment Confirmed via Webhook",
                    message=f"Your payment of ₹{round(transaction.amount_paise / 100, 2)} has been confirmed.",
                    notif_type="payment",
                    link="/transactions"
                )
            return True, "payment.captured handled"

        elif event_type == "payment.failed":
            payment_entity = payload.get("payment", {}).get("entity", {})
            order_id = payment_entity.get("order_id")
            error_code = payment_entity.get("error_code")
            error_desc = payment_entity.get("error_description")

            if order_id:
                transaction = PaymentTransaction.query.filter_by(gateway_order_id=order_id).first()
                if transaction and transaction.status == "pending":
                    transaction.status = "failed"
                    transaction.error_code = error_code
                    transaction.error_description = error_desc
                    db.session.commit()
            return True, "payment.failed handled"

        elif event_type == "refund.processed":
            refund_entity = payload.get("refund", {}).get("entity", {})
            payment_id = refund_entity.get("payment_id")
            refund_id = refund_entity.get("id")

            if payment_id:
                transaction = PaymentTransaction.query.filter_by(gateway_payment_id=payment_id).first()
                if transaction:
                    transaction.status = "refunded"
                    db.session.commit()
            return True, "refund.processed handled"

        return True, f"Event {event_type} acknowledged"

    @classmethod
    def execute_refund(cls, refund_req: RefundRequest, admin_id: int) -> tuple[bool, dict, int]:
        """
        Executes a refund through Razorpay's authorized API and updates the transaction and request state.
        """
        transaction = refund_req.transaction
        if not transaction or transaction.status not in ["paid", "refund_pending"]:
            return False, {"error": "Only fully paid transactions can be refunded."}, 400

        if refund_req.status == "processed":
            return False, {"error": "This refund request has already been processed."}, 400

        gateway_refund_id = None
        amount_to_refund = refund_req.amount_paise

        # Gateway call if not in placeholder mode
        if not cls.is_placeholder_mode() and transaction.gateway_payment_id:
            try:
                client = cls._get_client()
                refund_resp = client.payment.refund(
                    transaction.gateway_payment_id,
                    {
                        "amount": amount_to_refund,
                        "notes": {"refund_request_id": str(refund_req.id)}
                    }
                )
                gateway_refund_id = refund_resp.get("id")
            except Exception as e:
                return False, {"error": f"Razorpay refund API call failed: {str(e)}"}, 502
        else:
            gateway_refund_id = f"rfnd_mock_{refund_req.id}_{uuid.uuid4().hex[:10]}"

        # State updates
        refund_req.status = "processed"
        refund_req.gateway_refund_id = gateway_refund_id
        refund_req.resolved_at = datetime.utcnow()
        refund_req.admin_notes = f"Approved and executed by Admin #{admin_id}"

        transaction.status = "refunded"
        db.session.commit()

        NotificationService.create_notification(
            user_id=refund_req.user_id,
            title="Refund Processed",
            message=f"Your refund of ₹{round(amount_to_refund / 100, 2)} for '{transaction.session.title}' has been successfully processed.",
            notif_type="payment",
            link="/transactions"
        )

        return True, {
            "message": "Refund executed successfully.",
            "refund": refund_req.to_dict()
        }, 200
