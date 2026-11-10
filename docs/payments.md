# Razorpay Payment Integration Architecture
## Student Skill Exchange Platform

### 1. Overview
The platform integrates Razorpay for processing Indian Rupee (INR) payments for peer learning sessions. All monetary amounts are modeled and calculated internally in integer **paise** (1 INR = 100 paise) to prevent floating-point inaccuracies.

---

### 2. Workflow & Data Flow

```
[Student Learner]
      |
      | 1. Selects eligible paid session -> Click "Pay ₹400"
      v
[Frontend Checkout Modal]
      |
      | 2. POST /api/payments/create-order {session_id: 1}
      v
[Flask Backend API]
      |
      | 3. Authenticates learner & reads trusted session fee from DB
      | 4. Invokes Razorpay Order API (or test mock if in placeholder mode)
      | 5. Persists PaymentTransaction in 'pending' status with gateway_order_id
      v
[Frontend Checkout Modal]
      |
      | 6. Receives order_id, amount_paise, public razorpay_key_id
      | 7. Opens Razorpay standard checkout popup (or test simulation modal)
      | 8. Student enters payment instrument (UPI / Debit Card / Netbanking)
      v
[Gateway Callback]
      |
      | 9. Frontend receives razorpay_payment_id and razorpay_signature
      | 10. POST /api/payments/verify {order_id, payment_id, signature}
      v
[Flask Backend Signature Verification]
      |
      | 11. Computes HMAC-SHA256(order_id + '|' + payment_id, secret_key)
      | 12. Compares computed digest securely with received signature
      | 13. Transitions PaymentTransaction to 'paid' status
      | 14. Triggers in-app alerts to both learner and mentor
      v
[Frontend Receipt Display]
      |
      | 15. Displays verified payment confirmation & transaction reference
```

---

### 3. Payment Status State Machine

The transaction state machine strictly regulates allowed status transitions:

```
                  +-----------+
                  |  pending  |
                  +-----------+
                   /    |    \
                  /     |     \
                 v      v      v
      +------------+ +------+ +-----------+
      | processing | | paid | | cancelled |
      +------------+ +------+ +-----------+
             |         /    \       
             |        /      \      
             v       v        v     
         +--------+  +----------------+ 
         | failed |  | refund_pending | 
         +--------+  +----------------+ 
                            |           
                            v           
                       +----------+     
                       | refunded |     
                       +----------+     
```

- Invalid or backward state transitions (e.g., transitioning from `failed` to `paid` or `refunded` to `pending`) are strictly prevented at the service layer.
- Idempotency is enforced: Repeated calls with an already verified payment return the existing record without creating duplicate transactions or duplicate student credits.

---

### 4. Asynchronous Webhooks (`/api/webhooks/razorpay`)

For handling asynchronous payment confirmations (e.g. UPI delayed approvals, background app switches):
- Endpoint: `POST /api/webhooks/razorpay`
- **Security**: The raw, unmodified request body bytes are verified against `X-Razorpay-Signature` using `HMAC-SHA256` and `RAZORPAY_WEBHOOK_SECRET`.
- Handled events:
  - `payment.captured`: Authoritatively transitions pending transaction to `paid`.
  - `payment.failed`: Records error code and error message.
  - `refund.processed`: Marks transaction as `refunded`.

---

### 5. Refund Management & Gateway Operations
- Students who paid for a session can submit a refund request with justification (e.g. mentor non-attendance).
- Admins inspect the request in the Administrator Console.
- When approved, `PaymentService.execute_refund()` calls the Razorpay Refund API (`client.payment.refund()`) using the authoritative `gateway_payment_id`.
- The transaction transitions to `refunded` only after confirmation.

---

### 6. Security Measures
1. **Zero Secret Exposure**: Only the public `RAZORPAY_KEY_ID` is ever returned to the client. The `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` reside solely in backend environment variables.
2. **Server-Side Pricing**: The payable amount is computed from trusted database records, never from frontend inputs.
3. **Payer Authorization**: Orders and verification calls enforce ownership so that malicious users cannot pay on behalf of or verify transactions for others.
