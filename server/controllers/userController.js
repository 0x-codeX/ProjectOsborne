const User = require("../models/User");

// PUT /api/users/profile
// Handles Bio Data Setup and Profile Updates
exports.updateProfile =
  async (
    req,
    res,
  ) => {
    try {
      const {
        username,
        email,
        phone,
        gender,
        country,
        referredBy,
        willingNsfw,
        agreedTerms,
        confirmedAge,
        subscribeEmails,
        hasCompletedBioData,
      } =
        req.body;

      // 1. Stress-Test: Enforce legal compliance at the server level
      if (
        !agreedTerms ||
        !confirmedAge
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "You must agree to the Terms of Service and confirm you are 18+.",
            },
          );
      }

      // 2. Prevent Username Hijacking
      if (
        username
      ) {
        const existingUser =
          await User.findOne(
            {
              username,
              _id: {
                $ne: req
                  .user
                  ._id,
              }, // Exclude the current user from the search
            },
          );
        if (
          existingUser
        ) {
          return res
            .status(
              409,
            )
            .json(
              {
                message:
                  "Username is already taken. Please choose another.",
              },
            );
        }
      }

      // 3. Prevent Email Collisions (Crucial for Web3 users adding an email)
      if (
        email
      ) {
        const existingEmail =
          await User.findOne(
            {
              email,
              _id: {
                $ne: req
                  .user
                  ._id,
              },
            },
          );
        if (
          existingEmail
        ) {
          return res
            .status(
              409,
            )
            .json(
              {
                message:
                  "Email is already in use by another account.",
              },
            );
        }
      }

      // 4. Safely update the database
      const updatedUser =
        await User.findByIdAndUpdate(
          req
            .user
            ._id,
          {
            $set: {
              username,
              email,
              phone,
              gender,
              country,
              referredBy,
              willingNsfw,
              agreedTerms,
              confirmedAge,
              subscribeEmails,
              hasCompletedBioData,
              // Sync username to displayName automatically so their profile looks good immediately
              "creatorProfile.displayName":
                username,
            },
          },
          {
            new: true,
            runValidators: true,
          },
        );

      if (
        !updatedUser
      ) {
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
      }

      res
        .status(
          200,
        )
        .json(
          {
            message:
              "Profile updated successfully.",
            user: updatedUser,
          },
        );
    } catch (error) {
      console.error(
        "Error updating profile:",
        error,
      );

      // Catch-all for MongoDB unique index (E11000) errors just in case race conditions occur
      if (
        error.code ===
        11000
      ) {
        const field =
          Object.keys(
            error.keyValue,
          )[0];
        return res
          .status(
            409,
          )
          .json(
            {
              message: `That ${field} is already taken.`,
            },
          );
      }

      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to update profile data.",
          },
        );
    }
  };

// GET /api/users/settings/monetization
exports.getMonetizationSettings =
  async (
    req,
    res,
  ) => {
    try {
      // req.user._id comes from your protect middleware
      const user =
        await User.findById(
          req
            .user
            ._id,
        ).select(
          "monetizationSettings",
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
                "User not found",
            },
          );
      }

      res
        .status(
          200,
        )
        .json(
          user.monetizationSettings,
        );
    } catch (error) {
      console.error(
        "Error fetching settings:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error fetching monetization settings",
          },
        );
    }
  };

// PUT /api/users/settings/monetization
exports.updateMonetizationSettings =
  async (
    req,
    res,
  ) => {
    try {
      const {
        defaultPPVPrice,
        weeklySubscription,
        monthlySubscription,
        threeMonthBundle,
      } =
        req.body;

      const user =
        await User.findByIdAndUpdate(
          req
            .user
            ._id,
          {
            $set: {
              monetizationSettings:
                {
                  defaultPPVPrice:
                    Number(
                      defaultPPVPrice,
                    ) ||
                    0,
                  weeklySubscription:
                    Number(
                      weeklySubscription,
                    ) ||
                    0,
                  monthlySubscription:
                    Number(
                      monthlySubscription,
                    ) ||
                    0,
                  threeMonthBundle:
                    Number(
                      threeMonthBundle,
                    ) ||
                    0,
                },
            },
          },
          {
            new: true,
            runValidators: true,
            upsert: true,
          }, // Upsert ensures nested objects are created
        ).select(
          "monetizationSettings",
        );

      res
        .status(
          200,
        )
        .json(
          {
            message:
              "Monetization tiers locked in.",
            settings:
              user.monetizationSettings,
          },
        );
    } catch (error) {
      console.error(
        "Error updating settings:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to update monetization settings",
          },
        );
    }
  };
