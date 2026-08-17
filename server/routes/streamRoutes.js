// server/routes/streamRoutes.js
const express = require("express");
const router =
  express.Router();
const {
  createStream,
  getStream,
  handleWebhook,
  endStream,
} = require("../controllers/streamController");
const {
  requireAuth,
  requireVerifiedCreator,
} = require("../middleware/authMiddleware");

// Public Livepeer Webhook Endpoint
router.post(
  "/webhook",
  handleWebhook,
);

// Protected Routes
router.post(
  "/create",
  requireAuth,
  requireVerifiedCreator,
  createStream,
);
router.get(
  "/:id",
  requireAuth,
  getStream,
);
router.put(
  "/:id/end",
  requireAuth,
  endStream,
);

module.exports =
  router;
