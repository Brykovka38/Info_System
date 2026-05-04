const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  getParents,
  deleteParent,
  createParent,
  updateParent,
  updateParentStudentLink,
  addStudentToParent,
  removeStudentFromParent,
} = require("../controllers/parents.controller");

router.get("/", authMiddleware, getParents);

router.post("/", authMiddleware, createParent);
router.delete("/:id", authMiddleware, deleteParent);
router.put("/:id", authMiddleware, updateParent);

router.put("/:parentId/students/:studentId", authMiddleware, updateParentStudentLink);
router.delete("/:parentId/students/:studentId", authMiddleware, removeStudentFromParent);
router.post("/:parentId/students", authMiddleware, addStudentToParent);

module.exports = router;