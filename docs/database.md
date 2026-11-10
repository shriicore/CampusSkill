# Database Architecture & Schema Specification

The Student Skill Exchange Platform utilizes a normalized relational schema compatible with both **MySQL 8.0+** (production) and **SQLite 3** (local development & test suites).

---

## 1. Entity-Relationship Summary

- **users**: Accounts for students and administrators.
- **skill_categories**: Grouping tags for skills (e.g. Technology, Design, Academic, Languages).
- **skills**: Master skills registry with category references.
- **user_skills**: Association table mapping users to offered or wanted skills, including proficiency and custom fee in paise.
- **learning_requests**: Exchange requests between a requester and a mentor for a specific skill.
- **sessions**: Booked learning sessions linked to accepted requests.
- **reviews**: Ratings and reviews linked to completed sessions.
- **notifications**: In-app alerts for user events.
- **reports**: Flags or issues raised against users or sessions.
- **payment_transactions**: Authoritative transaction ledger recording Razorpay orders, payments, signatures, and statuses.
- **refund_requests**: Explicit tracking of refund applications and administrative resolutions.

---

## 2. Table Schemas & Definitions

### `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| `name` | VARCHAR(120) | NOT NULL | Full student/admin name |
| `email` | VARCHAR(180) | UNIQUE, NOT NULL, INDEX | Primary login email |
| `password_hash` | VARCHAR(255) | NOT NULL | Werkzeug/bcrypt salted hash |
| `role` | VARCHAR(20) | NOT NULL, DEFAULT 'student' | 'student' or 'admin' |
| `department` | VARCHAR(100) | NULL | E.g. Computer Science |
| `semester` | INTEGER | NULL | E.g. 1 through 8 |
| `bio` | TEXT | NULL | Profile summary & background |
| `avatar_url` | VARCHAR(255) | NULL | Profile picture path / avatar |
| `hourly_rate_paise` | INTEGER | DEFAULT 0 | Default mentor session fee in paise |
| `is_active` | BOOLEAN | DEFAULT TRUE | Active account flag |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Registration timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last profile update |

### `skill_categories`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Category ID |
| `name` | VARCHAR(80) | UNIQUE, NOT NULL | Category name |
| `description` | VARCHAR(255) | NULL | Brief description |
| `icon_name` | VARCHAR(50) | NULL | Lucide icon identifier |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Timestamp |

### `skills`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Skill ID |
| `category_id` | INTEGER | FOREIGN KEY -> skill_categories(id) | Associated category |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL, INDEX | Skill name (e.g. Python, UI Design) |
| `description` | TEXT | NULL | Details about the skill |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Timestamp |

### `user_skills`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | User skill mapping ID |
| `user_id` | INTEGER | FOREIGN KEY -> users(id) ON DELETE CASCADE | Target user |
| `skill_id` | INTEGER | FOREIGN KEY -> skills(id) ON DELETE CASCADE | Target skill |
| `skill_type` | VARCHAR(20) | NOT NULL | 'offered' or 'wanted' |
| `proficiency` | VARCHAR(20) | NOT NULL | 'Beginner', 'Intermediate', 'Advanced', 'Expert' |
| `fee_paise` | INTEGER | DEFAULT 0 | Fee in paise for offered skills |
| `years_experience`| FLOAT | DEFAULT 0.0 | Experience duration |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Added timestamp |
| **Constraint** | UNIQUE(user_id, skill_id, skill_type) | Prevents duplicate skill type assignments |

### `learning_requests`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Request identifier |
| `requester_id` | INTEGER | FOREIGN KEY -> users(id) | Student requesting help |
| `mentor_id` | INTEGER | FOREIGN KEY -> users(id) | Student offering skill |
| `skill_id` | INTEGER | FOREIGN KEY -> skills(id) | Target skill |
| `message` | TEXT | NULL | Requester's note/goals |
| `preferred_mode`| VARCHAR(20) | DEFAULT 'online' | 'online' or 'offline' |
| `status` | VARCHAR(30) | NOT NULL, DEFAULT 'pending' | 'pending', 'accepted', 'rejected', 'cancelled' |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Request timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Status update timestamp |

