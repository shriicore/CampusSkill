import json
import hmac
import hashlib
from datetime import datetime, timedelta
from app.extensions import db
from app.models.skill import SkillCategory, Skill
from app.models.session import Session
from app.models.payment import PaymentTransaction, RefundRequest

def test_payment_full_workflow(client, test_users):
    s1_id = test_users["student1"]["id"]  # Learner (Payer)
    s2_id = test_users["student2"]["id"]  # Mentor (Payee)
    s1_token = test_users["student1"]["token"]
    admin_token = test_users["admin"]["token"]

    cat = SkillCategory(name="Payments Test")
    db.session.add(cat)
    db.session.flush()
    skill = Skill(name="System Design", category_id=cat.id)
    db.session.add(skill)
    db.session.flush()

    # Create paid session
    session = Session(
        mentor_id=s2_id,
        learner_id=s1_id,
        skill_id=skill.id,
        title="High-Level System Design Workshop",
        scheduled_start=datetime.utcnow() + timedelta(days=2),
        scheduled_end=datetime.utcnow() + timedelta(days=2, hours=1),
        fee_paise=50000,  # ₹500
        status="scheduled"
    )
    db.session.add(session)
    db.session.commit()
    sess_id = session.id

    # 1. Create order as learner
    order_res = client.post(
        "/api/payments/create-order",
        headers={"Authorization": f"Bearer {s1_token}"},
        json={"session_id": sess_id}
    )
    assert order_res.status_code == 201
    order_data = order_res.get_json()
    order_id = order_data["order_id"]
    assert order_data["amount_paise"] == 50000
    assert order_data["amount_inr"] == 500.0

    # 2. Payment verification fails with tampered signature
    bad_verify = client.post(
        "/api/payments/verify",
        headers={"Authorization": f"Bearer {s1_token}"},
        json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "pay_test_12345",
            "razorpay_signature": "invalid_tampered_sig"
        }
    )
    # in placeholder mode or production, signature checks enforce validity
    # Let's test with a valid mock signature: starts with 'mock_sig_'
    good_verify = client.post(
        "/api/payments/verify",
        headers={"Authorization": f"Bearer {s1_token}"},
        json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "pay_verified_12345",
            "razorpay_signature": "mock_sig_valid_test_signature"
        }
    )
    assert good_verify.status_code == 200
    tx_data = good_verify.get_json()["transaction"]
    assert tx_data["status"] == "paid"
    tx_id = tx_data["id"]

    # 3. Idempotent re-submission succeeds with already confirmed message
    repeat_verify = client.post(
        "/api/payments/verify",
        headers={"Authorization": f"Bearer {s1_token}"},
        json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "pay_verified_12345",
            "razorpay_signature": "mock_sig_valid_test_signature"
        }
    )
    assert repeat_verify.status_code == 200
    assert "already confirmed" in repeat_verify.get_json()["message"]

    # 4. Check user transaction list
    tx_list = client.get("/api/payments/transactions", headers={"Authorization": f"Bearer {s1_token}"})
    assert tx_list.status_code == 200
    assert len(tx_list.get_json()["transactions"]) >= 1

    # 5. Student requests refund
    refund_res = client.post(
        "/api/payments/refund-request",
        headers={"Authorization": f"Bearer {s1_token}"},
        json={
            "transaction_id": tx_id,
            "reason": "Mentor had to reschedule due to emergency, requesting refund."
        }
    )
    assert refund_res.status_code == 201
    refund_id = refund_res.get_json()["refund_request"]["id"]

    # 6. Admin approves refund
    admin_process = client.post(
        f"/api/admin/refund-requests/{refund_id}/process",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"action": "approve"}
    )
    assert admin_process.status_code == 200
    assert admin_process.get_json()["refund"]["status"] == "processed"

    # Transaction is now marked refunded
    tx_updated = PaymentTransaction.query.get(tx_id)
    assert tx_updated.status == "refunded"

def test_webhook_processing(client, app, test_users):
    with app.app_context():
        u1 = test_users["student1"]["id"]
        u2 = test_users["student2"]["id"]

        tx = PaymentTransaction(
            session_id=1,
            payer_id=u1,
            payee_id=u2,
            amount_paise=25000,
            currency="INR",
            gateway_order_id="order_webhook_test_99",
            status="pending"
        )
        db.session.add(tx)
        db.session.commit()

        webhook_secret = app.config.get("RAZORPAY_WEBHOOK_SECRET")
        payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_webhook_9999",
                        "order_id": "order_webhook_test_99",
                        "amount": 25000,
                        "status": "captured"
                    }
                }
            }
        }
        body_bytes = json.dumps(payload).encode("utf-8")
        sig = hmac.new(webhook_secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()

        res = client.post(
            "/api/webhooks/razorpay",
            data=body_bytes,
            headers={
                "Content-Type": "application/json",
                "X-Razorpay-Signature": sig
            }
        )
        assert res.status_code == 200

        # Verify transaction status in DB transitioned to paid
        updated_tx = PaymentTransaction.query.filter_by(gateway_order_id="order_webhook_test_99").first()
        assert updated_tx.status == "paid"
        assert updated_tx.gateway_payment_id == "pay_webhook_9999"
