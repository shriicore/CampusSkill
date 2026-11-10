# API Reference & Endpoint Documentation

All endpoints return JSON responses and use standard HTTP response codes.
Endpoints requiring authentication mandate the `Authorization: Bearer <JWT>` header.

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
Creates a new student account.
- **Request Body**:
  ```json
  {
    "name": "Aarav Sharma",
    "email": "aarav.sharma@campusskills.edu",
    "password": "StudentPass123!",
    "department": "Computer Science & Engineering",
    "semester": 6,
    "bio": "Full-stack developer..."
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "message": "Registration successful.",
    "token": "eyJhbGciOiJIUz...",
    "user": { "id": 1, "name": "Aarav Sharma", "email": "...", "role": "student" }
  }
  ```

### `POST /api/auth/login`
Authenticates existing student or administrator.
- **Request Body**:
  ```json
  {
    "email": "aarav.sharma@campusskills.edu",
    "password": "StudentPass123!"
  }
  ```
- **Response**: `200 OK` with JWT token.

### `GET /api/auth/me`
Retrieves authenticated user profile with detailed skills and reviews.

### `PUT /api/auth/profile`
Updates user profile fields (bio, hourly rate in paise, department, semester).

---

## 2. Skills Endpoints (`/api/skills`)

### `GET /api/skills/categories`
Returns all registered skill categories.

### `GET /api/skills?search=&category_id=`
Returns list of all master skills filtered by keyword or category.

### `GET /api/skills/my-skills`
Retrieves current user's offered and wanted skills.

### `POST /api/skills/my-skills`
Adds a skill to the user's offered or wanted list.
- **Request Body**:
  ```json
  {
    "skill_id": 1,
    "skill_type": "offered",
    "proficiency": "Expert",
    "fee_paise": 40000,
    "years_experience": 2.5
  }
  ```

---

## 3. Matches Endpoints (`/api/matches`)

### `GET /api/matches?limit=20`
Returns deterministic rule-based matches between current user and peers.
- **Response Format**:
  ```json
  {
    "matches": [
      {
        "peer": { "id": 2, "name": "Priya Patel", "department": "IT" },
        "compatibility_score": 92,
        "is_reciprocal": true,
        "direct_overlaps": [ { "skill_name": "UI/UX Design (Figma)", "peer_proficiency": "Expert" } ],
        "reverse_overlaps": [ { "skill_name": "Python Programming", "user_proficiency": "Advanced" } ],
        "explanation": "Reciprocal Match: Priya Patel teaches 1 skill(s) you want, and wants 1 skill(s) you teach."
      }
    ]
  }
  ```

---

## 4. Learning Requests (`/api/requests`)

### `GET /api/requests?type=all|sent|received`
Retrieves sent and received learning requests.

### `POST /api/requests`
Sends a new learning request to a mentor.

### `PUT /api/requests/<id>/status`
Transitions request status (`accepted`, `rejected`, `cancelled`).

---

## 5. Sessions Endpoints (`/api/sessions`)

### `GET /api/sessions?status=`
Returns user's booked sessions.

### `POST /api/sessions`
Schedules a session for an accepted request.
- **Request Body**:
  ```json
  {
    "request_id": 1,
    "title": "Python OOP in Practice",
    "scheduled_start": "2026-10-25T14:00:00",
    "scheduled_end": "2026-10-25T15:00:00",
    "mode": "online",
    "meeting_info": "https://meet.google.com/xyz",
    "notes": "Bring laptops"
  }
  ```

### `PUT /api/sessions/<id>/status`
Transitions session status (`completed` or `cancelled`).

---

## 6. Payments Endpoints (`/api/payments`)

### `GET /api/payments/config`
Returns public gateway parameters:
```json
{
  "razorpay_key_id": "rzp_test_placeholder_key_id",
  "currency": "INR",
  "is_test_mode": true
}
```

### `POST /api/payments/create-order`
Creates a Razorpay order from trusted session records.
- **Request Body**: `{"session_id": 1}`
- **Response**:
  ```json
  {
    "transaction_id": 1,
    "order_id": "order_mock_1_a1b2c3d4e5f6",
    "amount_paise": 40000,
    "amount_inr": 400.0,
    "currency": "INR",
    "is_test_mode": true
  }
  ```

### `POST /api/payments/verify`
Authenticates Razorpay payment signature cryptographically.
- **Request Body**:
  ```json
  {
    "razorpay_order_id": "order_mock_1_a1b2c3d4e5f6",
    "razorpay_payment_id": "pay_mock_101",
    "razorpay_signature": "mock_sig_order_mock_1_pay_mock_101"
  }
  ```

### `GET /api/payments/transactions`
Returns authenticated student's payment transaction ledger.

### `POST /api/payments/refund-request`
Submits a refund request for an existing paid session.

---

## 7. Webhooks (`/api/webhooks/razorpay`)

### `POST /api/webhooks/razorpay`
Asynchronously receives gateway events (`payment.captured`, `payment.failed`, `refund.processed`).
- Unauthenticated (no session token required).
- Verified via `X-Razorpay-Signature` HMAC-SHA256 signature against raw request body bytes.
- Idempotent execution.

---

## 8. Administrator Endpoints (`/api/admin`)

- `GET /api/admin/stats`: Platform metrics and financial totals.
- `GET /api/admin/users`: User accounts with toggle status.
- `PUT /api/admin/users/<id>/toggle-status`: Activate/deactivate accounts.
- `POST /api/admin/categories`: Create skill category.
- `DELETE /api/admin/categories/<id>`: Delete skill category.
- `GET /api/admin/transactions`: All platform transactions.
- `GET /api/admin/refund-requests`: List pending and processed refund requests.
- `POST /api/admin/refund-requests/<id>/process`: Approve or reject refund with gateway execution.
