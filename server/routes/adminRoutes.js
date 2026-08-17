const express = require("express");
const router =
  express.Router();
const {
  requireAuth,
} = require("../middleware/authMiddleware");
const {
  requireAnyAdmin,
  requireGodAdmin,
  requireSuperAdmin,
} = require("../middleware/adminMiddleware");
const adminController = require("../controllers/adminController");
const nodemailer = require("nodemailer");
const Ticket = require("../models/Ticket");





const transporter =
  nodemailer.createTransport(
    {
      service:
        "gmail", // or 'SendGrid', 'Mailgun', etc.
      auth: {
        user: process
          .env
          .EMAIL_USER,
        pass: process
          .env
          .EMAIL_PASS,
      },
    },
  );
// All admin routes require base JWT authentication
router.use(
  requireAuth,
);

// Search & User 360 (Accessible by Moderate, Super, & God Admins)
router.get(
  "/users/search",
  requireAnyAdmin,
  adminController.searchUsers,
);

router.get(
  "/users/360/:userId",
  requireAnyAdmin,
  adminController.getUser360,
);

router.post(
  "/support/reply",
  requireAnyAdmin, // IRONCLAD: Never leave an admin route unprotected
  async (
    req,
    res,
  ) => {
    try {
      const {
        ticketId,
        userEmail,
        subject,
        replyBody,
      } =
        req.body;

      const mailOptions =
        {
          from: `"Nippy Support" <${process.env.EMAIL_USER}>`,
          to: userEmail,
          subject:
            subject,
          text: replyBody,
          html: `
          <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto;">
            <h2>Update on your Nippy Support Request</h2>
            <p style="white-space: pre-wrap; line-height: 1.5;">${replyBody}</p>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888;">This is an automated delivery. You can reply directly to this email to update your ticket.</p>
          </div>
        `,
        };

      // 1. Send the email
      await transporter.sendMail(
        mailOptions,
      );

      // 2. Update the Database to close the ticket
      await Ticket.findByIdAndUpdate(
        ticketId,
        {
          status:
            "RESOLVED",
          resolvedBy:
            req
              .user
              ._id, // Tracks which admin resolved it
          resolvedAt:
            new Date(),
        },
      );

      res
        .status(
          200,
        )
        .json(
          {
            message:
              "Reply sent and ticket resolved successfully",
          },
        );
    } catch (error) {
      console.error(
        "Email send failed:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to send email",
          },
        );
    }
  },
);

// Strict God-Only Admin Elevation (God Mode Enforcer)
router.post(
  "/role/promote-god",
  requireGodAdmin,
  adminController.promoteToGodAdmin,
);

router.post(
  "/role/assign-staff",
  requireGodAdmin,
  adminController.assignStaffRole,
);

router.get(
  "/admins",
  requireGodAdmin,
  adminController.getAdmins,
);
router.post(
  "/role/assign-staff",
  requireGodAdmin,
  adminController.assignStaffRole,
);

// Support Desk Routes (Accessible by Any Admin)
router.get(
  "/tickets",
  requireAnyAdmin,
  adminController.getTickets,
);

router.post(
  "/tickets/status",
  requireAnyAdmin,
  adminController.updateTicketStatus,
);

router.get(
  "/withdrawals",
  requireAnyAdmin,
  adminController.getPayouts,
);
router.post(
  "/withdrawals/action",
  requireAnyAdmin,
  adminController.processPayoutAction,
);

router.post(
  "/users/:userId/status",
  requireAnyAdmin,
  adminController.toggleUserStatus,
);

router.get(
  "/logs",
  requireSuperAdmin,
  adminController.getSystemLogs,
);

router.get(
  "/item/360/:itemId",
  requireAnyAdmin, 
  adminController.getItem360,
);


// ==========================================
// MAKER-CHECKER APPROVAL ROUTES
// ==========================================

// 1. MODERATE ADMINS (and above) can REQUEST an unlock
router.post(
  '/item/:itemId/request-manual-unlock', 
  requireAnyAdmin, 
  adminController.requestManualUnlock
);

// 2. SUPER ADMINS (and above) ONLY can VIEW pending approvals
router.get(
  '/approvals/pending', 
  requireSuperAdmin, 
  adminController.getPendingApprovals
);

// 3. SUPER ADMINS (and above) ONLY can PROCESS (Approve/Reject)
router.post(
  '/approvals/:approvalId/process', 
  requireSuperAdmin, 
  adminController.processApproval
);



module.exports =
  router;
