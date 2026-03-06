const pool = require('../config/database');

// ── GET /api/teacher/classes — Get all classes ──────────────
const getClasses = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(s.id) as student_count
       FROM classes c
       LEFT JOIN students s ON s.class_id = c.id
       GROUP BY c.id
       ORDER BY c.form_level, c.stream`
    );
    res.json({ success: true, classes: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /api/teacher/classes/:id/students ───────────────────
const getClassStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT s.id, s.admission_no, s.first_name, s.last_name, s.gender
       FROM students s
       WHERE s.class_id = $1 AND s.status = 'Active'
       ORDER BY s.last_name, s.first_name`,
      [id]
    );
    res.json({ success: true, students: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /api/teacher/attendance?class_id=&date= ─────────────
const getAttendance = async (req, res) => {
  try {
    const { class_id, date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT a.student_id, a.status, a.notes,
              s.first_name, s.last_name, s.admission_no
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE s.class_id = $1 AND a.date = $2`,
      [class_id, targetDate]
    );

    res.json({ success: true, date: targetDate, records: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── POST /api/teacher/attendance — Save attendance ──────────
const saveAttendance = async (req, res) => {
  const client = await pool.connect();
  try {
    const { class_id, date, records } = req.body;
    // records = [{ student_id, status, notes }]

    if (!records || !records.length) {
      return res.status(400).json({ success: false, message: 'No records provided.' });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    await client.query('BEGIN');

    for (const r of records) {
      await client.query(
        `INSERT INTO attendance (student_id, class_id, date, status, notes, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (student_id, date)
         DO UPDATE SET status = $4, notes = $5`,
        [r.student_id, class_id, targetDate, r.status, r.notes || null, req.user.userId]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Attendance saved for ${records.length} students.`,
      date: targetDate
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    client.release();
  }
};

// ── GET /api/teacher/subjects ───────────────────────────────
const getSubjects = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subjects ORDER BY name');
    res.json({ success: true, subjects: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── POST /api/teacher/grades — Save grades ──────────────────
const saveGrades = async (req, res) => {
  const client = await pool.connect();
  try {
    const { grades } = req.body;
    // grades = [{ student_id, subject_id, score, term, year, remarks }]

    if (!grades || !grades.length) {
      return res.status(400).json({ success: false, message: 'No grades provided.' });
    }

    await client.query('BEGIN');

    for (const g of grades) {
      // Calculate grade letter from score
      let gradeLetter = 'E';
      if (g.score >= 80)      gradeLetter = 'A';
      else if (g.score >= 70) gradeLetter = 'B+';
      else if (g.score >= 60) gradeLetter = 'B';
      else if (g.score >= 50) gradeLetter = 'C+';
      else if (g.score >= 40) gradeLetter = 'C';
      else if (g.score >= 30) gradeLetter = 'D+';
      else if (g.score >= 20) gradeLetter = 'D';

      await client.query(
        `INSERT INTO grades (student_id, subject_id, score, grade, term, year, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (student_id, subject_id, term, year)
         DO UPDATE SET score = $3, grade = $4, remarks = $7`,
        [g.student_id, g.subject_id, g.score, gradeLetter,
         g.term || 'Term 1', g.year || new Date().getFullYear(), g.remarks || null]
      );
    }

    await client.query('COMMIT');

    res.json({ success: true, message: `${grades.length} grades saved successfully.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    client.release();
  }
};

// ── GET /api/teacher/grades?class_id=&subject_id=&term=&year= 
const getGrades = async (req, res) => {
  try {
    const { class_id, subject_id, term, year } = req.query;

    const result = await pool.query(
      `SELECT g.score, g.grade, g.remarks, g.term, g.year,
              s.id as student_id, s.first_name, s.last_name, s.admission_no,
              sub.name as subject_name
       FROM grades g
       JOIN students s ON g.student_id = s.id
       JOIN subjects sub ON g.subject_id = sub.id
       WHERE s.class_id = $1
         AND g.subject_id = $2
         AND g.term = $3
         AND g.year = $4
       ORDER BY s.last_name, s.first_name`,
      [class_id, subject_id, term || 'Term 1', year || new Date().getFullYear()]
    );

    res.json({ success: true, grades: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getClasses, getClassStudents,
  getAttendance, saveAttendance,
  getSubjects, saveGrades, getGrades
};
