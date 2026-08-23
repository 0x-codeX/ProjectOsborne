// server/routes/ageVerificationRoutes.js
const express = require("express");
const router =
  express.Router();
const {
  startDiditSession,
  getStatus,
  diditWebhook,
} = require("../controllers/ageVerificationController");
const {
  requireAuth,
} = require("../middleware/authMiddleware");

// Protected fan routes
router.post(
  "/start",
  requireAuth,
  startDiditSession,
);
router.get(
  "/status",
  requireAuth,
  getStatus,
);

// Public webhook route (Do NOT put requireAuth on this)
router.post(
  "/webhook",
  express.json(),
  diditWebhook,
);

module.exports =
  router;
