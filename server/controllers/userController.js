// server/controllers/userController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const ethers = require("ethers");
const Ticket = require("../models/Ticket");
const exchangeConfig = require("../config/exchangeRates");

// PUT /api/users/profile
// Handles Bio Data Setup and Profile Updates
exports.submitBioData =
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
        preferredCurrency,
        referredBy,
        willingNsfw,
        agreedTerms,
        confirmedAge,
        subscribeEmails,
        hasCompletedBioData,
        profileImage,
        bannerImage,
        payoutAddress,
        securityPassword,
        securitySignature,
      } =
        req.body;

      const userId =
        req
          .user
          ._id ||
        req
          .user
          .id;
      if (
        !userId
      )
        return res
          .status(
            401,
          )
          .json(
            {
              message:
                "Unauthorized: No user ID in token.",
            },
          );

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
                "User not found in database.",
            },
          );

      // --- SENSITIVE DATA SECURITY GATE ---
      const currentPayout =
        user.payoutAddress ||
        user.walletAddress ||
        "";
      const isPayoutChanged =
        payoutAddress &&
        user.payoutAddress &&
        payoutAddress !==
          currentPayout;
      const isEmailChanged =
        email &&
        user.email &&
        email !==
          user.email;

      if (
        isPayoutChanged ||
        isEmailChanged
      ) {
        if (
          user.walletAddress
        ) {
          if (
            !securitySignature
          ) {
            return res
              .status(
                401,
              )
              .json(
                {
                  message:
                    "Wallet signature required to modify existing sensitive data.",
                },
              );
          }
          let changesText =
            [];
          if (
            isEmailChanged
          )
            changesText.push(
              `email to ${email}`,
            );
          if (
            isPayoutChanged
          )
            changesText.push(
              `payout address to ${payoutAddress}`,
            );
          const expectedMessage = `CONFIRM_ACCOUNT_UPDATE: I authorize changing my ${changesText.join(
            " and ",
          )}.`;
          try {
            const recoveredAddress =
              ethers.verifyMessage(
                expectedMessage,
                securitySignature,
              );
            if (
              recoveredAddress.toLowerCase() !==
              user.walletAddress.toLowerCase()
            ) {
              return res
                .status(
                  401,
                )
                .json(
                  {
                    message:
                      "Invalid signature for account modification.",
                  },
                );
            }
          } catch (sigError) {
            return res
              .status(
                401,
              )
              .json(
                {
                  message:
                    "Malformed signature provided.",
                },
              );
          }
        } else if (
          user.password
        ) {
          if (
            !securityPassword
          ) {
            return res
              .status(
                401,
              )
              .json(
                {
                  message:
                    "Password required to modify sensitive data.",
                },
              );
          }
          const isMatch =
            await bcrypt.compare(
              securityPassword,
              user.password,
            );
          if (
            !isMatch
          ) {
            return res
              .status(
                401,
              )
              .json(
                {
                  message:
                    "Incorrect password for account modification.",
                },
              );
          }
        }
      }

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

      if (
        username
      ) {
        const existingUser =
          await User.findOne(
            {
              username,
              _id: {
                $ne: userId,
              },
            },
          );
        if (
          existingUser
        )
          return res
            .status(
              409,
            )
            .json(
              {
                message:
                  "Username is already taken.",
              },
            );
      }

      if (
        email
      ) {
        const existingEmail =
          await User.findOne(
            {
              email,
              _id: {
                $ne: userId,
              },
            },
          );
        if (
          existingEmail
        )
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

        if (
          req
            .body
            .isAgeVerified !==
          undefined
        )
          delete req
            .body
            .isAgeVerified;
        if (
          req
            .body
            .ageVerification !==
          undefined
        )
          delete req
            .body
            .ageVerification;
      }

      // --- CURRENCY HYBRID STRATEGY LOGIC ---
      let finalCurrency =
        user.preferredCurrency;

      if (
        preferredCurrency &&
        exchangeConfig.SUPPORTED_CURRENCIES.includes(
          preferredCurrency,
        )
      ) {
        finalCurrency =
          preferredCurrency;
      } else if (
        country &&
        (!user.preferredCurrency ||
          user.preferredCurrency ===
            exchangeConfig.DEFAULT_CURRENCY)
      ) {
        finalCurrency =
          exchangeConfig
            .COUNTRY_TO_CURRENCY[
            country
          ] ||
          exchangeConfig.DEFAULT_CURRENCY;
      }

      const updatedUser =
        await User.findByIdAndUpdate(
          userId,
          {
            $set: {
              username,
              email,
              phone,
              gender,
              country,
              preferredCurrency:
                finalCurrency,
              referredBy,
              willingNsfw,
              agreedTerms,
              confirmedAge,
              subscribeEmails,
              hasCompletedBioData: true,
              profileImage,
              bannerImage,
              payoutAddress,
              "creatorProfile.displayName":
                username,
            },
          },
          {
            returnDocument:
              "after",
            runValidators: true,
          },
        );

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

