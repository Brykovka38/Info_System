const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  getLessons,
  createLesson,
  getStudentsForGroup,
  getLessonAttendance,
  getStudentHistory,
  createAttendanceRecord,
  updateAttendanceRecord,
  updateLesson,
  deleteAttendanceRecord,
  deleteLesson,
  getActiveEnrollments,
} = require("../controllers/history.controller");

router.get("/lessons", authMiddleware, getLessons);
router.post("/lessons", authMiddleware, createLesson);
router.put("/lessons/:lessonId", authMiddleware, updateLesson);
router.delete("/lessons/:lessonId", authMiddleware, deleteLesson);

router.get("/groups/:groupId/students", authMiddleware, getStudentsForGroup);
router.get("/lessons/:lessonId/attendance", authMiddleware, getLessonAttendance);

router.get("/students", authMiddleware, getStudentHistory);
router.get("/enrollments", authMiddleware, getActiveEnrollments);

router.post("/attendance", authMiddleware, createAttendanceRecord);
router.put("/attendance/:attendanceId", authMiddleware, updateAttendanceRecord);
router.delete("/attendance/:attendanceId", authMiddleware, deleteAttendanceRecord);

module.exports = router;