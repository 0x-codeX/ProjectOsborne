const express = require("express");
const router =
  express.Router();
const {
  requireAuth,
} = require("../middleware/authMiddleware");
const {
  getNotifications,
  markAllAsRead,
  getUnreadCount, // IRONCLAD: Added for layout badge
} = require("../controllers/notificationController");

// IRONCLAD: Must be above dynamic routes if you ever add them
router.get(
  "/unread-count",
  requireAuth,
  getUnreadCount,
);

router.get(
  "/",
  requireAuth,
  getNotifications,
);
router.put(
  "/read",
  requireAuth,
  markAllAsRead,
);

module.exports =
  router;
