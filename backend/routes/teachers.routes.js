const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  getTeachers,
  deleteTeacher,
  createTeacher,
  updateTeacher,
} = require("../controllers/teachers.controller");

router.get("/", authMiddleware, getTeachers);
router.post("/", authMiddleware, createTeacher);
router.put("/:id", authMiddleware, updateTeacher);
router.delete("/:id", authMiddleware, deleteTeacher);

module.exports = router;