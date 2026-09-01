const mongoose = require("mongoose");
const {
  ethers,
} = require("ethers");
const User = require("../models/User");
const Content = require("../models/Content");
const Purchase = require("../models/Purchase");
const Message = require("../models/Message");
const Ticket = require("../models/Ticket");
const Withdrawal = require("../models/Withdrawal");
const AdminApproval = require("../models/AdminApproval");
const SystemLog = require("../models/SystemLog");
const ClearingRequest = require("../models/ClearingRequest");
const {
  sendAccountsCryptoPayoutEmail,
} = require("../utils/emailService");
const Transaction = require("../models/Transaction");
const SystemState = require("../models/SystemState");
const Dispute = require("../models/Dispute");


// =========================================================
// HELPER FUNCTION: SYSTEM AUDIT LOGGER
// =========================================================
exports.logAdminAction =
  async (
    adminId,
    action,
    targetUserId = null,
    details = "",
  ) => {
    try {
      if (
        !adminId
      )
        return; // Prevent crashes if req.user is somehow missing
      await SystemLog.create(
        {
          admin:
            adminId,
          action,
          targetUser:
            targetUserId,
          details,
        },
      );
    } catch (error) {
      console.error(
        "Failed to write to System Log:",
        error,
      ); // Fails silently
    }
  };

// =========================================================
// SEARCH & FORENSICS ROUTES
// =========================================================

// GET /api/admin/users/search
exports.searchUsers =
  async (
    req,
    res,
  ) => {
    try {
      const {
        query,
      } =
        req.query;
      if (
        !query
      )
        return res.json(
          {
            users:
              [],
            items:
              [],
          },
        );

      const searchRegex =
        new RegExp(
          query,
          "i",
        );

      const userQuery =
        {
          $or: [
            {
              username:
                searchRegex,
            },
            {
              email:
                searchRegex,
            },
            {
              phone:
                searchRegex,
            },
          ],
        };

      if (
        mongoose.Types.ObjectId.isValid(
          query.trim(),
        )
      ) {
        userQuery.$or.push(
          {
            _id: query.trim(),
          },
        );
      }

      const users =
        await User.find(
          userQuery,
        )
          .select(
            "username email phone role kycStatus createdAt profileImage isSuspended",
          )
          .limit(
            20,
          );

      let items =
        [];
      if (
        mongoose.Types.ObjectId.isValid(
          query.trim(),
        )
      ) {
        const contentMatch =
          await Content.findById(
            query.trim(),
          ).populate(
            "creator",
            "username email profileImage role",
          );
        if (
          contentMatch
        )
          items.push(
            {
              ...contentMatch.toObject(),
              searchType:
                "CONTENT",
            },
          );

        const messageMatch =
          await Message.findById(
            query.trim(),
          ).populate(
            "sender",
            "username email profileImage role",
          );
        if (
          messageMatch
        ) {
          const msgObj =
            messageMatch.toObject();
          msgObj.creator =
            msgObj.sender;
          items.push(
            {
              ...msgObj,
              searchType:
                "MESSAGE",
            },
          );
        }
      }

      // --- LOG THE SEARCH ACTION ---
      await exports.logAdminAction(
        req
          .user
          ._id,
        "SYSTEM_SEARCH",
        null,
        `Searched database for query: "${query}"`,
      );

      res.json(
        {
          users,
          items,
        },
      );
    } catch (error) {
      console.error(
        "Search Error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error searching",
          },
        );
    }
  };

// GET /api/admin/item/360/:itemId
exports.getItem360 =
  async (
    req,
    res,
  ) => {
    try {
      const {
        itemId,
      } =
        req.params;
      if (
        !mongoose.Types.ObjectId.isValid(
          itemId,
        )
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Invalid Item ID",
            },
          );

      let item =
        await Content.findById(
          itemId,
        ).populate(
          "creator",
          "username email profileImage role",
        );
      let itemType =
        "CONTENT";

      if (
        !item
      ) {
        item =
          await Message.findById(
            itemId,
          ).populate(
            "sender",
            "username email profileImage role",
          );
        itemType =
          "MESSAGE";
        if (
          item
        ) {
          item =
            item.toObject();
          item.creator =
            item.sender;
        }
      }

      if (
        !item
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Item not found in Content or Messages.",
            },
          );

      const purchases =
        await Purchase.find(
          {
            $or: [
              {
                content:
                  itemId,
              },
              {
                message:
                  itemId,
              },
            ],
            status:
              "completed",
          },
        )
          .populate(
            "user",
            "username email profileImage role",
          )
          .sort(
            {
              createdAt:
                -1,
            },
          );

      // --- LOG THE FORENSIC VIEW ---
      await exports.logAdminAction(
        req
          .user
          ._id,
        "VIEW_ITEM_FORENSICS",
        null,
        `Accessed 360 forensics for ${itemType} ID: ${itemId}`,
      );

      return res
        .status(
          200,
        )
        .json(
          {
            item,
            itemType,
            purchases,
          },
        );
    } catch (error) {
      console.error(
        "Item 360 Error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error fetching item details.",
          },
        );
    }
  };

