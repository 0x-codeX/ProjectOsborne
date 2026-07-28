const express = require("express");
const router =
  express.Router();
const {
  requireAuth,
} = require("../middleware/authMiddleware");
const {
  getDashboard,
  requestWithdrawal,
} = require("../controllers/earningsController");

// GET /api/earnings/dashboard
// Fetch the user's balance, withdrawal history, and recent sales
router.get(
  "/dashboard",
  requireAuth,
  getDashboard,
);

// POST /api/earnings/withdraw
// Lock in a pending withdrawal request and deduct the internal balance
router.post(
  "/withdraw",
  requireAuth,
  requestWithdrawal,
);

module.exports =
  router;
