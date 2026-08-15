// server/routes/authRoutes.js
const express = require("express");
const router =
  express.Router();
const jwt = require("jsonwebtoken");
const {
  registerUser,
  loginUser,
  web3Login,
  getWeb3Nonce,
  linkEmailToAccount,
  linkWalletToAccount,
} = require("../controllers/authController");
const {
  startKycSession,
  kycWebhook,
} = require("../controllers/kycController");
const {
  getMe,
} = require("../controllers/authController");
const {
  requireAuth,
} = require("../middleware/authMiddleware");
const {
  OAuth2Client,
} = require("google-auth-library");
const User = require("../models/User");

const googleClient =
  new OAuth2Client(
    process
      .env
      .GOOGLE_CLIENT_ID,
  );


router.post(
  "/register",
  registerUser,
);
router.post(
  "/login",
  loginUser,
);
router.post(
  "/web3-login",
  web3Login,
);
router.post(
  "/kyc/start-session",
  startKycSession,
);
// This route must be PUBLIC so the provider can reach it
router.post('/kyc/webhook', kycWebhook);
router.get(
  "/web3-nonce",
  getWeb3Nonce,
);
router.get(
  "/me",
  requireAuth,
  getMe,
);
router.put(
  "/link-email",
  requireAuth,
  linkEmailToAccount,
);
router.put(
  "/link-wallet",
  requireAuth,
  linkWalletToAccount,
);


router.post(
  "/google",
  async (
    req,
    res,
  ) => {
    try {
      const {
        credential,
        role,
      } =
        req.body; // 'credential' here is the access_token from React

      // 1. Ask Google's UserInfo endpoint to verify the access token and return the user profile
      const googleResponse =
        await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers:
              {
                Authorization: `Bearer ${credential}`,
              },
          },
        );

      if (
        !googleResponse.ok
      ) {
        throw new Error(
          "Failed to verify token with Google",
        );
      }

      const payload =
        await googleResponse.json();
      const {
        email,
        sub: googleId,
        name,
      } = payload;

      // 2. Check if the user already exists in Nippy
      let user =
        await User.findOne(
          {
            email,
          },
        );
      let isNewUser = false;

      if (
        !user
      ) {
        // 3. Create a new user if they don't exist
        isNewUser = true;

        user =
          new User(
            {
              email,
              googleId,
              role:
                role ||
                "fan",
              isEmailVerified: true,
              hasCompletedBioData: false,
              isAgeVerified: false,
            },
          );
        await user.save();
      }

      // 4. Generate your platform's JWT
      const token =
        jwt.sign(
          {
            id: user._id,
            role: user.role,
          },
          process
            .env
            .JWT_SECRET,
          {
            expiresIn:
              "7d",
          },
        );

      res
        .status(
          200,
        )
        .json(
          {
            token,
            user,
            isNewUser,
          },
        );
    } catch (error) {
      console.error(
        "Google Auth Error:",
        error,
      );
      res
        .status(
          401,
        )
        .json(
          {
            message:
              "Google authentication failed. Invalid token.",
          },
        );
    }
  },
);

module.exports =
  router;
