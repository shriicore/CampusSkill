# Functional & Non-Functional Requirements Specification
## Student Skill Exchange Platform with Payment Integration

### 1. System Overview
The Student Skill Exchange Platform is a campus-tailored web application where students exchange knowledge by offering skills they possess and learning skills they desire. It provides deterministic, rule-based compatibility matching, request workflows, session scheduling (online/offline), peer ratings/reviews, role-based access control, and a full Razorpay-powered payment system for paid skill exchange sessions in Indian Rupees (INR).

---

### 2. Functional Requirements

#### 2.1 Authentication & Authorization
- **FR-AUTH-1**: Students can register with their name, email, password, department, and semester.
- **FR-AUTH-2**: Secure password hashing using Werkzeug / bcrypt.
- **FR-AUTH-3**: Token/session-based authentication with expiration and protected routes.
- **FR-AUTH-4**: Role-Based Access Control (RBAC) distinguishing `student` and `admin` roles.
- **FR-AUTH-5**: Admins have exclusive access to administrative routes and APIs.

#### 2.2 Student Profiles & Account Management
- **FR-PROF-1**: View and edit personal profile (biography, department, semester, contact handles, default session fee).
- **FR-PROF-2**: View peer student profiles including their offered skills, wanted skills, average rating, reviews, and completed sessions.

#### 2.3 Skills Management
- **FR-SKILL-1**: Skill categories management (e.g., Programming, Design, Media, Academics, Communication).
- **FR-SKILL-2**: Students can add, edit, and delete skills they **offer** with proficiency level (Beginner, Intermediate, Advanced, Expert) and custom hourly/session fee in INR.
- **FR-SKILL-3**: Students can add, edit, and delete skills they **want** with desired proficiency.
- **FR-SKILL-4**: Duplicate skills assignment prevention for the same user.

#### 2.4 Student Discovery & Deterministic Matching
- **FR-MATCH-1**: Keyword search across student names, skill titles, and descriptions.
- **FR-MATCH-2**: Multi-criteria filters: skill category, proficiency level, and department.
- **FR-MATCH-3**: Deterministic Rule-Based Compatibility Algorithm:
  - Direct matches: Students offering what current user wants.
  - Reciprocal matches: High-priority reciprocal exchange where User A teaches what User B wants AND User B teaches what User A wants.
  - Transparent match explanation listing exact matching skills.
  - No fake AI percentages or randomized scores.

#### 2.5 Learning Requests Workflow
- **FR-REQ-1**: Send learning request specifying the target skill, optional message, proposed mode, and date.
- **FR-REQ-2**: Allowed request transitions:
  - `pending` -> `accepted` (by recipient)
  - `pending` -> `rejected` (by recipient)
  - `pending` -> `cancelled` (by sender)
- **FR-REQ-3**: Prevent duplicate active pending requests between same users for the same skill.
- **FR-REQ-4**: Automatic notification triggered upon request status changes.

#### 2.6 Sessions Management
- **FR-SESS-1**: Schedule sessions for accepted learning requests.
- **FR-SESS-2**: Record date, start time, end time, mode (`online` or `offline`), meeting link / location, fee in INR, and session notes.
- **FR-SESS-3**: Valid transitions: `scheduled` -> `completed` or `cancelled`.
- **FR-SESS-4**: Conflict checks to prevent overlapping active sessions for the same mentor.

#### 2.7 Reviews & Ratings
- **FR-REV-1**: Only participants of a `completed` session can rate and review.
- **FR-REV-2**: Enforce rating strictly between 1 and 5 stars with comment text.
- **FR-REV-3**: Prevent duplicate reviews for the same session by the same reviewer.
- **FR-REV-4**: Dynamic recalculation of mentor's average rating and total reviews.

#### 2.8 Notifications
- **FR-NOTIF-1**: Real-time / in-app notification logs for requests, sessions, payments, and reviews.
- **FR-NOTIF-2**: Mark as read / mark all as read.
- **FR-NOTIF-3**: Recipient-only access isolation.

#### 2.9 Payment Integration (Razorpay)
- **FR-PAY-1**: Indian Rupee (INR) payments for paid sessions.
- **FR-PAY-2**: Monetary storage in integer **paise** (1 INR = 100 paise) to prevent floating point inaccuracy.
- **FR-PAY-3**: Backend-initiated order creation with Razorpay API.
- **FR-PAY-4**: Client-side checkout modal with Razorpay checkout script.
- **FR-PAY-5**: Cryptographic HMAC-SHA256 signature verification on the backend using official verification.
- **FR-PAY-6**: Asynchronous webhook handler (`/api/webhooks/razorpay`) verifying raw signature and idempotently processing events (`payment.captured`, `payment.failed`, `refund.processed`).
- **FR-PAY-7**: State machine: `pending` -> `processing` -> `paid` -> `refund_pending` -> `refunded` / `failed` / `cancelled`.
- **FR-PAY-8**: Student transaction history and receipt view.
- **FR-PAY-9**: Refund request submission by student and review/execution by admin.

#### 2.10 Administrator Dashboard
- **FR-ADM-1**: Platform-wide metrics: total students, active sessions, total transaction volume, completed exchanges.
- **FR-ADM-2**: User management (activate/suspend, view activity).
- **FR-ADM-3**: Category management (create, update, delete).
- **FR-ADM-4**: Payment transaction logs & refund review interface.
- **FR-ADM-5**: User report resolution.

---

### 3. Non-Functional Requirements
- **Security**: Password hashing with strong salt; JWT or session auth with bearer verification; environment-isolated API secrets; strict authorization checks preventing IDOR (Insecure Direct Object References).
- **Data Integrity**: Normalized relational schema with foreign keys, ON DELETE constraints, unique composite constraints, and transaction rollback.
- **Reliability & Idempotency**: Payment callbacks and webhooks must never double-credit or double-charge.
- **Performance**: Sub-100ms API response time on indexed queries; fast client-side rendering with Vite + React.
- **UI/UX Aesthetics**: Modern campus SaaS palette, crisp typography, responsive layout, clear status badges, error boundary, and zero broken links.
