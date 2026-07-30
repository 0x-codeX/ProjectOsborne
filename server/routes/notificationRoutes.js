const express = require("express");
const router =
  express.Router();
const {
  requireAuth,
} = require("../middleware/authMiddleware");
const {
  getNotifications,
  markAllAsRead,
} = require("../controllers/notificationController");

// GET /api/notifications
router.get(
  "/",
  requireAuth,
  getNotifications,
);

// PUT /api/notifications/read
router.put(
  "/read",
  requireAuth,
  markAllAsRead,
);

module.exports =
  router;