exports.getUser360 =
  async (
    req,
    res,
  ) => {
    try {
      const {
        userId,
      } =
        req.params;

      const user =
        await User.findById(
          userId,
        ).select(
          "-password",
        );
      if (
        !user
      ) {
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "User profile not found.",
            },
          );
      }

      const uploads =
        await Content.find(
          {
            creator:
              userId,
          },
        ).sort(
          {
            createdAt:
              -1,
          },
        );

      const purchases =
        await Purchase.find(
          {
            $or: [
              {
                user: userId,
              },
              {
                creator:
                  userId,
              },
            ],
            status:
              "completed",
          },
        )
          .populate(
            "creator",
            "username email",
          )
          .populate(
            "user",
            "username email",
          )
          .sort(
            {
              createdAt:
                -1,
            },
          );

      const disputes =
        await Dispute.find(
          {
            creator:
              userId,
          },
        ).sort(
          {
            createdAt:
              -1,
          },
        );

      // 1. CALCULATE METRICS FIRST
      let totalFinancialVolume = 0;
      purchases.forEach(
        (
          txn,
        ) => {
          const amount =
            Number(
              txn.amountPaid ||
                0,
            );
          if (
            user.role ===
            "creator"
          ) {
            if (
              txn.creator &&
              txn.creator._id.toString() ===
                userId
            ) {
              totalFinancialVolume +=
                amount;
            }
          } else {
            if (
              txn.user &&
              txn.user._id.toString() ===
                userId
            ) {
              totalFinancialVolume +=
                amount;
            }
          }
        },
      );

      const totalMessagesSent =
        await Message.countDocuments(
          {
            $or: [
              {
                sender:
                  userId,
              },
              {
                senderId:
                  userId,
              },
            ],
          },
        );

      // 2. LOG THE ACTION
      await exports.logAdminAction(
        req
          .user
          ._id,
        "VIEW_USER_360",
        userId,
        `Accessed User 360 dashboard for ${user.username || user.email}`,
      );

      // 3. SEND THE RESPONSE LAST
      res
        .status(
          200,
        )
        .json(
          {
            user,
            activitySummary:
              {
                totalFinancialVolume,
                totalUploads:
                  uploads.length,
                totalPurchases:
                  purchases.length,
                totalMessagesSent,
                totalDisputes:
                  disputes.length, // <-- EXPOSED FOR ADMIN AUDIT
              },
            disputes,
            uploads:
              uploads.map(
                (
                  post,
                ) => ({
                  _id: post._id,
                  title:
                    post.title,
                  createdAt:
                    post.createdAt,
                  price:
                    post.priceInUSDT,
                  mediaType:
                    post.fileType,
                  mediaUrl:
                    post.fileKey,
                }),
              ),
            purchases:
              purchases.map(
                (
                  p,
                ) => ({
                  _id: p._id,
                  createdAt:
                    p.createdAt,
                  type: p.purchaseType,
                  recipientName:
                    p
                      .creator
                      ?.username ||
                    "Platform",
                  contentId:
                    p.content ||
                    "N/A",
                  amount:
                    p.amountPaid,
                  paymentMethod:
                    p.paymentMethod ||
                    "FIAT",
                }),
              ),
          },
        );
    } catch (error) {
      console.error(
        "User360 Compilation Error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error compiling User 360 details.",
          },
        );
    }
  };

// =========================================================
// STAFF & ROLE MANAGEMENT
// =========================================================

exports.promoteToGodAdmin =
  async (
    req,
    res,
  ) => {
    try {
      const {
        targetUserId,
      } =
        req.body;
      const godCount =
        await User.countDocuments(
          {
            role: "GOD_ADMIN",
          },
        );
      if (
        godCount >=
        2
      )
        return res
          .status(
            403,
          )
          .json(
            {
              message:
                "Invariant Violation: Maximum limit of 2 God Admins reached.",
            },
          );

      const targetUser =
        await User.findById(
          targetUserId,
        );
      if (
        !targetUser
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "User not found",
            },
          );

      targetUser.role =
        "GOD_ADMIN";
      await targetUser.save();

      // --- LOG THE PROMOTION ---
      await exports.logAdminAction(
        req
          .user
          ._id,
        "ELEVATED_TO_GOD_ADMIN",
        targetUserId,
        `Promoted ${targetUser.username} to GOD_ADMIN`,
      );

      res.json(
        {
          message: `Successfully elevated ${targetUser.username || targetUser.email} to GOD_ADMIN.`,
        },
      );
    } catch (error) {
      console.error(
        "Error promoting God Admin:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Promotion failed",
          },
        );
    }
  };

