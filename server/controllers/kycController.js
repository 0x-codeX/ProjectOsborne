const User = require("../models/User");
const axios = require("axios");

// @desc    Initialize a secure KYC session via Didit
// @route   POST /api/auth/kyc/start-session
exports.startKycSession = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID required for KYC" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.kycStatus === "verified") {
      return res.status(400).json({ message: "User is already verified" });
    }

    // STRICT GUARD: Check if environment variables are actually loaded in memory
    if (!process.env.DIDIT_API_KEY || !process.env.DIDIT_WORKFLOW_ID) {
      console.error("FATAL ERROR: Missing Didit credentials. Check your .env file and dotenv config.");
      return res.status(500).json({ message: "Server misconfiguration: Missing API keys" });
    }

    // 1. Call Didit's V3 API using Axios (Bulletproof for all Node versions)
    const diditResponse =
      await axios.post(
        "https://verification.didit.me/v3/session/",
        {
          workflow_id:
            process
              .env
              .DIDIT_WORKFLOW_ID,
          vendor_data:
            user._id.toString(),
          // NEW: Tell Didit where to send the user after success
          callback:
            "http://localhost:5173/creator/dashboard",
          // NEW: "both" forces the desktop browser to redirect even if finished on mobile
          callback_method:
            "both",
        },
        {
          headers:
            {
              "Content-Type":
                "application/json",
              "x-api-key":
                process
                  .env
                  .DIDIT_API_KEY,
            },
        },
      );

    // Didit returns a secure hosted URL for this specific session
    const sessionUrl = diditResponse.data.url;
    const sessionId = diditResponse.data.session_id; 

    // 2. Update user state to pending
    user.kycStatus = "pending";
    if (!user.kycRecord) user.kycRecord = {};
    user.kycRecord.providerSessionId = sessionId;
    await user.save();

    // 3. Send the real Didit URL back to the frontend
    res.status(200).json({ url: sessionUrl });

  } catch (error) {
    // RUTHLESS LOGGING: If this fails again, the Node terminal will tell you EXACTLY why.
    if (error.response) {
      console.error("DIDIT API REJECTED REQUEST:", error.response.status, error.response.data);
    } else {
      console.error("KYC SESSION EXECUTION ERROR:", error.message);
    }
    res.status(500).json({ message: "Failed to initialize KYC gateway" });
  }
};

// @desc    Receive KYC status updates from Didit (Webhook)
// @route   POST /api/kyc/webhook
exports.kycWebhook = async (req, res) => {
  try {
    // SECURITY NOTE: In production, verify the X-Signature-V2 header here 
    // to prove this request actually came from Didit.
    
    const { session_id, status, decision } = req.body;

    if (!session_id || !status) {
      return res.status(400).json({ message: "Invalid webhook payload" });
    }

    const user = await User.findOne({ "kycRecord.providerSessionId": session_id });

    if (!user) {
      return res.status(404).json({ message: "KYC session not found in database" });
    }

    // Process Didit's exact status flags
    if (status === "Approved") {
      user.kycStatus = "verified";
      
      // Extract data securely from the decision object
      if (decision) {
        user.kycRecord.legalName = `${decision.first_name || ""} ${decision.last_name || ""}`.trim();
        user.kycRecord.documentType = decision.document_type;
        user.kycRecord.verifiedAt = Date.now();
      }
    } else if (status === "Declined" || status === "Abandoned") {
      user.kycStatus = "failed";
      user.kycRecord.failureReason = decision?.reason || "Verification failed or abandoned.";
    } 
    // If status is "In Review" or "In Progress", we do nothing and wait for the final webhook.

    await user.save();
    
    // Always return a 200 OK fast so Didit knows you received the webhook
    res.status(200).json({ received: true });

  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ message: "Internal Webhook Error" });
  }
};
