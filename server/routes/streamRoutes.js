// server/routes/streamRoutes.js
const express = require("express");
const router =
  express.Router();
const {
  createStream,
  getStream,
  endStream,
  proxyWhipRequest,
  handleLivepeerWebhook,
} = require("../controllers/streamController");
const {
  requireAuth,
  requireVerifiedCreator,
} = require("../middleware/authMiddleware");

// Public Livepeer Webhook Endpoint


// Protected Routes
router.post(
  "/create",
  requireAuth,
  requireVerifiedCreator,
  createStream,
);
router.post(
  "/webhook",
  handleLivepeerWebhook,
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
router.post(
  "/:id/whip",
  requireAuth,
  proxyWhipRequest,
);

module.exports =
  router;
