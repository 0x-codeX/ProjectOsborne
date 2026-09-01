const Notification = require("../models/Notification");

// GET /api/notifications
exports.getNotifications =
  async (
    req,
    res,
  ) => {
    try {
      const notifications =
        await Notification.find(
          {
            recipient:
              req
                .user
                ._id,
          },
        )
          .populate(
            "sender",
            "username profileImage isLive currentStreamId",
          )
          .sort(
            {
              createdAt:
                -1,
            },
          )
          .limit(
            50,
          );

      res
        .status(
          200,
        )
        .json(
          notifications,
        );
    } catch (error) {
      console.error(
        "Error fetching notifications:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error",
          },
        );
    }
  };

// GET /api/notifications/unread-count
exports.getUnreadCount =
  async (
    req,
    res,
  ) => {
    try {
      const count =
        await Notification.countDocuments(
          {
            recipient:
              req
                .user
                ._id,
            isRead: false,
          },
        );
      res
        .status(
          200,
        )
        .json(
          {
            unreadCount:
              count,
          },
        );
    } catch (error) {
      console.error(
        "Error fetching unread count:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error",
          },
        );
    }
  };

// PUT /api/notifications/read
exports.markAllAsRead =
  async (
    req,
    res,
  ) => {
    try {
      await Notification.updateMany(
        {
          recipient:
            req
              .user
              ._id,
          isRead: false,
        },
        {
          $set: {
            isRead: true,
          },
        },
      );
      res
        .status(
          200,
        )
        .json(
          {
            message:
              "Marked all as read",
          },
        );
    } catch (error) {
      console.error(
        "Error updating notifications:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error",
          },
        );
    }
  };
