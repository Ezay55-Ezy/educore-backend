-- ============================================================
--  EduCore School Management System — Database Schema
--  Run this file in PostgreSQL to set up all tables
--  Command: psql -U postgres -d educore_db -f schema.sql
-- ============================================================

-- Create the database (run this separately if needed)
-- CREATE DATABASE educore_db;

-- ── CLASSES TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL,        -- e.g. "Form 1 East"
  form_level  INTEGER NOT NULL,            -- 1, 2, 3, or 4
  stream      VARCHAR(20),                 -- "East", "West", etc.
  capacity    INTEGER DEFAULT 45,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── STUDENTS TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id              SERIAL PRIMARY KEY,
  admission_no    VARCHAR(20) UNIQUE NOT NULL,   -- ADM-2024-001
  first_name      VARCHAR(50) NOT NULL,
  last_name       VARCHAR(50) NOT NULL,
  date_of_birth   DATE,
  gender          VARCHAR(10),
  blood_group     VARCHAR(5),
  address         TEXT,
  photo_url       VARCHAR(255),
  class_id        INTEGER REFERENCES classes(id),
  admission_date  DATE DEFAULT CURRENT_DATE,
  prev_school     VARCHAR(100),
  kcpe_score      INTEGER,
  medical_notes   TEXT,
  national_id     VARCHAR(20),
  status          VARCHAR(20) DEFAULT 'Active',  -- Active, Suspended, Graduated
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ── USERS TABLE (Login credentials) ────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(100) UNIQUE,
  admission_no  VARCHAR(20) UNIQUE,           -- students login with this
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) DEFAULT 'student', -- student, teacher, admin
  student_id    INTEGER REFERENCES students(id),
  is_active     BOOLEAN DEFAULT TRUE,
  last_login    TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ── PARENTS TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parents (
  id            SERIAL PRIMARY KEY,
  student_id    INTEGER REFERENCES students(id) ON DELETE CASCADE,
  full_name     VARCHAR(100) NOT NULL,
  relationship  VARCHAR(30),                  -- Father, Mother, Guardian
  phone_primary VARCHAR(15) NOT NULL,
  phone_secondary VARCHAR(15),
  email         VARCHAR(100),
  occupation    VARCHAR(100),
  address       TEXT,
  is_primary    BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ── ATTENDANCE TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER REFERENCES students(id) ON DELETE CASCADE,
  class_id    INTEGER REFERENCES classes(id),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status      VARCHAR(15) NOT NULL,           -- Present, Absent, Late, Excused
  notes       TEXT,
  recorded_by INTEGER,                        -- teacher user id
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, date)                    -- one record per student per day
);

