const express = require('express');
const router  = express.Router();
const {
  getAllStudents, getStudentById, createStudent,
  updateStudent, getAttendance, getFees, getGrades
} = require('../controllers/studentController');
const { protect, adminOnly, ownDataOnly } = require('../middleware/auth');

// All routes below require login
router.use(protect);

// Admin/teacher only
router.get('/',    adminOnly, getAllStudents);
router.post('/',   adminOnly, createStudent);

// Student can view their own data; admin/teacher can view any
router.get('/:id',            ownDataOnly, getStudentById);
router.put('/:id',            adminOnly,   updateStudent);
router.get('/:id/attendance', ownDataOnly, getAttendance);
router.get('/:id/fees',       ownDataOnly, getFees);
router.get('/:id/grades',     ownDataOnly, getGrades);

module.exports = router;
