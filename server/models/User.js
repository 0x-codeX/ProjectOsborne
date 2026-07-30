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
          // CRITICAL: Password is only required if the user doesn't have a Web3 wallet
          required:
            function () {
              return !this
                .walletAddress;
            },
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
          sparse: true, // Allows null until they finish the BioData setup
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
      subscribeEmails:
        {
          type: Boolean,
          default: false,
        },
      hasCompletedBioData:
        {
          type: Boolean,
          default: false, // Flips to true once they submit the BioData form
        },
      payoutAddress:
        {
          type: String,
          default:
            "",
        },
      hasCompletedBioData:
        {
          type: Boolean,
          default: false,
        },

      // --- WEB3 / PAYMENTS ---
      walletAddress:
        {
          type: String,
          default:
            null,
          sparse: true, // Prevents duplicate null wallets
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
            }, // Stores Didit's session_id
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
