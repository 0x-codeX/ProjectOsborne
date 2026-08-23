const axios = require("axios");
const User = require("../models/User");
const {
  checkGeofence,
} = require("../utils/geoService");


// 1. Initialize Didit Session
exports.startDiditSession =
  async (
    req,
    res,
  ) => {
    try {
      const user =
        req.user;
      // Extract the real IP, handling load balancers and proxies
      const forwardedIps =
        req
          .headers[
          "x-forwarded-for"
        ];
      const clientIp =
        forwardedIps
          ? forwardedIps
              .split(
                ",",
              )[0]
              .trim()
          : req
              .socket
              .remoteAddress;

      const geoStatus =
        await checkGeofence(
          clientIp,
        ); // <--- NEW ASYNC AWAIT

      if (
        !geoStatus.requiresIdCheck &&
        !geoStatus.isVpn
      ) {
        return res
          .status(
            200,
          )
          .json(
            {
              action:
                "bypass_available",
              message:
                "User is in a safe jurisdiction.",
            },
          );
      }

      // Call Didit API to create an Age Verification Session
      // We prefer a specific age workflow, but fallback to your standard KYC workflow if needed
      const workflowId =
        process
          .env
          .DIDIT_AGE_WORKFLOW_ID ||
        process
          .env
          .DIDIT_WORKFLOW_ID;

      const response =
        await axios.post(
          "https://verification.didit.me/v3/session/",
          {
            workflow_id:
              workflowId,
            vendor_data:
              user._id.toString(), // Binds Didit session to Nippy user
            callback: `${process.env.CLIENT_URL}/age-callback`, // Frontend route we will build
          },
          {
            headers:
              {
                "x-api-key":
                  process
                    .env
                    .DIDIT_API_KEY,
                "Content-Type":
                  "application/json",
              },
          },
        );

      const {
        verification_url,
        session_token,
        session_id,
      } =
        response.data;

      // Lock the user's state to pending
      await User.findByIdAndUpdate(
        user._id,
        {
          "ageVerification.status":
            "pending",
          "ageVerification.method":
            "didit_avs",
          "ageVerification.sessionId":
            session_id,
          "ageVerification.ipCountry":
            geoStatus.country,
          "ageVerification.isVpnDetected":
            geoStatus.isVpn,
        },
      );

      res
        .status(
          200,
        )
        .json(
          {
            success: true,
            verification_url,
            session_token,
          },
        );
    } catch (error) {
      console.error(
        "Didit Session Error:",
        error
          .response
          ?.data ||
          error.message,
      );
      res
        .status(
          500,
        )
        .json(
          {
            success: false,
            message:
              "Failed to initialize age verification.",
          },
        );
    }
  };

// 2. Check Verification Status (Used by frontend to check if they can pay)
exports.getStatus =
  async (
    req,
    res,
  ) => {
    try {
      const user =
        await User.findById(
          req
            .user
            ._id,
        ).select(
          "isAgeVerified ageVerification",
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
              success: false,
              message:
                "User not found",
            },
          );

      res
        .status(
          200,
        )
        .json(
          {
            success: true,
            ageData:
              user,
          },
        );
    } catch (error) {
      res
        .status(
          500,
        )
        .json(
          {
            success: false,
            message:
              "Failed to retrieve status.",
          },
        );
    }
  };

// 3. Didit Webhook Listener (Public, but secure)
exports.diditWebhook =
  async (
    req,
    res,
  ) => {
    try {
      const {
        session_id,
        status,
        vendor_data,
        decision,
      } =
        req.body;

      // Find the user using the vendor_data we passed during initialization
      const user =
        await User.findById(
          vendor_data,
        );
      if (
        !user
      )
        return res
          .status(
            404,
          )
          .send(
            "User not found",
          );

      if (
        status ===
          "completed" &&
        decision ===
          "approved"
      ) {
        user.isAgeVerified = true; // The quick-access boolean
        user.ageVerification.status =
          "verified";
        user.ageVerification.verifiedAt =
          new Date();
        // Require re-verification after 1 year to stay compliant
        user.ageVerification.expiresAt =
          new Date(
            new Date().setFullYear(
              new Date().getFullYear() +
                1,
            ),
          );
      } else if (
        status ===
          "completed" &&
        decision ===
          "declined"
      ) {
        user.isAgeVerified = false;
        user.ageVerification.status =
          "failed";
        user.ageVerification.lastFailureReason =
          "Didit rejected identity document or age.";
      }

      await user.save();
      res
        .status(
          200,
        )
        .send(
          "Webhook processed successfully",
        );
    } catch (error) {
      console.error(
        "Webhook Error:",
        error,
      );
      res
        .status(
          500,
        )
        .send(
          "Webhook processing failed",
        );
    }
  };
