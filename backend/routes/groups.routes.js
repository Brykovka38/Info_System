// const express = require("express");
// const router = express.Router();

// const {
//   getGroups,
//   deleteGroup,
//   createGroup,
//   unassignTeacherFromGroup,
//   assignTeacherToGroup,
//   updateGroup,
//   removeStudentFromGroup,
//   addStudentToGroup,
// } = require("../controllers/groups.controller");

// router.get("/", getGroups);
// router.delete("/:id", deleteGroup);
// router.post("/", createGroup);
// router.patch("/:groupId/unassign-teacher", unassignTeacherFromGroup);
// router.patch("/:groupId/assign-teacher", assignTeacherToGroup);
// router.put("/:id", updateGroup);
// router.post("/:groupId/students", addStudentToGroup);
// router.delete("/:groupId/students/:studentId", removeStudentFromGroup);

// module.exports = router;

const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  getGroups,
  deleteGroup,
  createGroup,
  unassignTeacherFromGroup,
  assignTeacherToGroup,
  updateGroup,
  removeStudentFromGroup,
  addStudentToGroup,
} = require("../controllers/groups.controller");

router.get("/", authMiddleware, getGroups);
router.delete("/:id", authMiddleware, deleteGroup);
router.post("/", authMiddleware, createGroup);
router.patch("/:groupId/unassign-teacher", authMiddleware, unassignTeacherFromGroup);
router.patch("/:groupId/assign-teacher", authMiddleware, assignTeacherToGroup);
router.put("/:id", authMiddleware, updateGroup);
router.post("/:groupId/students", authMiddleware, addStudentToGroup);
router.delete("/:groupId/students/:studentId", authMiddleware, removeStudentFromGroup);

module.exports = router;