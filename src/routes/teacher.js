const express = require('express');
const router  = express.Router();
const {
  getClasses, getClassStudents,
  getAttendance, saveAttendance,
  getSubjects, saveGrades, getGrades
} = require('../controllers/teacherController');
const { protect } = require('../middleware/auth');

// All teacher routes require login
router.use(protect);

router.get('/classes',                getClasses);
router.get('/classes/:id/students',   getClassStudents);
router.get('/attendance',             getAttendance);
router.post('/attendance',            saveAttendance);
router.get('/subjects',               getSubjects);
router.post('/grades',                saveGrades);
router.get('/grades',                 getGrades);

module.exports = router;
