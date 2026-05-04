// const express = require("express");
// const router = express.Router();

// const { getUsers, 
//     updateProfile,
//     updatePassword,
//     changeTemporaryPassword
//     } = require("../controllers/users.controller");

// router.get("/", getUsers);
// router.put("/:id/profile", updateProfile);
// router.put("/:id/password", updatePassword);
// router.put("/:id/change-temporary-password", changeTemporaryPassword);

// module.exports = router;

const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  getUsers,
  updateProfile,
  updatePassword,
  changeTemporaryPassword,
} = require("../controllers/users.controller");

router.get("/", authMiddleware, getUsers);
router.put("/:id/profile", authMiddleware, updateProfile);
router.put("/:id/password", authMiddleware, updatePassword);
router.put("/:id/change-temporary-password", authMiddleware, changeTemporaryPassword);

module.exports = router;