const express = require("express");
const router =
  express.Router();
const {
  requireAuth,
} = require("../middleware/authMiddleware");
const {
  verifyPayment,
  getFanDashboard,
  getCryptoQuote,
  getLiveExchangeRates,
  getLiquidationQuote,
} = require("../controllers/purchaseController");

// POST /api/purchases/verify
// Protected because only a logged-in user can claim a purchase
router.post(
  "/verify",
  requireAuth,
  verifyPayment,
);
router.post(
  "/crypto-quote",
  requireAuth,
  getCryptoQuote,
);

// GET /api/purchases/dashboard
router.get("/dashboard", requireAuth, getFanDashboard);

router.get(
  "/exchange-rates",
  getLiveExchangeRates,
);



router.post(
  "/earnings/quote",
  requireAuth,
  getLiquidationQuote,
);

module.exports =
  router;
