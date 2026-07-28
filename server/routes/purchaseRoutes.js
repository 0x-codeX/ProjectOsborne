const express = require("express");
const router =
  express.Router();
const {
  requireAuth,
} = require("../middleware/authMiddleware");
const {
  verifyPayment,
} = require("../controllers/purchaseController");

// POST /api/purchases/verify
// Protected because only a logged-in user can claim a purchase
router.post(
  "/verify",
  requireAuth,
  verifyPayment,
);

module.exports =
  router;