exports.assignStaffRole =
  async (
    req,
    res,
  ) => {
    try {
      const {
        targetUserId,
        newRole,
      } =
        req.body;
      const godAdminId =
        req.user._id.toString();

      const validRoles =
        [
          "fan",
          "creator",
          "MODERATE_ADMIN",
          "SUPER_ADMIN",
          "GOD_ADMIN",
        ];
      if (
        !validRoles.includes(
          newRole,
        )
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Invalid role specified.",
            },
          );

      const targetUser =
        await User.findById(
          targetUserId,
        );
      if (
        !targetUser
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "No user found with that ID.",
            },
          );

      if (
        targetUser._id.toString() ===
        godAdminId
      )
        return res
          .status(
            403,
          )
          .json(
            {
              message:
                "Action forbidden: You cannot alter your own access.",
            },
          );

      if (
        targetUser.role ===
        "GOD_ADMIN"
      ) {
        const godCount =
          await User.countDocuments(
            {
              role: "GOD_ADMIN",
            },
          );
        if (
          godCount <=
          1
        )
          return res
            .status(
              403,
            )
            .json(
              {
                message:
                  "Cannot remove the last standing God Admin.",
              },
            );
      }

      targetUser.role =
        newRole;
      await targetUser.save();

      // --- LOG THE ROLE ASSIGNMENT ---
      await exports.logAdminAction(
        req
          .user
          ._id,
        "ASSIGNED_STAFF_ROLE",
        targetUserId,
        `Reassigned role from ${targetUser.role} to ${newRole}`,
      );

      res
        .status(
          200,
        )
        .json(
          {
            message: `${targetUser.username} reassigned to ${newRole.replace("_", " ")}`,
            user: targetUser,
          },
        );
    } catch (error) {
      console.error(
        "Failed to assign role:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error assigning role",
          },
        );
    }
  };

// =========================================================
// MODERATION & TICKETS
// =========================================================

exports.getTickets =
  async (
    req,
    res,
  ) => {
    try {
      const tickets =
        await Ticket.find()
          .populate(
            "userId",
            "username email",
          )
          .sort(
            {
              createdAt:
                -1,
            },
          );
      const formattedTickets =
        tickets.map(
          (
            ticket,
          ) => ({
            _id: ticket._id,
            subject:
              ticket.subject,
            message:
              ticket.message,
            status:
              ticket.status,
            createdAt:
              ticket.createdAt,
            name: ticket.userId
              ? ticket
                  .userId
                  .username
              : "Unknown User",
            email:
              ticket.userId
                ? ticket
                    .userId
                    .email
                : "No Email",
          }),
        );
      res
        .status(
          200,
        )
        .json(
          formattedTickets,
        );
    } catch (error) {
      console.error(
        "Failed to fetch tickets:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error fetching tickets",
          },
        );
    }
  };

exports.updateTicketStatus =
  async (
    req,
    res,
  ) => {
    try {
      const {
        ticketId,
        status,
      } =
        req.body;

      const ticket =
        await Ticket.findById(
          ticketId,
        );
      if (
        !ticket
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Ticket not found",
            },
          );

      ticket.status =
        status;
      if (
        status ===
        "RESOLVED"
      ) {
        ticket.resolvedBy =
          req.user._id;
        ticket.resolvedAt =
          Date.now();
      }
      await ticket.save();

      // --- LOG THE TICKET UPDATE ---
      await exports.logAdminAction(
        req
          .user
          ._id,
        "UPDATED_TICKET_STATUS",
        ticket.userId,
        `Set ticket ${ticket._id} status to ${status}`,
      );

      res.json(
        {
          message: `Ticket status updated to ${status}`,
        },
      );
    } catch (error) {
      console.error(
        "Error updating ticket:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to update ticket status",
          },
        );
    }
  };

exports.toggleUserStatus =
  async (
    req,
    res,
  ) => {
    try {
      const {
        userId,
      } =
        req.params;
      const {
        status,
      } =
        req.body;

      const user =
        await User.findById(
          userId,
        );
      if (
        !user
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "User not found",
            },
          );

      user.isSuspended =
        status ===
        "suspended";
      await user.save();

      // --- LOG THE SUSPENSION ---
      await exports.logAdminAction(
        req
          .user
          ._id,
        "TOGGLED_USER_SUSPENSION",
        userId,
        `Account suspended status set to: ${user.isSuspended}`,
      );

      res
        .status(
          200,
        )
        .json(
          {
            message: `User status updated successfully`,
            isSuspended:
              user.isSuspended,
          },
        );
    } catch (error) {
      console.error(
        "Failed to toggle user status:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error updating status",
          },
        );
    }
  };

// =========================================================
// PAYOUTS
//=========================================================

exports.getPayouts =
  async (
    req,
    res,
  ) => {
    try {
      const {
        status,
      } =
        req.query;
      const payouts =
        await Withdrawal.find(
          {
            status:
              status ||
              "PENDING",
          },
        )
          .populate(
            "userId",
            "username email",
          )
          .sort(
            {
              createdAt:
                -1,
            },
          );

      const formattedPayouts =
        payouts.map(
          (
            p,
          ) => ({
            _id: p._id,
            amount:
              p.amount,
            status:
              p.status,
            createdAt:
              p.createdAt,
            bankName:
              p.bankName,
            accountNumber:
              p.accountNumber,
            creatorName:
              p.userId
                ? p
                    .userId
                    .username
                : "Unknown Creator",
            creatorEmail:
              p.userId
                ? p
                    .userId
                    .email
                : "No Email",
          }),
        );
      res
        .status(
          200,
        )
        .json(
          formattedPayouts,
        );
    } catch (error) {
      console.error(
        "Failed to fetch payouts:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error fetching payouts",
          },
        );
    }
  };

