const express = require("express");
const router =
  express.Router();
const {
  requireAuth,
} = require("../middleware/authMiddleware");
const {
  getDashboard,
  requestWithdrawal,
  getP2PRatePreview,
  getLiquidationQuote,
  executeLiquidation,
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

// GET /api/earnings/p2p-rate
// Fetches the cached 24-hr P2P rate for the dashboard preview UI
router.get(
  "/p2p-rate",
  requireAuth,
  getP2PRatePreview
);

// POST /api/earnings/quote
// Generates a 5-minute locked execution quote using the live P2P rate
router.post(
  "/quote",
  requireAuth,
  getLiquidationQuote
);

// POST /api/earnings/liquidate
// Executes the atomic balance swap between fiat/crypto ledgers
router.post(
  "/liquidate",
  requireAuth,
  executeLiquidation
);

module.exports =
  router;
