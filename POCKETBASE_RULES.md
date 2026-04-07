# PocketBase Collection Access Rules

## Overview

This document defines the recommended row-level security rules for AlloFlow's core PocketBase collections. These rules enforce role-based access control (RBAC) to protect student data, teacher resources, and administrative functions.

## Role Definitions

| Role | Description | Capabilities |
|------|-------------|--------------|
| **student** | K-12 learner using AlloFlow | Read/write own sessions only; read class glossaries |
| **teacher** | Educator managing classes | Read all student sessions in their classes; create activities; manage grades |
| **admin** | IT administrator | Full access to all collections; user/role management |
| **anonymous** | Unauthenticated user | (Optional) read-only public preview mode |

---

## Collection Rules

### 1. `sessions` — Active Learning Sessions

**Purpose:** Stores session state (mode, current slide, responses, timer, etc.)

**Rule Schema:**
```javascript
// Create Rule (allow-create): Teachers and admins can create
user.role == 'teacher' || user.role == 'admin'

// Read Rule (allow-read): Student sees only own; teachers see their class sessions; admins see all
user.role == 'admin' ||
(user.role == 'teacher' && record.teacher_id == user.id) ||
(user.role == 'student' && record.session_owner_id == user.id)

// Update Rule (allow-update): Student updates own; teacher/admin updates any
user.role == 'admin' ||
(user.role == 'teacher' && record.teacher_id == user.id) ||
(user.role == 'student' && record.session_owner_id == user.id)

// Delete Rule (allow-delete): Teacher deletes own; admin deletes any
user.role == 'admin' || (user.role == 'teacher' && record.teacher_id == user.id)
```

**Example Document:**
```json
{
  "id": "session_abc123",
  "code": "XYZAB",          // 6-digit join code
  "teacher_id": "user_teacher_001",
  "teacher_name": "Mrs. Johnson",
  "class_id": "class_grade5",
  "session_owner_id": "user_teacher_001",
  "mode": "escape_room",
  "subject": "photosynthesis",
  "grade_level": "5",
  "created": "2026-03-16T10:30:00Z",
  "started": "2026-03-16T10:35:00Z",
  "ended": null,
  "is_live": true,
  "student_count": 24,
  "current_slide": 3,
  "time_remaining_seconds": 180
}
```

---

### 2. `student_progress` — Per-Student Session Responses

**Purpose:** Tracks individual student responses, scores, and time-on-task within each session

**Rule Schema:**
```javascript
// Create Rule: Students write own; teachers/admins can create for students
user.role == 'admin' ||
(user.role == 'teacher') ||
(user.role == 'student' && record.student_id == user.id)

// Read Rule: Student reads own; teacher reads their students; admin reads all
user.role == 'admin' ||
(user.role == 'teacher' && record.teacher_id == user.id) ||
(user.role == 'student' && record.student_id == user.id)

// Update Rule: Student updates own; teacher/admin updates any
user.role == 'admin' ||
(user.role == 'teacher' && record.teacher_id == user.id) ||
(user.role == 'student' && record.student_id == user.id && !record.is_submitted)

// Delete Rule: Teacher deletes own sessions' data; admin deletes any
user.role == 'admin' || (user.role == 'teacher' && record.teacher_id == user.id)
```

**Example Document:**
```json
{
  "id": "progress_xyz789",
  "session_id": "session_abc123",
  "student_id": "user_student_042",
  "student_name": "Alex M.",
  "teacher_id": "user_teacher_001",
  "class_id": "class_grade5",
  "current_question": 5,
  "responses": [
    {"question": 1, "answer": "B", "correct": true, "time_seconds": 12},
    {"question": 2, "answer": "light", "correct": true, "time_seconds": 45},
    null,
    null,
    {"question": 5, "answer": "water", "correct": false, "time_seconds": 8}
  ],
  "score": 2,
  "max_score": 5,
  "time_on_task_seconds": 65,
  "is_submitted": false,
  "started": "2026-03-16T10:35:00Z",
  "last_updated": "2026-03-16T10:40:15Z"
}
```

---

### 3. `teacher_history` — Lesson Plans & Custom Activities

**Purpose:** Stores generated lesson plans, differentiation profiles, and custom activity metadata

**Rule Schema:**
```javascript
// Create Rule: Teachers/admins create
user.role == 'teacher' || user.role == 'admin'

// Read Rule: Creator reads own; admins read all
user.role == 'admin' || record.created_by == user.id

// Update Rule: Creator updates own; admin updates any
user.role == 'admin' || (record.created_by == user.id && record.owner_id == user.id)

// Delete Rule: Creator deletes own; admin deletes any
user.role == 'admin' || (record.created_by == user.id && record.owner_id == user.id)
```