### `sessions`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Session identifier |
| `request_id` | INTEGER | FOREIGN KEY -> learning_requests(id) | Associated learning request |
| `mentor_id` | INTEGER | FOREIGN KEY -> users(id) | Teaching student |
| `learner_id` | INTEGER | FOREIGN KEY -> users(id) | Learning student |
| `skill_id` | INTEGER | FOREIGN KEY -> skills(id) | Skill taught |
| `title` | VARCHAR(200) | NOT NULL | Session topic / title |
| `scheduled_start`| DATETIME | NOT NULL | Start datetime |
| `scheduled_end` | DATETIME | NOT NULL | End datetime |
| `mode` | VARCHAR(20) | NOT NULL, DEFAULT 'online' | 'online' or 'offline' |
| `meeting_info` | VARCHAR(255) | NULL | Zoom/Meet URL or campus room |
| `fee_paise` | INTEGER | NOT NULL, DEFAULT 0 | Fee charged in integer paise |
| `status` | VARCHAR(30) | NOT NULL, DEFAULT 'scheduled'| 'scheduled', 'completed', 'cancelled' |
| `notes` | TEXT | NULL | Pre or post-session notes |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Scheduled at |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Updated at |

### `payment_transactions`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Internal transaction ID |
| `session_id` | INTEGER | FOREIGN KEY -> sessions(id) | Target session |
| `payer_id` | INTEGER | FOREIGN KEY -> users(id) | Paying learner |
| `payee_id` | INTEGER | FOREIGN KEY -> users(id) | Beneficiary mentor |
| `amount_paise` | INTEGER | NOT NULL | Total amount in paise |
| `currency` | VARCHAR(10) | NOT NULL, DEFAULT 'INR' | Currency code |
| `gateway` | VARCHAR(50) | NOT NULL, DEFAULT 'razorpay' | Gateway identifier |
| `gateway_order_id`| VARCHAR(100) | UNIQUE, NOT NULL, INDEX | Razorpay order id (order_xxx) |
| `gateway_payment_id`| VARCHAR(100) | UNIQUE, NULL, INDEX | Razorpay payment id (pay_xxx) |
| `gateway_signature`| VARCHAR(255) | NULL | Cryptographic payment signature |
| `status` | VARCHAR(40) | NOT NULL, DEFAULT 'pending'| pending, processing, paid, failed, cancelled, refund_pending, refunded |
| `error_code` | VARCHAR(100) | NULL | Gateway error code if failed |
| `error_description`| TEXT | NULL | Gateway error description |
| `paid_at` | DATETIME | NULL | Timestamp payment verified |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Update timestamp |

### `refund_requests`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Refund request ID |
| `transaction_id`| INTEGER | FOREIGN KEY -> payment_transactions(id) | Parent transaction |
| `user_id` | INTEGER | FOREIGN KEY -> users(id) | User requesting refund |
| `amount_paise` | INTEGER | NOT NULL | Refund amount requested |
| `reason` | TEXT | NOT NULL | Student's explanation |
| `status` | VARCHAR(30) | NOT NULL, DEFAULT 'pending' | pending, approved, rejected, processed |
| `admin_notes` | TEXT | NULL | Resolution comments |
| `gateway_refund_id`| VARCHAR(100) | NULL | Razorpay refund id (rfnd_xxx) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Timestamp |
| `resolved_at` | DATETIME | NULL | Resolution timestamp |

### `reviews`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Review ID |
| `session_id` | INTEGER | FOREIGN KEY -> sessions(id) | Completed session |
| `reviewer_id` | INTEGER | FOREIGN KEY -> users(id) | Student submitting review |
| `reviewee_id` | INTEGER | FOREIGN KEY -> users(id) | Student being rated |
| `rating` | INTEGER | NOT NULL (CHECK 1 <= rating <= 5)| Rating from 1 to 5 |
| `comment` | TEXT | NULL | Written feedback |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Review timestamp |
| **Constraint** | UNIQUE(session_id, reviewer_id) | Prevents duplicate reviews per session |

### `notifications`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Notification ID |
| `user_id` | INTEGER | FOREIGN KEY -> users(id) ON DELETE CASCADE | Recipient student |
| `title` | VARCHAR(150) | NOT NULL | Alert title |
| `message` | TEXT | NOT NULL | Body message |
| `type` | VARCHAR(50) | NOT NULL | 'request', 'session', 'payment', 'review', 'system' |
| `link` | VARCHAR(255) | NULL | Target app route |
| `is_read` | BOOLEAN | DEFAULT FALSE | Read state |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Timestamp |

### `reports`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Report ID |
| `reporter_id` | INTEGER | FOREIGN KEY -> users(id) | Reporting user |
| `reported_user_id`| INTEGER | FOREIGN KEY -> users(id) | Target user |
| `session_id` | INTEGER | NULL, FOREIGN KEY -> sessions(id) | Optional session link |
| `reason` | VARCHAR(150) | NOT NULL | Report category |
| `details` | TEXT | NOT NULL | Report description |
| `status` | VARCHAR(30) | DEFAULT 'open' | 'open', 'resolved', 'dismissed' |
| `admin_action` | TEXT | NULL | Action taken |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Timestamp |
| `resolved_at` | DATETIME | NULL | Resolution timestamp |
