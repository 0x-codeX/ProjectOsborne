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
const Notification = require("../models/Notification");

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

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-read
// @access  Private
router.put("/mark-read", requireAuth, async (req, res) => { 
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true, read: true } }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Mark Read Error:", error);
    res.status(500).json({ message: "Failed to mark as read" });
  }
});

module.exports =
  router;
