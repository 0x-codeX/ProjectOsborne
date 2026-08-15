const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
          unique: true,
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
        index: true,
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
          unique: true,
          sparse: true, // Will safely ignore undefined values
          lowercase: true,
          trim: true,
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
      kycStatus: {
        type: String,
        enum: ["unverified", "pending", "verified", "failed"],
        default: "unverified",
        index: true,
      },
      kycRecord: {
        legalName: { type: String }, // Full concatenated name
        firstName: { type: String }, // NEW: Strict breakdown
        middleName: { type: String },// NEW: Strict breakdown
        lastName: { type: String },  // NEW: Strict breakdown
        dateOfBirth: { type: Date },
        providerSessionId: { type: String },
        verifiedAt: { type: Date },
        documentType: { type: String },
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
              default: 1.0,
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
          // Dynamic Multi-Month Tier
          multiMonthDuration:
            {
              type: Number,
              enum: [
                2,
                3,
              ],
              default: 2,
            },
          multiMonthPrice:
            {
              type: Number,
              default: 0,
              min: [
                0,
                "Price cannot be negative",
              ],
            },

          // Message Bundle Settings
          messageBundleSize:
            {
              type: Number,
              default: 5,
              min: 5,
            },
          messageBundlePrice:
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
      followers:
        [
          {
            type: mongoose
              .Schema
              .Types
              .ObjectId,
            ref: "User",
            index: true,
          },
        ],
      following:
        [
          {
            type: mongoose
              .Schema
              .Types
              .ObjectId,
            ref: "User",
            index: true,
          },
        ],
      payoutMethod:
        {
          type: String,
          enum: [
            "crypto",
            "bank",
            "paypal",
          ],
          default:
            "crypto",
        },
      accountName:
        {
          type: String, // NEW: The exact name on the bank account
          default:
            "",
        },
      bankName:
        {
          type: String,
          default:
            "",
        },
      bankCode:
        {
          type: String, // NEW: CRITICAL FOR PAYSTACK (e.g., "058")
          default:
            "",
        },
      accountNumber:
        {
          type: String,
          default:
            "",
        },
      fiatCurrency:
        {
          type: String,
          default:
            "NGN",
        },
      paypalEmail:
        {
          type: String,
          default:
            "",
        },
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
