const pool = require('../config/database');

const getClasses = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(s.id) as student_count
       FROM classes c
       LEFT JOIN students s ON s.class_id = c.id
       GROUP BY c.id ORDER BY c.name`
    );
    res.json({ success: true, classes: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getClassStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT s.id, s.first_name, s.last_name, s.admission_no
       FROM students s WHERE s.class_id = $1
       ORDER BY s.last_name, s.first_name`,
      [id]
    );
    res.json({ success: true, students: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getAttendance = async (req, res) => {
  try {
    const { class_id, date } = req.query;
    const result = await pool.query(
      `SELECT a.student_id, a.status
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE s.class_id = $1 AND a.date = $2`,
      [class_id, date]
    );
    res.json({ success: true, attendance: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const saveAttendance = async (req, res) => {
  const client = await pool.connect();
  try {
    const { records } = req.body;
    if (!records || !records.length) {
      return res.status(400).json({ success: false, message: 'No records provided.' });
    }
    await client.query('BEGIN');
    for (const r of records) {
      await client.query(
        `INSERT INTO attendance (student_id, date, status, recorded_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, date)
         DO UPDATE SET status = $3`,
        [r.student_id, r.date, r.status, req.user.userId]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Attendance saved.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    client.release();
  }
};

const getSubjects = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subjects ORDER BY name');
    res.json({ success: true, subjects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const saveGrades = async (req, res) => {
  const client = await pool.connect();
  try {
    const { grades } = req.body;
    if (!grades || !grades.length) {
      return res.status(400).json({ success: false, message: 'No grades provided.' });
    }

    await client.query('BEGIN');

    for (const g of grades) {
      let gradeLetter = 'E';
      if (g.score >= 80)      gradeLetter = 'A';
      else if (g.score >= 70) gradeLetter = 'B+';
      else if (g.score >= 60) gradeLetter = 'B';
      else if (g.score >= 50) gradeLetter = 'C+';
      else if (g.score >= 40) gradeLetter = 'C';
      else if (g.score >= 30) gradeLetter = 'D+';
      else if (g.score >= 20) gradeLetter = 'D';

      const term = g.term || 'Term 1';
      const year = g.year || new Date().getFullYear();

      const existing = await client.query(
        `SELECT id FROM grades
         WHERE student_id = $1 AND subject_id = $2 AND term = $3 AND year = $4`,
        [g.student_id, g.subject_id, term, year]
      );

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE grades SET score = $1, grade = $2, remarks = $3
           WHERE student_id = $4 AND subject_id = $5 AND term = $6 AND year = $7`,
          [g.score, gradeLetter, g.remarks || null,
           g.student_id, g.subject_id, term, year]
        );
      } else {
        await client.query(
          `INSERT INTO grades (student_id, subject_id, score, grade, term, year, remarks)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [g.student_id, g.subject_id, g.score, gradeLetter,
           term, year, g.remarks || null]
        );
      }
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
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getClasses, getClassStudents,
  getAttendance, saveAttendance,
  getSubjects, saveGrades, getGrades
};