# System Architecture & Technical Design
## Student Skill Exchange Platform with Razorpay Payment Integration

### 1. High-Level Architectural Diagram

```
+------------------------------------------------------------------------------+
|                            React (Vite) Frontend                             |
|  - AuthContext & ToastProvider                                               |
|  - Lucide Icons & Responsive Campus SaaS Design                              |
|  - Razorpay Standard Checkout & Test Simulator                               |
|  - Modular Component Pages: Dashboard, Discover, Skills, Sessions, Payments  |
+------------------------------------------------------------------------------+
                                      |
                           HTTP / REST APIs (JSON)
                           (Bearer JWT Token Auth)
                                      v
+------------------------------------------------------------------------------+
|                             Flask Backend Server                             |
|  +--------------------+  +--------------------+  +------------------------+  |
|  | Blueprint Routing  |  | Business Services  |  | Security & Auth        |  |
|  | - /api/auth        |  | - MatchingService  |  | - JWT Bearer Decorator |  |
|  | - /api/users       |  | - PaymentService   |  | - Admin Role Guard     |  |
|  | - /api/skills      |  | - NotifService     |  | - Password Salt/Hash   |  |
|  | - /api/matches     |  +--------------------+  +------------------------+  |
|  | - /api/requests    |  +------------------------------------------------+  |
|  | - /api/sessions    |  | Razorpay Gateway Client & Signature Verifier   |  |
|  | - /api/payments    |  | - Order Creation (Integer Paise)              |  |
|  | - /api/webhooks    |  | - HMAC-SHA256 Signature Verification           |  |
|  | - /api/admin       |  | - Idempotent Webhook Handler                   |  |
|  +--------------------+  +------------------------------------------------+  |
+------------------------------------------------------------------------------+
                                      |
                            SQLAlchemy 2.0 ORM
                                      |
                     +----------------+----------------+
                     |                                 |
                     v                                 v
          +---------------------+            +---------------------+
          |  MySQL 8.0+ Primary |            |  SQLite 3 Fallback  |
          |  (Production / Lab) |            |  (Local Dev & Tests)|
          +---------------------+            +---------------------+
```

---

### 2. Module Responsibilities

#### 2.1 Backend Modules (`backend/app/`)
1. **`config.py`**:
   - Manages unified environment configuration via `.env`.
   - Dynamic database connection string resolution (MySQL primary with fallback to SQLite).
   - Razorpay key ID, secret, webhook secret, and currency tokens.
2. **`extensions.py`**:
   - Centralizes instances of `SQLAlchemy`, `Migrate`, and `CORS`.
3. **`models/`**:
   - Normalized relational tables with foreign keys, cascading constraints, unique compound indexes, and business helper properties.
   - All financial figures stored as integer **paise** (1 INR = 100 paise) to prevent float rounding errors.
4. **`services/`**:
   - `matching_service.py`: Computes deterministic, rule-based compatibility scores strictly from explicit overlapping skills, prioritizing reciprocal exchanges and providing human-readable explanations. No pseudo-AI or randomized scores.
   - `payment_service.py`: Manages Razorpay orders, HMAC-SHA256 signature verification, webhook events, and authorized administrative refunds.
   - `notification_service.py`: Centralized in-app alert generation for state transitions.
5. **`routes/`**:
   - RESTful blueprint endpoints with JSON responses, input validation, and HTTP status codes.
6. **`utils/`**:
   - `auth_helpers.py`: JWT token generation, `token_required` and `admin_required` decorators.
   - `validators.py`: Data type, rating (1-5), and format validation helpers.

#### 2.2 Frontend Modules (`frontend/src/`)
1. **`context/`**:
   - `AuthContext`: Centralized user session, login, registration, logout, and token refresh.
   - `ToastContext`: Floating non-blocking feedback notifications (success, error, info).
2. **`components/`**:
   - `common/`: Navbar with notification counter, desktop Sidebar, ProtectedRoute, Modal, and Badge.
   - `payment/`: `RazorpayCheckoutModal` supporting both live Razorpay script injection and interactive test-mode simulated checkouts; `RefundModal` for submitting refund requests.
   - `reviews/`: `ReviewModal` enforcing 1-5 star bounds and comment submission.
3. **`pages/`**:
   - Full feature suite: `Dashboard`, `DiscoverSkills`, `MySkills`, `Requests`, `Sessions`, `Transactions`, `StudentProfile`, `AdminDashboard`, `Login`, `Register`.
4. **`services/api.js`**:
   - Unified API service injecting Bearer authorization tokens into requests and managing centralized error handling.
