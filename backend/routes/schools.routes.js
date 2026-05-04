const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  getSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  getAllSchoolsForStudentEdit,
} = require("../controllers/schools.controller");

router.get("/", authMiddleware, getSchools);
router.post("/", authMiddleware, createSchool);
router.put("/:id", authMiddleware, updateSchool);
router.delete("/:id", authMiddleware, deleteSchool);
router.get("/for-student-edit", authMiddleware, getAllSchoolsForStudentEdit);

module.exports = router;