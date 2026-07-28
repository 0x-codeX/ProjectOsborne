const express = require("express");
const router =
  express.Router();
const {
  requestWithdrawal,
} = require("../controllers/withdrawalController");
const {
  requireAuth,
} = require("../middleware/authMiddleware"); // Your auth layer

console.log(
  "DEBUG IMPORTS:",
  {
    requireAuth,
    requestWithdrawal,
  },
);
// POST /api/withdraw
router.post(
  "/",
  requireAuth,
  requestWithdrawal,
);

module.exports =
  router;