**Example Document:**
```json
{
  "id": "history_lp_001",
  "created_by": "user_teacher_001",
  "owner_id": "user_teacher_001",
  "title": "Photosynthesis 3-Level Differentiation",
  "subject": "Science",
  "grade_level": "5",
  "standards": ["NGSS.5-LS1-1"],
  "resource_type": "lesson_plan",
  "generated_resource_ids": ["activity_001", "activity_002", "glossary_001"],
  "created": "2026-03-10T14:22:00Z",
  "modified": "2026-03-16T09:15:00Z",
  "is_shared": false,
  "tags": ["differentiation", "photosynthesis"]
}
```

---

### 4. `session_assets` — Generated Activities & Media

**Purpose:** Stores escape room puzzles, quiz questions, glossaries, images, etc. (linked from `sessions`)

**Rule Schema:**
```javascript
// Create Rule: Teachers/admins create
user.role == 'teacher' || user.role == 'admin'

// Read Rule: If public, anyone can read; if private, creator + teacher in session + admin
record.is_public == true ||
user.role == 'admin' ||
record.created_by == user.id ||
(record.session_id && 
 @collection.sessions.where(id==record.session_id).one().teacher_id == user.id)

// Update Rule: Creator updates own assets; admin updates any
user.role == 'admin' || record.created_by == user.id

// Delete Rule: Creator deletes own; admin deletes any
user.role == 'admin' || record.created_by == user.id
```

**Example Document:**
```json
{
  "id": "asset_escape_puzzle_001",
  "session_id": "session_abc123",
  "asset_type": "escape_room_puzzle",
  "created_by": "user_teacher_001",
  "title": "Photosynthesis Cipher Puzzle",
  "puzzle_type": "cipher",
  "content": {
    "question": "What are the two main products of photosynthesis?",
    "cipher_text": "OLGUCJVR CPF YYVGT",
    "answer": "Glucose and Oxygen",
    "hint": "One is sugar, one is gas"
  },
  "is_public": false,
  "created": "2026-03-16T10:30:00Z",
  "modified": "2026-03-16T10:30:00Z"
}
```

---

### 5. `users` — Role & Permission Cache

**Purpose:** Syncs user roles and class assignments from your SIS (optional, for performance)

> **Note:** If using Firebase Auth + custom claims, you may not need this collection. If using PocketBase auth, include this.

**Rule Schema:**
```javascript
// Create Rule: Admin only (via SIS sync script or manual)
user.role == 'admin'

// Read Rule: Users read own; admins read all
user.role == 'admin' || record.id == user.id

// Update Rule: Users update own password/email; admins update roles
user.role == 'admin' || (record.id == user.id && !record.role)

// Delete Rule: Admin only
user.role == 'admin'
```

**Example Document:**
```json
{
  "id": "user_teacher_001",
  "email": "johnson@school.edu",
  "name": "Sarah Johnson",
  "role": "teacher",
  "school_id": "school_abc",
  "class_ids": ["class_grade5_a", "class_grade5_b"],
  "is_active": true,
  "created": "2026-01-15T08:00:00Z"
}
```

---

## Implementation Steps

### 1. Create Collections (if not present)

In PocketBase Admin UI (`http://localhost:8090/_/#/collections`):

1. Click **"Create New"** → Collection
2. Name: `sessions` → Create
3. Repeat for: `student_progress`, `teacher_history`, `session_assets`, `users`

### 2. Apply Rules

For each collection:

1. Go to **Settings** → **API Rules**
2. Paste the corresponding rule from above into each section:
   - **List**: Read rule
   - **Create**: Create rule
   - **Read**: Read rule
   - **Update**: Update rule
   - **Delete**: Delete rule
3. Click **Save**

### 3. Test with Different Roles

#### Test as Student
- Authenticate with a student account
- Should see own session data only
- Should not see other students' progress

#### Test as Teacher
- Authenticate with a teacher account
- Should see all sessions in assigned classes
- Should see all student progress in those sessions
- Should not see other teachers' private lessons

#### Test as Admin
- Authenticate with an admin account
- Should see all data across all collections

---

## Offline Security Notes

**Important:** The above rules assume network connectivity to enforce authorization.

If deploying in **fully air-gapped** mode:
1. Rules are **enforced at the database layer** (PocketBase)
2. Even if someone accesses the browser cache, PocketBase rejects writes
3. Recommended: Use **signed JWTs** in PocketBase auth for unsigned tokens

---

## Future Enhancements

- **Shared Lessons:** Mark teacher resources as "shared with school" (needs additional `shared_with_teams` field)
- **Audit Logging:** Add `created_by` and `modified_by` fields + audit collection
- **Data Retention:** Auto-delete sessions > 30 days old (cron job in admin dashboard)
- **SIS Integration:** Auto-sync roles and class rosters from Google Classroom / Clever

---

**Last Updated:** March 16, 2026  
**Version:** 1.0 (Week 3 Security Hardening)
