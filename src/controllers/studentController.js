const pool = require('../config/database');

// ── GET /api/students/:id — Full student profile ────────────
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
         s.id, s.admission_no, s.first_name, s.last_name,
         s.date_of_birth, s.gender, s.blood_group,
         s.address, s.photo_url, s.admission_date,
         s.prev_school, s.kcpe_score, s.medical_notes,
         s.national_id, s.status, s.created_at,
         c.name        AS class_name,
         c.form_level  AS form,
         c.stream
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // Get parent info
    const parents = await pool.query(
      `SELECT full_name, relationship, phone_primary, phone_secondary, email, occupation
       FROM parents WHERE student_id = $1`,
      [id]
    );

    const student = result.rows[0];

    res.json({
      success: true,
      student: {
        ...student,
        full_name: `${student.first_name} ${student.last_name}`,
        parents: parents.rows
      }
    });

  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /api/students — All students (admin/teacher only) ───
const getAllStudents = async (req, res) => {
  try {
    const { class_id, status, search } = req.query;

    let query = `
      SELECT
        s.id, s.admission_no, s.first_name, s.last_name,
        s.gender, s.status, s.admission_date,
        c.name AS class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (class_id) {
      query += ` AND s.class_id = $${paramCount++}`;
      params.push(class_id);
    }

    if (status) {
      query += ` AND s.status = $${paramCount++}`;
      params.push(status);
    }

    if (search) {
      query += ` AND (
        s.first_name ILIKE $${paramCount} OR
        s.last_name  ILIKE $${paramCount} OR
        s.admission_no ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      students: result.rows
    });

  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── POST /api/students — Register new student ───────────────
const createStudent = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      first_name, last_name, date_of_birth, gender,
      blood_group, address, class_id, admission_date,
      prev_school, kcpe_score, medical_notes, national_id,
      parent_name, parent_relationship, parent_phone, parent_email
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name) {
      return res.status(400).json({ success: false, message: 'First and last name are required.' });
    }

    // Auto-generate admission number: ADM-YYYY-NNN
    const year = new Date().getFullYear();
    const countResult = await client.query('SELECT COUNT(*) FROM students');
    const count = parseInt(countResult.rows[0].count) + 1;
    const admission_no = `ADM-${year}-${String(count).padStart(3, '0')}`;

    // Insert student
    const studentResult = await client.query(
      `INSERT INTO students
         (admission_no, first_name, last_name, date_of_birth, gender,
          blood_group, address, class_id, admission_date, prev_school,
          kcpe_score, medical_notes, national_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [admission_no, first_name, last_name, date_of_birth, gender,
       blood_group, address, class_id, admission_date || new Date(),
       prev_school, kcpe_score, medical_notes, national_id]
    );

    const student = studentResult.rows[0];

    // Insert parent if provided
    if (parent_name && parent_phone) {
      await client.query(
        `INSERT INTO parents (student_id, full_name, relationship, phone_primary, email)
         VALUES ($1, $2, $3, $4, $5)`,
        [student.id, parent_name, parent_relationship || 'Guardian', parent_phone, parent_email]
      );
    }

    // Create login credentials (default password = admission_no)
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(admission_no, 10);
    await client.query(
      `INSERT INTO users (admission_no, password_hash, role, student_id)
       VALUES ($1, $2, 'student', $3)`,
      [admission_no, passwordHash, student.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Student registered successfully! Default password is: ${admission_no}`,
      student: {
        ...student,
        full_name: `${first_name} ${last_name}`,
        default_password: admission_no
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create student error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Admission number already exists.' });
    }
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    client.release();
  }
};

// ── PUT /api/students/:id — Update student ──────────────────
const updateStudent = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      first_name, last_name, date_of_birth, gender,
      blood_group, address, class_id, medical_notes,
      status, kcpe_score,
      parent_name, parent_relationship, parent_phone, parent_email
    } = req.body;

    // Convert empty strings to null to avoid integer conversion errors
    const safeClassId   = class_id   && class_id   !== '' ? parseInt(class_id)   : null;
    const safeKcpe      = kcpe_score && kcpe_score !== '' ? parseInt(kcpe_score) : null;
    const safeDob       = date_of_birth && date_of_birth !== '' ? date_of_birth : null;

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE students SET
         first_name    = COALESCE($1, first_name),
         last_name     = COALESCE($2, last_name),
         date_of_birth = COALESCE($3, date_of_birth),
         gender        = COALESCE($4, gender),
         blood_group   = COALESCE($5, blood_group),
         address       = COALESCE($6, address),
         class_id      = COALESCE($7, class_id),
         medical_notes = COALESCE($8, medical_notes),
         status        = COALESCE($9, status),
         kcpe_score    = COALESCE($10, kcpe_score)
       WHERE id = $11 RETURNING *`,
      [first_name, last_name, safeDob, gender, blood_group,
       address, safeClassId, medical_notes, status, safeKcpe, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // Update parent info if provided
    if (parent_name || parent_phone) {
      const existingParent = await client.query(
        'SELECT id FROM parents WHERE student_id = $1', [id]
      );
      if (existingParent.rows.length > 0) {
        await client.query(
          `UPDATE parents SET
             full_name    = COALESCE($1, full_name),
             relationship = COALESCE($2, relationship),
             phone_primary = COALESCE($3, phone_primary),
             email        = COALESCE($4, email)
           WHERE student_id = $5`,
          [parent_name, parent_relationship, parent_phone, parent_email, id]
        );
      } else {
        await client.query(
          `INSERT INTO parents (student_id, full_name, relationship, phone_primary, email)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, parent_name, parent_relationship || 'Guardian', parent_phone, parent_email]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Student updated successfully.', student: result.rows[0] });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update student error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    client.release();
  }
};