// DELETE /api/users/profile
exports.deleteProfile =
  async (
    req,
    res,
  ) => {
    try {
      const userId =
        req
          .user
          ._id ||
        req
          .user
          .id;
      const {
        password,
        signature,
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
                "User not found.",
            },
          );

      if (
        signature &&
        user.walletAddress
      ) {
        const expectedMessage = `CONFIRM_ACCOUNT_DELETION: I confirm that I want to permanently delete my Nippy account (${user.walletAddress.toLowerCase()}).`;
        const recoveredAddress =
          ethers.verifyMessage(
            expectedMessage,
            signature,
          );
        if (
          recoveredAddress.toLowerCase() !==
          user.walletAddress.toLowerCase()
        ) {
          return res
            .status(
              401,
            )
            .json(
              {
                message:
                  "Signature verification failed. Account not deleted.",
              },
            );
        }
      } else if (
        user.password
      ) {
        if (
          !password
        )
          return res
            .status(
              400,
            )
            .json(
              {
                message:
                  "Password is required to delete account.",
              },
            );
        const isMatch =
          await bcrypt.compare(
            password,
            user.password,
          );
        if (
          !isMatch
        )
          return res
            .status(
              401,
            )
            .json(
              {
                message:
                  "Incorrect password.",
              },
            );
      } else {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Proof of identity required to delete account.",
            },
          );
      }

      await User.findByIdAndDelete(
        userId,
      );
      res
        .status(
          200,
        )
        .json(
          {
            message:
              "Account deleted successfully.",
          },
        );
    } catch (error) {
      console.error(
        "Delete account error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error during account deletion.",
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
      const userId =
        req
          .user
          ._id ||
        req
          .user
          .id;
      if (
        !userId
      )
        return res
          .status(
            401,
          )
          .json(
            {
              message:
                "Unauthorized: No user ID in token.",
            },
          );

      const user =
        await User.findById(
          userId,
        ).select(
          "monetizationSettings",
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
      let {
        priceCurrency,
        defaultPPVPrice,
        weeklySubscription,
        monthlySubscription,
        multiMonthDuration,
        multiMonthPrice,
        messageBundleSize,
        messageBundlePrice,
      } =
        req.body;

      const userId =
        req
          .user
          ._id ||
        req
          .user
          .id;
      if (
        !userId
      )
        return res
          .status(
            401,
          )
          .json(
            {
              message:
                "Unauthorized: No user ID in token.",
            },
          );

      const exactPrice =
        (
          price,
        ) => {
          const raw =
            parseFloat(
              price ||
                0,
            );
          return !isNaN(
            raw,
          ) &&
            raw >
              0
            ? raw
            : 0;
        };

      defaultPPVPrice =
        exactPrice(
          defaultPPVPrice,
        );
      weeklySubscription =
        exactPrice(
          weeklySubscription,
        );
      monthlySubscription =
        exactPrice(
          monthlySubscription,
        );
      multiMonthPrice =
        exactPrice(
          multiMonthPrice,
        );
      messageBundlePrice =
        exactPrice(
          messageBundlePrice,
        );

      messageBundleSize =
        parseInt(
          messageBundleSize,
        ) ||
        5;
      multiMonthDuration =
        parseInt(
          multiMonthDuration,
        ) ||
        3;

      const finalPriceCurrency =
        exchangeConfig.SUPPORTED_CURRENCIES.includes(
          priceCurrency,
        )
          ? priceCurrency
          : "NGN";

      const user =
        await User.findByIdAndUpdate(
          userId,
          {
            $set: {
              monetizationSettings:
                {
                  priceCurrency:
                    finalPriceCurrency,
                  defaultPPVPrice,
                  weeklySubscription,
                  monthlySubscription,
                  multiMonthDuration,
                  multiMonthPrice,
                  messageBundleSize,
                  messageBundlePrice,
                },
            },
          },
          {
            returnDocument:
              "after",
            runValidators: true,
          },
        ).select(
          "monetizationSettings",
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
                "User not found.",
            },
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

// GET /api/users/profile
exports.getProfile =
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
        )
          .select(
            "-password",
          )
          .lean();
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
      res
        .status(
          200,
        )
        .json(
          user,
        );
    } catch (error) {
      console.error(
        "Profile fetch error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error fetching profile",
          },
        );
    }
  };

