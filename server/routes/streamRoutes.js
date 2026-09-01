// server/routes/streamRoutes.js
const express = require("express");
const router =
  express.Router();
const {
  createStream,
  getStream,
  endStream,
  goLive,
} = require("../controllers/streamController");
const {
  requireAuth,
  requireVerifiedCreator,
} = require("../middleware/authMiddleware");

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
router.put(
  "/:id/go-live",
  requireAuth,
  goLive,
);

module.exports =
  router;
