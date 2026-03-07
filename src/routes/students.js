const express = require('express');
const router  = express.Router();
const {
  getAllStudents, getStudentById, createStudent,
  updateStudent, getAttendance, getFees, getGrades,
  getTeachers, registerTeacher, deleteTeacher, deleteStudent
} = require('../controllers/studentController');
const { protect, adminOnly, ownDataOnly } = require('../middleware/auth');

// All routes below require login
router.use(protect);

// ── Teacher management (admin only) ─────────────────────────
router.get('/teachers',          adminOnly, getTeachers);
router.post('/register-teacher', adminOnly, registerTeacher);
router.delete('/teachers/:id',   adminOnly, deleteTeacher);

// ── Student routes ───────────────────────────────────────────
router.get('/',    adminOnly, getAllStudents);
router.post('/',   adminOnly, createStudent);

router.get('/:id',            ownDataOnly, getStudentById);
router.put('/:id',            adminOnly,   updateStudent);
router.delete('/:id',         adminOnly,   deleteStudent);
router.get('/:id/attendance', ownDataOnly, getAttendance);
router.get('/:id/fees',       ownDataOnly, getFees);
router.get('/:id/grades',     ownDataOnly, getGrades);

module.exports = router;