-- ── FEES TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_structures (
  id          SERIAL PRIMARY KEY,
  class_id    INTEGER REFERENCES classes(id),
  term        VARCHAR(20) NOT NULL,            -- Term 1, Term 2, Term 3
  year        INTEGER NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  description VARCHAR(100),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_payments (
  id              SERIAL PRIMARY KEY,
  student_id      INTEGER REFERENCES students(id) ON DELETE CASCADE,
  amount_paid     DECIMAL(10,2) NOT NULL,
  payment_date    DATE DEFAULT CURRENT_DATE,
  payment_method  VARCHAR(30),                -- Mpesa, Cash, Bank
  mpesa_ref       VARCHAR(50),
  term            VARCHAR(20),
  year            INTEGER,
  received_by     VARCHAR(100),
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ── SUBJECTS & GRADES TABLE ────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(100) NOT NULL,             -- Mathematics, English, etc.
  code      VARCHAR(10) UNIQUE,                -- MATH, ENG, etc.
  is_core   BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS grades (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER REFERENCES students(id) ON DELETE CASCADE,
  subject_id  INTEGER REFERENCES subjects(id),
  term        VARCHAR(20),
  year        INTEGER,
  score       DECIMAL(5,2),
  grade       VARCHAR(5),                     -- A, B+, C, etc.
  remarks     TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── INDEXES (makes queries faster) ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_admission_no ON students(admission_no);
CREATE INDEX IF NOT EXISTS idx_students_class_id     ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student    ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date       ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student  ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_users_admission_no    ON users(admission_no);

-- ============================================================
--  SAMPLE DATA — for testing
-- ============================================================

-- Insert classes
INSERT INTO classes (name, form_level, stream) VALUES
  ('Form 1 East', 1, 'East'),
  ('Form 1 West', 1, 'West'),
  ('Form 2 East', 2, 'East'),
  ('Form 2 West', 2, 'West'),
  ('Form 3 East', 3, 'East'),
  ('Form 3 West', 3, 'West'),
  ('Form 4 East', 4, 'East'),
  ('Form 4 West', 4, 'West')
ON CONFLICT DO NOTHING;

-- Insert subjects
INSERT INTO subjects (name, code, is_core) VALUES
  ('Mathematics',        'MATH', TRUE),
  ('English',            'ENG',  TRUE),
  ('Kiswahili',          'KSW',  TRUE),
  ('Biology',            'BIO',  TRUE),
  ('Chemistry',          'CHEM', TRUE),
  ('Physics',            'PHY',  TRUE),
  ('History & Government','HIST', FALSE),
  ('Geography',          'GEO',  FALSE),
  ('Computer Studies',   'COMP', FALSE)
ON CONFLICT DO NOTHING;

-- Insert sample students
INSERT INTO students (admission_no, first_name, last_name, date_of_birth, gender, class_id, admission_date, kcpe_score, status)
VALUES
  ('ADM-2024-001', 'Amina',  'Ochieng',  '2009-03-15', 'Female', 3, '2024-01-10', 380, 'Active'),
  ('ADM-2024-002', 'Brian',  'Kamau',    '2010-06-22', 'Male',   1, '2024-01-10', 345, 'Active'),
  ('ADM-2023-089', 'Cynthia','Wanjiru',  '2008-11-05', 'Female', 5, '2023-01-09', 402, 'Active'),
  ('ADM-2024-003', 'Daniel', 'Mwangi',   '2007-08-30', 'Male',   7, '2024-01-10', 420, 'Active'),
  ('ADM-2024-004', 'Esther', 'Akinyi',   '2010-01-18', 'Female', 2, '2024-01-10', 361, 'Active')
ON CONFLICT DO NOTHING;

-- Insert sample parents
INSERT INTO parents (student_id, full_name, relationship, phone_primary, email)
VALUES
  (1, 'John Ochieng',   'Father',   '0712345678', 'john.ochieng@email.com'),
  (2, 'Mary Kamau',     'Mother',   '0723456789', 'mary.kamau@email.com'),
  (3, 'Peter Wanjiru',  'Father',   '0734567890', NULL),
  (4, 'Grace Mwangi',   'Mother',   '0745678901', 'grace.mwangi@email.com'),
  (5, 'Samuel Akinyi',  'Father',   '0756789012', NULL)
ON CONFLICT DO NOTHING;

-- Insert login users for sample students
-- Passwords are all "password123" (hashed with bcrypt)
-- In production users will set their own passwords
INSERT INTO users (admission_no, password_hash, role, student_id)
VALUES
  ('ADM-2024-001', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh3y', 'student', 1),
  ('ADM-2024-002', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh3y', 'student', 2),
  ('ADM-2024-003', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh3y', 'student', 5)
ON CONFLICT DO NOTHING;

-- Insert sample attendance
INSERT INTO attendance (student_id, date, status)
VALUES
  (1, CURRENT_DATE,       'Present'),
  (1, CURRENT_DATE - 1,   'Present'),
  (1, CURRENT_DATE - 2,   'Absent'),
  (2, CURRENT_DATE,       'Present'),
  (2, CURRENT_DATE - 1,   'Late'),
  (3, CURRENT_DATE,       'Present')
ON CONFLICT DO NOTHING;

-- Insert sample fee payments
INSERT INTO fee_payments (student_id, amount_paid, payment_method, term, year, notes)
VALUES
  (1, 15000, 'Mpesa', 'Term 1', 2024, 'Full payment'),
  (2, 8000,  'Cash',  'Term 1', 2024, 'Partial payment'),
  (3, 15000, 'Bank',  'Term 1', 2024, 'Full payment')
ON CONFLICT DO NOTHING;

-- Insert sample grades
INSERT INTO grades (student_id, subject_id, term, year, score, grade)
VALUES
  (1, 1, 'Term 1', 2024, 85.5, 'A'),
  (1, 2, 'Term 1', 2024, 78.0, 'B+'),
  (1, 3, 'Term 1', 2024, 90.0, 'A'),
  (2, 1, 'Term 1', 2024, 65.0, 'B'),
  (2, 2, 'Term 1', 2024, 72.5, 'B+')
ON CONFLICT DO NOTHING;

-- ============================================================
--  Done! All tables created and sample data inserted.
-- ============================================================