// ── GET /api/students/:id/attendance ────────────────────────
const getAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { month, year } = req.query;

    let query = `
      SELECT date, status, notes
      FROM attendance
      WHERE student_id = $1
    `;
    const params = [id];

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`;
      params.push(month, year);
    }

    query += ' ORDER BY date DESC LIMIT 60';

    const result = await pool.query(query, params);

    // Calculate summary
    const total   = result.rows.length;
    const present = result.rows.filter(r => r.status === 'Present').length;
    const absent  = result.rows.filter(r => r.status === 'Absent').length;
    const late    = result.rows.filter(r => r.status === 'Late').length;
    const rate    = total > 0 ? Math.round((present / total) * 100) : 0;

    res.json({
      success: true,
      summary: { total, present, absent, late, attendance_rate: `${rate}%` },
      records: result.rows
    });

  } catch (error) {
    console.error('Attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /api/students/:id/fees ───────────────────────────────
const getFees = async (req, res) => {
  try {
    const { id } = req.params;

    // Get all payments
    const payments = await pool.query(
      `SELECT amount_paid, payment_date, payment_method, mpesa_ref, term, year, notes
       FROM fee_payments WHERE student_id = $1 ORDER BY payment_date DESC`,
      [id]
    );

    // Get fee structure for current term
    const student = await pool.query('SELECT class_id FROM students WHERE id = $1', [id]);
    const classId = student.rows[0]?.class_id;

    let feeStructure = null;
    if (classId) {
      const fs = await pool.query(
        `SELECT amount, term, year, description FROM fee_structures
         WHERE class_id = $1 ORDER BY year DESC, term DESC LIMIT 1`,
        [classId]
      );
      feeStructure = fs.rows[0] || null;
    }

    const totalPaid = payments.rows.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);
    const required  = feeStructure ? parseFloat(feeStructure.amount) : 15000;
    const balance   = required - totalPaid;

    res.json({
      success: true,
      summary: {
        total_required: required,
        total_paid:     totalPaid,
        balance:        balance > 0 ? balance : 0,
        status:         balance <= 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Unpaid'
      },
      payments: payments.rows,
      fee_structure: feeStructure
    });

  } catch (error) {
    console.error('Fees error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /api/students/:id/grades ─────────────────────────────
const getGrades = async (req, res) => {
  try {
    const { id } = req.params;
    const { term, year } = req.query;

    let query = `
      SELECT g.score, g.grade, g.remarks, g.term, g.year,
             s.name AS subject, s.code AS subject_code
      FROM grades g
      JOIN subjects s ON g.subject_id = s.id
      WHERE g.student_id = $1
    `;
    const params = [id];

    if (term) { query += ` AND g.term = $${params.length + 1}`; params.push(term); }
    if (year) { query += ` AND g.year = $${params.length + 1}`; params.push(year); }

    query += ' ORDER BY g.year DESC, g.term DESC, s.name';

    const result = await pool.query(query, params);

    // Calculate average
    const scores = result.rows.filter(r => r.score !== null).map(r => parseFloat(r.score));
    const avg    = scores.length > 0 ? (scores.reduce((a,b) => a+b, 0) / scores.length).toFixed(1) : null;

    res.json({
      success: true,
      summary: { average: avg, total_subjects: result.rows.length },
      grades: result.rows
    });

  } catch (error) {
    console.error('Grades error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /api/students/teachers — List all teachers ──────────
const getTeachers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, admission_no, email, role, created_at
       FROM users WHERE role = 'teacher' ORDER BY created_at DESC`
    );
    res.json({ success: true, teachers: result.rows });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── POST /api/students/register-teacher ─────────────────────
const registerTeacher = async (req, res) => {
  try {
    const { name, email, password, admission_no, subject, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }

    const bcrypt = require('bcryptjs');
    const hash   = await bcrypt.hash(password, 10);
    const staffNo = admission_no || `TCH-${Date.now().toString().slice(-4)}`;

    const result = await pool.query(
      `INSERT INTO users (admission_no, email, password_hash, role)
       VALUES ($1, $2, $3, 'teacher')
       ON CONFLICT (email) DO NOTHING
       RETURNING id, admission_no, email, role`,
      [staffNo, email, hash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Email already exists.' });
    }

    res.status(201).json({
      success: true,
      message: `Teacher ${name} registered successfully.`,
      teacher: result.rows[0]
    });

  } catch (error) {
    console.error('Register teacher error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── DELETE /api/students/teachers/:id ───────────────────────
const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM users WHERE id = $1 AND role = 'teacher'`, [id]);
    res.json({ success: true, message: 'Teacher removed.' });
  } catch (error) {
    console.error('Delete teacher error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── DELETE /api/students/:id ─────────────────────────────────
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM students WHERE id = $1', [id]);
    res.json({ success: true, message: 'Student deleted.' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getAllStudents, getStudentById, createStudent,
  updateStudent, getAttendance, getFees, getGrades,
  getTeachers, registerTeacher, deleteTeacher, deleteStudent
};