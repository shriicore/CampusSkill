# Student Skill Exchange Platform with Razorpay Payment Integration

A full-stack, college-tailored web application designed for students to exchange academic and practical skills. The platform features deterministic rule-based peer compatibility matching, request workflows, online/offline session scheduling, verified peer reviews, role-based administrative moderation, and a complete Razorpay payment system in Indian Rupees (INR).

---

## 🌟 Key Features

1. **Student Profiles & Authentication**:
   - Secure registration, login, profile management with department, semester, and bio.
   - Role-Based Access Control (`student` vs. `admin`).
2. **Skills Management**:
   - Categorized skills catalog with proficiency levels (Beginner, Intermediate, Advanced, Expert).
   - Independent management of **Offered Skills** (with custom fee in INR) and **Wanted Skills**.
   - Unique constraints preventing duplicate skill assignments.
3. **Deterministic Compatibility Matching**:
   - High-priority matching for **Reciprocal Exchanges** (where Student A teaches what Student B wants, AND Student B teaches what Student A wants).
   - Transparent, human-readable match explanations showing actual overlapping skills.
   - Strictly rule-based—no randomized percentages or fake AI claims.
4. **Learning Requests & Session Scheduling**:
   - State machine: `pending` -> `accepted` / `rejected` / `cancelled`.
   - Schedule sessions for accepted requests with online link or campus location.
   - Built-in conflict prevention preventing overlapping active mentor sessions.
5. **Session Feedback & Reviews**:
   - 1 to 5 star ratings and reviews restricted to completed session participants.
   - Unique constraint preventing duplicate reviews for the same session.
6. **Payment System (Razorpay Integration)**:
   - Monetary values stored in integer **paise** to eliminate floating-point rounding errors.
   - Server-side order creation from trusted database records.
   - Client-side checkout modal supporting standard Razorpay Checkout and simulated test mode.
   - Cryptographic HMAC-SHA256 signature verification with secret keys on the backend.
   - Raw-body authenticated asynchronous webhook listener (`/api/webhooks/razorpay`).
   - Transaction ledger, verified receipt breakdown, and student refund requests.
7. **Administrator Dashboard**:
   - Platform metrics: Total students, active exchanges, settled INR volume.
   - Student account activation/deactivation toggle.
   - Master skill category CRUD.
   - Transaction oversight and refund request approval/execution via Razorpay Refund API.

---

## 📁 Repository Structure

```
se mini project/
├── backend/
│   ├── app/
│   │   ├── config.py           # Database & Razorpay configurations
│   │   ├── extensions.py       # SQLAlchemy, Migrate, CORS
│   │   ├── models/             # User, Skill, Session, Payment, Review, etc.
│   │   ├── routes/             # REST blueprints (auth, skills, sessions, payments...)
│   │   ├── services/           # Matching, Payment & Notification services
│   │   └── utils/              # Auth decorators, JWT token generator, validators
│   ├── tests/                  # Pytest test suite (100% passing)
│   ├── seed.py                 # Comprehensive development database seed script
│   ├── run.py                  # Flask entrypoint
│   └── requirements.txt        # Backend Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/         # Navbar, Sidebar, CheckoutModal, RefundModal, Badges
│   │   ├── context/            # AuthContext, ToastContext
│   │   ├── pages/              # Dashboard, Discover, MySkills, Sessions, Payments...
│   │   ├── services/api.js     # Unified REST API client
│   │   └── index.css           # Tailwind design tokens
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── docs/
│   ├── requirements.md         # Functional and non-functional requirements
│   ├── architecture.md         # System architecture diagram & module design
│   ├── database.md             # Relational schema definitions & constraints
│   ├── api.md                  # REST API reference and endpoints
│   ├── test-plan.md            # Test matrix and verification results
│   ├── payments.md             # Razorpay integration specifications
│   └── implementation-status.md# Feature completion checklist
├── .env.example                # Configuration template
├── pytest.ini                  # Pytest configuration
└── README.md
```

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Python 3.10+** (Python 3.10.11 or newer recommended)
- **Node.js 18+** (Node.js 20.18.0 LTS recommended)

---

### 2. Backend Setup
1. Open a terminal in the project root:
   ```bash
   # Create and activate virtual environment
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Configure environment variables:
   - Copy `.env.example` to `backend/.env`:
     ```bash
     cp .env.example backend/.env
     ```
   - For local development, the default fallback is SQLite (`sqlite:///skill_exchange.db`). To use MySQL, update `DATABASE_URL` in `backend/.env`:
     ```ini
     DATABASE_URL=mysql+pymysql://username:password@localhost:3306/skill_exchange_db
     ```
4. Seed the database with demo students, categories, skills, sessions, and payments:
   ```bash
   python backend/seed.py
   ```
5. Start the backend server:
   ```bash
   python backend/run.py
   ```
   *The backend will be available at `http://127.0.0.1:5000` (Health check at `http://127.0.0.1:5000/api/health`).*

---

### 3. Frontend Setup
1. In a separate terminal, navigate to `frontend`:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The web application will open at `http://localhost:5173`.*

---

### 4. Running Automated Tests
Run the comprehensive Pytest suite:
```bash
pytest -v
```
*All 10 test cases test authentication, deterministic matching, request state transitions, session scheduling conflict detection, Razorpay order creation in integer paise, HMAC-SHA256 signature verification, idempotent callbacks, refund execution, and webhooks.*

---

## 👤 Pre-configured Demo Accounts

Use the **1-Click Quick Demo Login Chips** on the login page, or log in with these credentials:

| Role | Name | Email | Password | Details |
|---|---|---|---|---|
| **Student (Mentor/Learner)** | Aarav Sharma | `aarav.sharma@campusskills.edu` | `StudentPass123!` | Offers Python & Web Dev; wants UI/UX |
| **Student (Reciprocal Match)**| Priya Patel | `priya.patel@campusskills.edu` | `StudentPass123!` | Offers UI/UX Figma; wants Python |
| **Student (Learner)** | Rohan Gupta | `rohan.gupta@campusskills.edu` | `StudentPass123!` | Offers Math & DSA; wants Public Speaking |
| **Student (Mentor)** | Ananya Verma | `ananya.verma@campusskills.edu` | `StudentPass123!` | Offers Video Editing & Public Speaking |
| **System Administrator** | Administrator | `admin@campusskills.edu` | `AdminSecurePass123!` | Full admin console access |

---

## 💳 Razorpay Payment Configuration

To connect live Razorpay Test Keys:
1. Obtain your API keys from [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys).
2. Set them in `backend/.env`:
   ```ini
   RAZORPAY_KEY_ID=rzp_test_your_key_id
   RAZORPAY_KEY_SECRET=your_key_secret
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
   ```
3. When using placeholder keys, the application automatically enables **Test Simulation Mode**, allowing seamless order creation, cryptographic verification, and receipt generation without requiring external network connectivity.