// PUT /api/users/settings
exports.updateSettings =
  async (
    req,
    res,
  ) => {
    try {
      const {
        currentPassword,
        newEmail,
        newPassword,
        newWalletAddress,
      } =
        req.body;
      const user =
        await User.findById(
          req
            .user
            ._id,
        ).select(
          "+password",
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

      if (
        !currentPassword
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Current password is required to change security settings.",
            },
          );

      const isMatch =
        await user.comparePassword(
          currentPassword,
        );
      if (
        !isMatch
      )
        return res
          .status(
            401,
          )
          .json(
            {
              message:
                "Incorrect current password. Access denied.",
            },
          );

      if (
        newEmail
      ) {
        const emailExists =
          await User.findOne(
            {
              email:
                newEmail,
              _id: {
                $ne: req
                  .user
                  ._id,
              },
            },
          );
        if (
          emailExists
        )
          return res
            .status(
              400,
            )
            .json(
              {
                message:
                  "Email is already in use by another account.",
              },
            );
        user.email =
          newEmail;
      }

      if (
        newPassword
      ) {
        if (
          newPassword.length <
          6
        )
          return res
            .status(
              400,
            )
            .json(
              {
                message:
                  "New password must be at least 6 characters.",
              },
            );
        user.password =
          newPassword;
      }

      if (
        newWalletAddress
      ) {
        const isAddress =
          /^0x[a-fA-F0-9]{40}$/.test(
            newWalletAddress,
          );
        if (
          !isAddress
        )
          return res
            .status(
              400,
            )
            .json(
              {
                message:
                  "Invalid Web3 wallet address format.",
              },
            );
        user.walletAddress =
          newWalletAddress;
      }

      await user.save();
      res
        .status(
          200,
        )
        .json(
          {
            message:
              "Security settings updated successfully.",
          },
        );
    } catch (error) {
      console.error(
        "Settings update error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error updating security settings.",
          },
        );
    }
  };

// PUT /api/users/profile
exports.updateProfile =
  async (
    req,
    res,
  ) => {
    try {
      const {
        username,
        profileImage,
        bannerImage,
        newPassword,
        preferredCurrency,
        country,
      } =
        req.body;

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
              },
            },
          );
        if (
          existingUser
        )
          return res
            .status(
              400,
            )
            .json(
              {
                message:
                  "Username is already taken",
              },
            );
      }

      const updates =
        {
          ...(username && {
            username,
          }),
          ...(profileImage && {
            profileImage,
          }),
          ...(bannerImage && {
            bannerImage,
          }),
          ...(country && {
            country,
          }),
        };

      if (
        preferredCurrency
      ) {
        if (
          exchangeConfig.SUPPORTED_CURRENCIES.includes(
            preferredCurrency,
          )
        ) {
          updates.preferredCurrency =
            preferredCurrency;
        } else {
          return res
            .status(
              400,
            )
            .json(
              {
                message:
                  "Invalid currency selection.",
              },
            );
        }
      }

      if (
        newPassword
      ) {
        const salt =
          await bcrypt.genSalt(
            10,
          );
        updates.passwordHash =
          await bcrypt.hash(
            newPassword,
            salt,
          );
      }

      const updatedUser =
        await User.findByIdAndUpdate(
          req
            .user
            ._id,
          {
            $set: updates,
          },
          {
            returnDocument:
              "after",
          },
        ).select(
          "-password",
        );

      res
        .status(
          200,
        )
        .json(
          {
            message:
              "Profile updated successfully",
            user: updatedUser,
          },
        );
    } catch (error) {
      console.error(
        "Profile update error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error updating profile",
          },
        );
    }
  };

// POST /api/users/:id/follow
exports.toggleFollow =
  async (
    req,
    res,
  ) => {
    try {
      const targetUserId =
        req
          .params
          .id;
      const viewerId =
        req
          .user
          ._id ||
        req
          .user
          .id;

      if (
        targetUserId.toString() ===
        viewerId.toString()
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "You cannot follow yourself.",
            },
          );
      }

      const viewer =
        await User.findById(
          viewerId,
        );
      if (
        !viewer
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Viewer not found.",
            },
          );

      const isFollowing =
        viewer.following.includes(
          targetUserId,
        );

      if (
        isFollowing
      ) {
        await User.findByIdAndUpdate(
          viewerId,
          {
            $pull:
              {
                following:
                  targetUserId,
              },
          },
        );
        await User.findByIdAndUpdate(
          targetUserId,
          {
            $pull:
              {
                followers:
                  viewerId,
              },
          },
        );
        return res
          .status(
            200,
          )
          .json(
            {
              message:
                "Unfollowed successfully",
              isFollowed: false,
            },
          );
      } else {
        await User.findByIdAndUpdate(
          viewerId,
          {
            $addToSet:
              {
                following:
                  targetUserId,
              },
          },
        );
        await User.findByIdAndUpdate(
          targetUserId,
          {
            $addToSet:
              {
                followers:
                  viewerId,
              },
          },
        );
        return res
          .status(
            200,
          )
          .json(
            {
              message:
                "Followed successfully",
              isFollowed: true,
            },
          );
      }
    } catch (error) {
      console.error(
        "Follow toggle error:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error toggling follow status.",
          },
        );
    }
  };

// SUBMIT SUPPORT TICKET
exports.submitSupportTicket =
  async (
    req,
    res,
  ) => {
    try {
      const {
        subject,
        message,
      } =
        req.body;
      if (
        !subject ||
        !message
      )
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Subject and message are required.",
            },
          );

      const newTicket =
        new Ticket(
          {
            userId:
              req
                .user
                ._id,
            subject,
            message,
            status:
              "OPEN",
          },
        );

      await newTicket.save();
      res
        .status(
          201,
        )
        .json(
          {
            message:
              "Support ticket submitted successfully.",
          },
        );
    } catch (error) {
      console.error(
        "Error submitting ticket:",
        error,
      );
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Failed to submit support ticket.",
          },
        );
    }
  };
