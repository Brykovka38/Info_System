const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  getStudents,
  createStudent,
  deleteStudent,
  getFreeStudents,
  getFreeStudentsForGroup,
  updateStudent,
  addParentToStudent,
  removeParentFromStudent,
  isTeacherGroup,
  getMyGroupStudents,
} = require("../controllers/students.controller");

router.get("/", authMiddleware, getStudents);
router.get("/free", authMiddleware, getFreeStudents);
router.get("/free-for-group", authMiddleware, getFreeStudentsForGroup);
router.post("/", authMiddleware, createStudent);
router.delete("/:id", authMiddleware, deleteStudent);
router.put("/:id", authMiddleware, updateStudent);
router.post("/:studentId/parents", authMiddleware, addParentToStudent);
router.delete("/:studentId/parents/:parentId", authMiddleware, removeParentFromStudent);
router.get("/my-group", authMiddleware, getMyGroupStudents);

module.exports = router;