exports.processPayoutAction =
  async (
    req,
    res,
  ) => {
    try {
      const {
        withdrawalId,
        action,
      } =
        req.body;
      const adminUser =
        req.user;

      const withdrawal =
        await Withdrawal.findById(
          withdrawalId,
        );
      if (
        !withdrawal
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Withdrawal request not found",
            },
          );

      if (
        action ===
        "REJECT"
      ) {
        withdrawal.status =
          "REJECTED";
      } else if (
        action ===
        "MARK_REVIEWED"
      ) {
        withdrawal.status =
          "REVIEWED";
      } else if (
        action ===
        "APPROVE_PAYOUT"
      ) {
        if (
          adminUser.role !==
          "GOD_ADMIN"
        )
          return res
            .status(
              403,
            )
            .json(
              {
                message:
                  "Only God Admins can execute payments",
              },
            );
        withdrawal.status =
          "COMPLETED";
      } else {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Invalid action",
            },
          );
      }

      await withdrawal.save();

      // --- LOG THE PAYOUT ACTION ---
      await exports.logAdminAction(
        req
          .user
          ._id,
        "PROCESSED_PAYOUT",
        withdrawal.userId,
        `Performed ${action} on withdrawal ${withdrawalId} for amount ${withdrawal.amount}`,
      );

      res
        .status(
          200,
        )
        .json(
          {
            message: `Payout updated to ${withdrawal.status}`,
          },
        );
    } catch (error) {
      console.error(
        "Failed to process payout action:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error processing action",
          },
        );
    }
  };

exports.getAdmins =
  async (
    req,
    res,
  ) => {
    try {
      const admins =
        await User.find(
          {
            role: {
              $in: [
                "MODERATE_ADMIN",
                "SUPER_ADMIN",
                "GOD_ADMIN",
              ],
            },
          },
        ).select(
          "-password",
        );
      res
        .status(
          200,
        )
        .json(
          admins,
        );
    } catch (error) {
      console.error(
        "Failed to fetch admins:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error fetching staff list",
          },
        );
    }
  };

// =========================================================
// MAKER-CHECKER (MANUAL ACCESS WORKFLOW)
// =========================================================

exports.requestManualUnlock =
  async (
    req,
    res,
  ) => {
    try {
      const {
        itemId,
      } =
        req.params;
      const {
        userIdOrEmail,
        type,
        justification,
      } =
        req.body;
      const adminId =
        req
          .user
          ._id;

      const targetUser =
        await User.findOne(
          {
            $or: [
              {
                _id: userIdOrEmail.match(
                  /^[0-9a-fA-F]{24}$/,
                )
                  ? userIdOrEmail
                  : null,
              },
              {
                email:
                  userIdOrEmail,
              },
            ],
          },
        );

      if (
        !targetUser
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Target Fan not found.",
            },
          );

      const existingReq =
        await AdminApproval.findOne(
          {
            targetUser:
              targetUser._id,
            item: itemId,
            status:
              "PENDING",
          },
        );
      if (
        existingReq
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "A pending request already exists for this user and item.",
            },
          );

      const newApproval =
        new AdminApproval(
          {
            targetUser:
              targetUser._id,
            item: itemId,
            requestedBy:
              adminId,
            accessType:
              type,
            justification:
              justification,
          },
        );
      await newApproval.save();

      // --- LOG THE MAKER REQUEST ---
      await exports.logAdminAction(
        adminId,
        "REQUESTED_MANUAL_UNLOCK",
        targetUser._id,
        `Requested ${type} access for item ${itemId}. Justification: "${justification}"`,
      );

      res
        .status(
          200,
        )
        .json(
          {
            message:
              "Request submitted to Super Admin queue.",
          },
        );
    } catch (error) {
      console.error(
        "Error creating unlock request:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error creating request.",
          },
        );
    }
  };

exports.getPendingApprovals =
  async (
    req,
    res,
  ) => {
    try {
      if (
        req
          .user
          .role !==
          "SUPER_ADMIN" &&
        req
          .user
          .role !==
          "GOD_ADMIN"
      ) {
        return res
          .status(
            403,
          )
          .json(
            {
              message:
                "Unauthorized. Super Admins only.",
            },
          );
      }

      const approvals =
        await AdminApproval.find(
          {
            status:
              "PENDING",
          },
        )
          .populate(
            "targetUser",
            "username email _id",
          )
          .populate(
            "item",
            "title _id",
          )
          .populate(
            "requestedBy",
            "username _id",
          )
          .sort(
            {
              createdAt:
                -1,
            },
          );

      res
        .status(
          200,
        )
        .json(
          {
            approvals,
          },
        );
    } catch (error) {
      console.error(
        "Error fetching approvals:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error fetching approvals.",
          },
        );
    }
  };

