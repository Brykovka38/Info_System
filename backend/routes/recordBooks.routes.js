const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  getRecordBooks,
  saveRecordBook,
} = require("../controllers/recordBooks.controller");

router.get("/", authMiddleware, getRecordBooks);
router.post("/", authMiddleware, saveRecordBook);

module.exports = router;