const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  getPayments,
  createPayment,
  updatePayment,
  getPaymentsPeriod,
} = require("../controllers/payments.controller");

router.get("/", authMiddleware, getPayments);
router.get("/period", authMiddleware, getPaymentsPeriod);
router.post("/", authMiddleware, createPayment);
router.put("/:id", authMiddleware, updatePayment);

module.exports = router;