exports.processApproval =
  async (
    req,
    res,
  ) => {
    try {
      if (
        req
          .user
          .role !==
          "SUPER_ADMIN" &&
        req
          .user
          .role !==
          "GOD_ADMIN"
      )
        return res
          .status(
            403,
          )
          .json(
            {
              message:
                "Unauthorized.",
            },
          );

      const {
        action,
      } =
        req.body;
      const {
        approvalId,
      } =
        req.params;

      // We populate the Moderate Admin ('requestedBy') here so we can inject their name into the Super Admin's log
      const approval =
        await AdminApproval.findById(
          approvalId,
        ).populate(
          "requestedBy",
          "username email",
        );

      if (
        !approval
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Approval request not found.",
            },
          );
      if (
        approval.status !==
        "PENDING"
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Request already processed.",
            },
          );

      if (
        action ===
        "APPROVE"
      ) {
        const contentItem =
          await Content.findById(
            approval.item,
          );
        if (
          !contentItem
        )
          return res
            .status(
              404,
            )
            .json(
              {
                message:
                  "The target content no longer exists.",
              },
            );

        const existingPurchase =
          await Purchase.findOne(
            {
              user: approval.targetUser,
              content:
                approval.item,
              status:
                "completed",
            },
          );

        if (
          !existingPurchase
        ) {
          const uniqueManualHash = `MANUAL_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

          const newPurchase =
            new Purchase(
              {
                user: approval.targetUser,
                creator:
                  contentItem.creator,
                content:
                  approval.item,
                amountPaid: 0,
                paymentMethod:
                  "MANUAL",
                txHash:
                  uniqueManualHash,
                purchaseType:
                  approval.accessType ||
                  "PPV",
                status:
                  "completed",
              },
            );
          await newPurchase.save();
        }
      }

      approval.status =
        action ===
        "APPROVE"
          ? "APPROVED"
          : "REJECTED";
      approval.processedBy =
        req.user._id;
      approval.processedAt =
        new Date();
      await approval.save();

      // --- LOG THE CHECKER ACTION (Mentioning both Admins) ---
      await exports.logAdminAction(
        req
          .user
          ._id, // The Super Admin executing the request
        action ===
          "APPROVE"
          ? "APPROVED_MANUAL_UNLOCK"
          : "REJECTED_MANUAL_UNLOCK",
        approval.targetUser,
        `Super Admin processed access request originally initiated by Moderate Admin (${approval.requestedBy.username}). Item ID: ${approval.item}`,
      );

      res
        .status(
          200,
        )
        .json(
          {
            message: `Request successfully ${action.toLowerCase()}d.`,
          },
        );
    } catch (error) {
      console.error(
        "Error processing approval:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error processing approval.",
          },
        );
    }
  };

// =========================================================
// SYSTEM LOGS (FETCH AUDIT TRAIL)
// =========================================================

exports.getSystemLogs =
  async (
    req,
    res,
  ) => {
    try {
      if (
        req
          .user
          .role !==
          "SUPER_ADMIN" &&
        req
          .user
          .role !==
          "GOD_ADMIN"
      ) {
        return res
          .status(
            403,
          )
          .json(
            {
              message:
                "Access Denied: Super Admin clearance required.",
            },
          );
      }

      const logs =
        await SystemLog.find()
          .populate(
            "admin",
            "username email role",
          )
          .populate(
            "targetUser",
            "username email",
          )
          .sort(
            {
              createdAt:
                -1,
            },
          )
          .limit(
            100,
          );

      res
        .status(
          200,
        )
        .json(
          logs,
        );
    } catch (error) {
      console.error(
        "Failed to fetch system logs:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error fetching logs.",
          },
        );
    }
  };

// 1. Moderate Admin Initiates Clearing Request
exports.initiateClearing =
  async (
    req,
    res,
  ) => {
    try {
      const {
        creatorId,
        amount,
        currency,
        direction,
        depositConfirmed,
      } =
        req.body;
      const adminId =
        req
          .user
          ._id;

      if (
        !depositConfirmed
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "You must confirm deposit verification before submitting.",
            },
          );
      }

      const creator =
        await User.findById(
          creatorId,
        );
      const wallet =
        await Wallet.findOne(
          {
            creator:
              creatorId,
          },
        );

      if (
        !creator ||
        !wallet
      ) {
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Creator or Wallet not found.",
            },
          );
      }

      const payoutAddress =
        creator.payoutAddress ||
        creator.walletAddress ||
        "Bank Account";

      const clearingReq =
        await ClearingRequest.create(
          {
            creator:
              creatorId,
            wallet:
              wallet._id,
            amount,
            currency,
            direction,
            payoutMethod:
              creator.payoutMethod ||
              "bank",
            payoutAddress,
            initiatedBy:
              adminId,
            depositConfirmedByAdmin: true,
            status:
              "PENDING_APPROVAL",
          },
        );

      await SystemLog.create(
        {
          adminId,
          action:
            "INITIATED_CLEARING_REQUEST",
          targetUserId:
            creatorId,
          details: `Initiated clearing of ${amount} ${currency} for ${creator.username}`,
        },
      );

      res
        .status(
          201,
        )
        .json(
          {
            message:
              "Clearing request initiated for Super Admin approval.",
            clearingReq,
          },
        );
    } catch (error) {
      console.error(
        "Initiate Clearing Error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to initiate clearing request.",
          },
        );
    }
  };

// 2. Super Admin Approves Clearing Request (or God Admin)
exports.approveClearing =
  async (
    req,
    res,
  ) => {
    const systemState =
      await SystemState.findOne(
        {
          key: "MASTER_STATE",
        },
      );

    if (
      systemState &&
      systemState.payoutsLocked
    ) {
      return res
        .status(
          503,
        )
        .json(
          {
            message:
              "CRITICAL ALERT: Treasury operations are currently locked by the automated security protocol. Contact Engineering.",
          },
        );
    }

    try {
      const {
        requestId,
        depositConfirmed,
      } =
        req.body;
      const adminId =
        req
          .user
          ._id;
      const adminRole =
        req
          .user
          .adminRole;

      if (
        adminRole ===
        "MODERATE_ADMIN"
      ) {
        return res
          .status(
            403,
          )
          .json(
            {
              message:
                "Forbidden: Moderate Admins cannot approve clearings.",
            },
          );
      }
      if (
        !depositConfirmed
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Confirmation checkbox required.",
            },
          );
      }

      const clearingReq =
        await ClearingRequest.findById(
          requestId,
        )
          .populate(
            "creator",
          )
          .populate(
            "wallet",
          );
      if (
        !clearingReq ||
        clearingReq.status !==
          "PENDING_APPROVAL"
      ) {
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Pending clearing request not found.",
            },
          );
      }

      // Four-Eyes Rule
      if (
        clearingReq.initiatedBy.toString() ===
          adminId.toString() &&
        adminRole !==
          "GOD_ADMIN"
      ) {
        return res
          .status(
            403,
          )
          .json(
            {
              message:
                "Four-Eyes Violation: You cannot approve a request you initiated.",
            },
          );
      }

      const wallet =
        clearingReq.wallet;
      const creator =
        clearingReq.creator;

      let txStatus =
        "PENDING"; // Default for Fiat (waits for CSV batch)
      let signatureMetadata =
        {};

      // --- CRYPTO LIQUIDITY CHECK & VOUCHER GENERATION ---
      if (
        clearingReq.payoutMethod ===
        "crypto"
      ) {
        const provider =
          new ethers.JsonRpcProvider(
            process
              .env
              .POLYGON_RPC_URL,
          );
        const usdtContract =
          new ethers.Contract(
            process
              .env
              .USDT_ADDRESS,
            [
              "function balanceOf(address) view returns (uint256)",
            ],
            provider,
          );

        // 1. Calculate Effective Liquidity
        const rawBalance =
          await usdtContract.balanceOf(
            process
              .env
              .NIPPY_TREASURY_PAYOUT,
          );
        const actualBalanceUSDT =
          Number(
            ethers.formatUnits(
              rawBalance,
              6,
            ),
          );

        const outstandingClaims =
          await Transaction.aggregate(
            [
              {
                $match:
                  {
                    status:
                      "PENDING_CLAIM",
                    currency:
                      "USDT",
                  },
              },
              {
                $group:
                  {
                    _id: null,
                    totalLocked:
                      {
                        $sum: "$amount",
                      },
                  },
              },
            ],
          );

        const lockedLiquidity =
          outstandingClaims.length >
          0
            ? outstandingClaims[0]
                .totalLocked
            : 0;
        const effectiveAvailable =
          actualBalanceUSDT -
          lockedLiquidity;

        if (
          clearingReq.amount >
          effectiveAvailable
        ) {
          return res
            .status(
              400,
            )
            .json(
              {
                message: `Insufficient treasury liquidity. Only ${effectiveAvailable.toFixed(2)} USDT remains uncommitted. Top up the smart contract.`,
              },
            );
        }

        // 2. Generate EIP-712 Voucher with 23-Hour Time-Bomb
        const walletSigner =
          new ethers.Wallet(
            process
              .env
              .BACKEND_SIGNER_PRIVATE_KEY,
          );
        const nonce =
          ethers.hexlify(
            ethers.randomBytes(
              32,
            ),
          );
        const amountInWei =
          ethers.parseUnits(
            clearingReq.amount.toString(),
            6,
          );

        // Calculate Unix timestamp for 23 hours from now
        const deadline =
          Math.floor(
            Date.now() /
              1000,
          ) +
          23 *
            60 *
            60;

        const domain =
          {
            name: "NippyPayouts",
            version:
              "1",
            chainId:
              parseInt(
                process
                  .env
                  .POLYGON_CHAIN_ID ||
                  "80002",
              ),
            verifyingContract:
              process
                .env
                .NIPPY_TREASURY_PAYOUT,
          };

        const types =
          {
            Claim:
              [
                {
                  name: "creator",
                  type: "address",
                },
                {
                  name: "amount",
                  type: "uint256",
                },
                {
                  name: "nonce",
                  type: "bytes32",
                },
                {
                  name: "deadline",
                  type: "uint256",
                }, // <-- INJECTED DEADLINE
              ],
          };

        const message =
          {
            creator:
              creator.payoutAddress ||
              creator.walletAddress,
            amount:
              amountInWei,
            nonce:
              nonce,
            deadline:
              deadline, // <-- INJECTED DEADLINE
          };

        const signature =
          await walletSigner.signTypedData(
            domain,
            types,
            message,
          );

        txStatus =
          "PENDING_CLAIM";
        signatureMetadata =
          {
            nonce,
            signature,
            deadline,
            amountInWei:
              amountInWei.toString(),
          };

        await sendAccountsCryptoPayoutEmail(
          {
            creatorUsername:
              creator.username,
            walletAddress:
              creator.payoutAddress ||
              creator.walletAddress,
            amountUSDT:
              clearingReq.amount,
            requestId:
              clearingReq._id,
            approvedByAdmin:
              adminId,
          },
        );
      }

      // --- EXECUTE BALANCE TRANSFERS ---
      if (
        clearingReq.direction ===
        "USDT_TO_NGN"
      ) {
        wallet.fiatBalances.floating.NGN =
          Math.max(
            0,
            (wallet
              .fiatBalances
              .floating
              .NGN ||
              0) -
              clearingReq.amount,
          );
        wallet.fiatBalances.withdrawable.NGN =
          (wallet
            .fiatBalances
            .withdrawable
            .NGN ||
            0) +
          clearingReq.amount;
      } else if (
        clearingReq.direction ===
        "NGN_TO_USDT"
      ) {
        wallet.fiatBalances.floating.USDT =
          Math.max(
            0,
            (wallet
              .fiatBalances
              .floating
              .USDT ||
              0) -
              clearingReq.amount,
          );
        wallet.fiatBalances.withdrawable.USDT =
          (wallet
            .fiatBalances
            .withdrawable
            .USDT ||
            0) +
          clearingReq.amount;
      }

      // --- MINT LEDGER RECEIPT ---
      const ledgerEntry =
        await Transaction.create(
          {
            user: creator._id,
            wallet:
              wallet._id,
            type: "LIQUIDATION",
            status:
              txStatus,
            amount:
              clearingReq.amount,
            currency:
              clearingReq.currency,
            isSwap: true,
            swapDetails:
              {
                fromCurrency:
                  clearingReq.direction ===
                  "USDT_TO_NGN"
                    ? "USDT"
                    : "NGN",
                toCurrency:
                  clearingReq.direction ===
                  "USDT_TO_NGN"
                    ? "NGN"
                    : "USDT",
              },
            authorizedByAdmin:
              adminId,
            clearingRequestId:
              clearingReq._id,
            metadata:
              {
                payoutMethod:
                  clearingReq.payoutMethod,
                ipAddress:
                  req.ip,
                ...signatureMetadata,
              },
          },
        );

      await wallet.save();
      clearingReq.status =
        "APPROVED";
      clearingReq.approvedBy =
        adminId;
      await clearingReq.save();

      await SystemLog.create(
        {
          adminId,
          action:
            "APPROVED_CLEARING_REQUEST",
          targetUserId:
            creator._id,
          details: `Approved clearing of ${clearingReq.amount} ${clearingReq.currency}. Payout method: ${clearingReq.payoutMethod}`,
        },
      );

      res
        .status(
          200,
        )
        .json(
          {
            message:
              "Clearing approved and processed successfully.",
            clearingReq,
            ledgerEntry,
          },
        );
    } catch (error) {
      console.error(
        "Approve Clearing Error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to approve clearing request.",
          },
        );
    }
  };

// 3. God Admin Instant Execution Bypass
exports.godAdminInstantClear =
  async (
    req,
    res,
  ) => {
    const systemState =
      await SystemState.findOne(
        {
          key: "MASTER_STATE",
        },
      );

    if (
      systemState &&
      systemState.payoutsLocked
    ) {
      return res
        .status(
          503,
        )
        .json(
          {
            message:
              "CRITICAL ALERT: Treasury operations are currently locked by the automated security protocol. Contact Engineering.",
          },
        );
    }

    try {
      const {
        creatorId,
        amount,
        currency,
        direction,
        depositConfirmed,
      } =
        req.body;
      const adminId =
        req
          .user
          ._id;

      if (
        req
          .user
          .adminRole !==
        "GOD_ADMIN"
      ) {
        return res
          .status(
            403,
          )
          .json(
            {
              message:
                "Forbidden: Requires God Admin privileges.",
            },
          );
      }
      if (
        !depositConfirmed
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Confirmation checkbox required.",
            },
          );
      }

      const creator =
        await User.findById(
          creatorId,
        );
      const wallet =
        await Wallet.findOne(
          {
            creator:
              creatorId,
          },
        );
      if (
        !creator ||
        !wallet
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Creator/Wallet not found.",
            },
          );

      let txStatus =
        "PENDING";
      let signatureMetadata =
        {};

      // --- CRYPTO LIQUIDITY CHECK & VOUCHER GENERATION ---
      if (
        creator.payoutMethod ===
        "crypto"
      ) {
        const provider =
          new ethers.JsonRpcProvider(
            process
              .env
              .POLYGON_RPC_URL,
          );
        const usdtContract =
          new ethers.Contract(
            process
              .env
              .USDT_ADDRESS,
            [
              "function balanceOf(address) view returns (uint256)",
            ],
            provider,
          );

        const rawBalance =
          await usdtContract.balanceOf(
            process
              .env
              .NIPPY_TREASURY_PAYOUT,
          );
        const actualBalanceUSDT =
          Number(
            ethers.formatUnits(
              rawBalance,
              6,
            ),
          );

        const outstandingClaims =
          await Transaction.aggregate(
            [
              {
                $match:
                  {
                    status:
                      "PENDING_CLAIM",
                    currency:
                      "USDT",
                  },
              },
              {
                $group:
                  {
                    _id: null,
                    totalLocked:
                      {
                        $sum: "$amount",
                      },
                  },
              },
            ],
          );

        const lockedLiquidity =
          outstandingClaims.length >
          0
            ? outstandingClaims[0]
                .totalLocked
            : 0;
        const effectiveAvailable =
          actualBalanceUSDT -
          lockedLiquidity;

        if (
          amount >
          effectiveAvailable
        ) {
          return res
            .status(
              400,
            )
            .json(
              {
                message: `Insufficient treasury liquidity. Only ${effectiveAvailable.toFixed(2)} USDT remains uncommitted. Top up the smart contract.`,
              },
            );
        }

        // Generate EIP-712 Voucher with 23-Hour Time-Bomb
        const walletSigner =
          new ethers.Wallet(
            process
              .env
              .BACKEND_SIGNER_PRIVATE_KEY,
          );
        const nonce =
          ethers.hexlify(
            ethers.randomBytes(
              32,
            ),
          );
        const amountInWei =
          ethers.parseUnits(
            amount.toString(),
            6,
          );
        const deadline =
          Math.floor(
            Date.now() /
              1000,
          ) +
          23 *
            60 *
            60;

        const domain =
          {
            name: "NippyPayouts",
            version:
              "1",
            chainId:
              parseInt(
                process
                  .env
                  .POLYGON_CHAIN_ID ||
                  "80002",
              ),
            verifyingContract:
              process
                .env
                .NIPPY_TREASURY_PAYOUT,
          };

        const types =
          {
            Claim:
              [
                {
                  name: "creator",
                  type: "address",
                },
                {
                  name: "amount",
                  type: "uint256",
                },
                {
                  name: "nonce",
                  type: "bytes32",
                },
                {
                  name: "deadline",
                  type: "uint256",
                }, // <-- INJECTED DEADLINE
              ],
          };

        const message =
          {
            creator:
              creator.payoutAddress ||
              creator.walletAddress,
            amount:
              amountInWei,
            nonce:
              nonce,
            deadline:
              deadline, // <-- INJECTED DEADLINE
          };

        const signature =
          await walletSigner.signTypedData(
            domain,
            types,
            message,
          );

        txStatus =
          "PENDING_CLAIM";
        signatureMetadata =
          {
            nonce,
            signature,
            deadline,
            amountInWei:
              amountInWei.toString(),
          };

        await sendAccountsCryptoPayoutEmail(
          {
            creatorUsername:
              creator.username,
            walletAddress:
              creator.payoutAddress ||
              creator.walletAddress,
            amountUSDT:
              amount,
            requestId:
              "GOD_BYPASS_" +
              Date.now(),
            approvedByAdmin:
              adminId,
          },
        );
      }

      // --- EXECUTE BALANCE TRANSFERS ---
      if (
        direction ===
        "USDT_TO_NGN"
      ) {
        wallet.fiatBalances.floating.NGN =
          Math.max(
            0,
            (wallet
              .fiatBalances
              .floating
              .NGN ||
              0) -
              amount,
          );
        wallet.fiatBalances.withdrawable.NGN =
          (wallet
            .fiatBalances
            .withdrawable
            .NGN ||
            0) +
          amount;
      } else {
        wallet.fiatBalances.floating.USDT =
          Math.max(
            0,
            (wallet
              .fiatBalances
              .floating
              .USDT ||
              0) -
              amount,
          );
        wallet.fiatBalances.withdrawable.USDT =
          (wallet
            .fiatBalances
            .withdrawable
            .USDT ||
            0) +
          amount;
      }

      // --- MINT LEDGER RECEIPT ---
      const ledgerEntry =
        await Transaction.create(
          {
            user: creator._id,
            wallet:
              wallet._id,
            type: "LIQUIDATION",
            status:
              txStatus,
            amount:
              amount,
            currency:
              currency,
            isSwap: true,
            swapDetails:
              {
                fromCurrency:
                  direction ===
                  "USDT_TO_NGN"
                    ? "USDT"
                    : "NGN",
                toCurrency:
                  direction ===
                  "USDT_TO_NGN"
                    ? "NGN"
                    : "USDT",
              },
            authorizedByAdmin:
              adminId,
            metadata:
              {
                payoutMethod:
                  creator.payoutMethod,
                ipAddress:
                  req.ip,
                ...signatureMetadata,
              },
          },
        );

      await wallet.save();

      await SystemLog.create(
        {
          adminId,
          action:
            "GOD_ADMIN_INSTANT_CLEAR",
          targetUserId:
            creatorId,
          details: `God Admin instantly cleared ${amount} ${currency} for ${creator.username}`,
        },
      );

      res
        .status(
          200,
        )
        .json(
          {
            message:
              "Instant clearing executed by God Admin.",
            wallet,
            ledgerEntry,
          },
        );
    } catch (error) {
      console.error(
        "God Clear Error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to execute instant clear.",
          },
        );
    }
  };

exports.getPendingClearings =
  async (
    req,
    res,
  ) => {
    try {
      const clearings =
        await ClearingRequest.find(
          {
            status:
              "PENDING_APPROVAL",
          },
        )
          .populate(
            "creator",
            "username email",
          )
          .sort(
            {
              createdAt:
                -1,
            },
          );
      res
        .status(
          200,
        )
        .json(
          clearings,
        );
    } catch (error) {
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to fetch clearings",
          },
        );
    }
  };
