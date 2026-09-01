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
          sparse: true,
          trim: true,
          lowercase: true,
        },
      passwordHash:
        {
          type: String,
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
          "GOD_ADMIN",
          "SUPER_ADMIN",
          "MODERATE_ADMIN",
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

      // THE FIX: Universal Display Currency
      preferredCurrency:
        {
          type: String,
          enum: [
            "NGN",
            "GHS",
            "USD",
          ],
          default:
            "USD",
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
          type: Boolean,
          default: false,
        },
      isEmailVerified:
        {
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
          type: Boolean,
          default: false,
        },
      // --- VISUAL BRANDING ---
      profileImage:
        {
          type: String,
          default:
            "",
        },
      bannerImage:
        {
          type: String,
          default:
            "",
        },

      // --- WEB3 / PAYMENTS ---
      walletAddress:
        {
          type: String,
          unique: true,
          sparse: true,
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
          index: true,
        },
      kycRecord:
        {
          legalName:
            {
              type: String,
            },
          firstName:
            {
              type: String,
            },
          middleName:
            {
              type: String,
            },
          lastName:
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
      ageVerification:
        {
          status:
            {
              type: String,
              enum: [
                "unverified",
                "pending",
                "verified",
                "failed",
                "expired",
              ],
              default:
                "unverified",
            },
          method:
            {
              type: String,
              enum: [
                "card_on_file",
                "third_party_avs",
                "none",
              ],
              default:
                "none",
            },
          sessionId:
            {
              type: String,
              default:
                null,
            }, // Didit session ID
          ipCountry:
            {
              type: String,
              default:
                null,
            },
          isVpnDetected:
            {
              type: Boolean,
              default: false,
            },
          verifiedAt:
            {
              type: Date,
              default:
                null,
            },
          expiresAt:
            {
              type: Date,
              default:
                null,
            },
        },
      isAgeVerified:
        {
          type: Boolean,
          default: false,
        },
      // --- LIVE STREAMING TRACKING ---
      isLive:
        {
          type: Boolean,
          default: false,
        },
      currentStreamId:
        {
          type: mongoose
            .Schema
            .Types
            .ObjectId,
          ref: "Stream",
          default:
            null,
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
            },
        },

      // --- MONETIZATION SETTINGS ---
      monetizationSettings:
        {
          // THE FIX: Creator's Input Currency
          priceCurrency:
            {
              type: String,
              enum: [
                "NGN",
                "GHS",
                "USD",
              ],
              default:
                "NGN", // Keeps legacy NGN prices safe
            },
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

      // Payout fields...
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
          type: String,
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
          type: String,
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
            "NGN", // Legacy field, keeping it safe for now
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
