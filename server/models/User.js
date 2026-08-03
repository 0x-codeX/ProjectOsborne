const mongoose = require("mongoose");

const userSchema =
  new mongoose.Schema(
    {
      // --- CORE AUTHENTICATION ---
      email:
        {
          type: String,
          unique: true,
          sparse: true, // CRITICAL: Allows Web3 users to exist without an email initially
          trim: true,
          lowercase: true,
        },
      passwordHash:
        {
          type: String,
          // REMOVED the buggy required function. Enforce password checks in the auth controller.
        },
      googleId:
        {
          type: String,
          sparse: true,
        },
      role: {
        type: String,
        enum: [
          "fan",
          "creator",
          "admin",
        ],
        default:
          "fan",
      },

      // --- BIO DATA (ONBOARDING) ---
      username:
        {
          type: String,
          unique: true,
          sparse: true,
          trim: true,
        },
      phone:
        {
          type: String,
          sparse: true,
        },
      gender:
        {
          type: String,
        },
      country:
        {
          type: String,
          default:
            "Nigeria",
        },
      referredBy:
        {
          type: String,
        },
      willingNsfw:
        {
          type: Boolean,
          default: false,
        },
      agreedTerms:
        {
          type: Boolean,
          default: false,
        },
      confirmedAge:
        {
          type: Boolean,
          default: false,
        },
      isAgeVerified:
        {
          // ADDED: Your frontend routing strictly relies on this
          type: Boolean,
          default: false,
        },
      isEmailVerified:
        {
          // ADDED: The Google Auth route needs this
          type: Boolean,
          default: false,
        },
      subscribeEmails:
        {
          type: Boolean,
          default: false,
        },
      payoutAddress:
        {
          type: String,
          default:
            "",
        },
      hasCompletedBioData:
        {
          // Cleaned up the duplicate
          type: Boolean,
          default: false,
        },

      // --- WEB3 / PAYMENTS ---
      walletAddress:
        {
          type: String,
          default:
            null,
          sparse: true,
        },
      usdtBalance:
        {
          type: Number,
          default: 0.0,
        },
      nonce:
        {
          type: String,
        },

      // --- 18 U.S.C. § 2257 COMPLIANCE FIELDS ---
      kycStatus:
        {
          type: String,
          enum: [
            "unverified",
            "pending",
            "verified",
            "failed",
          ],
          default:
            "unverified",
        },
      kycRecord:
        {
          legalName:
            {
              type: String,
            },
          dateOfBirth:
            {
              type: Date,
            },
          providerSessionId:
            {
              type: String,
            },
          verifiedAt:
            {
              type: Date,
            },
          documentType:
            {
              type: String,
            },
        },

      // --- CREATOR SPECIFIC FIELDS ---
      creatorProfile:
        {
          displayName:
            {
              type: String,
            },
          bio: {
            type: String,
          },
          subscriptionPrice:
            {
              type: Number,
              default: 0.0,
            }, // in USDT
        },

      // --- MONETIZATION SETTINGS ---
      monetizationSettings:
        {
          defaultPPVPrice:
            {
              type: Number,
              default: 3.0,
              min: [
                0,
                "Price cannot be negative",
              ],
            },
          weeklySubscription:
            {
              type: Number,
              default: 0,
              min: [
                0,
                "Price cannot be negative",
              ],
            },
          monthlySubscription:
            {
              type: Number,
              default: 0,
              min: [
                0,
                "Price cannot be negative",
              ],
            },
          threeMonthBundle:
            {
              type: Number,
              default: 0,
              min: [
                0,
                "Price cannot be negative",
              ],
            },
        },
      bookmarks:
        [
          {
            type: mongoose
              .Schema
              .Types
              .ObjectId,
            ref: "Content",
          },
        ],
    },
    {
      timestamps: true,
    },
  );

module.exports =
  mongoose.model(
    "User",
    userSchema,
  );
