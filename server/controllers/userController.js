const User = require("../models/User");
const bcrypt = require("bcryptjs");
const ethers = require("ethers");

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
        referredBy,
        willingNsfw,
        agreedTerms,
        confirmedAge,
        subscribeEmails,
        hasCompletedBioData,
        profileImage,
        payoutAddress,
        securityPassword,
        securitySignature,
      } =
        req.body;

      // THE FIX: Bulletproof ID extraction regardless of your middleware setup
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

      // --- UNIFIED SENSITIVE DATA SECURITY GATE START ---
      const currentPayout =
        user.payoutAddress ||
        user.walletAddress ||
        "";
      const currentEmail =
        user.email ||
        "";

      const isPayoutChanged =
        payoutAddress &&
        payoutAddress !==
          currentPayout;
      const isEmailChanged =
        email &&
        email !==
          currentEmail;

      if (
        isPayoutChanged ||
        isEmailChanged
      ) {
        // 1. Web3 Wallet Verification
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
                    "Wallet signature required to modify sensitive data.",
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

          const expectedMessage = `CONFIRM_ACCOUNT_UPDATE: I authorize changing my ${changesText.join(" and ")}.`;

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
        }
        // 2. Standard Email/Password Verification
        else if (
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
      // --- PAYOUT ADDRESS SECURITY GATE END ---

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
                $ne: userId,
              }, // Use safe userId
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
                $ne: userId,
              }, // Use safe userId
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
          userId,
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
              profileImage,
              payoutAddress,
              // Sync username to displayName automatically so their profile looks good immediately
              "creatorProfile.displayName":
                username,
            },
          },
          {
            returnDocument:
              "after", // Silences the Mongoose deprecation warning
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

// DELETE /api/users/profile
// Permanently deletes the user account and validates password if applicable
exports.deleteProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { password, signature } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // CASE 1: Web3 Wallet Verification via Signature
    if (signature && user.walletAddress) {
      const expectedMessage = `CONFIRM_ACCOUNT_DELETION: I confirm that I want to permanently delete my Nippy account (${user.walletAddress.toLowerCase()}).`;
      const recoveredAddress = ethers.verifyMessage(expectedMessage, signature);

      if (recoveredAddress.toLowerCase() !== user.walletAddress.toLowerCase()) {
        return res.status(401).json({ message: "Signature verification failed. Account not deleted." });
      }
    } 
    // CASE 2: Traditional Email/Password Verification
    else if (user.password) {
      if (!password) {
        return res.status(400).json({ message: "Password is required to delete account." });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Incorrect password." });
      }
    } 
    else {
      return res.status(400).json({ message: "Proof of identity required to delete account." });
    }

    // Proof verified -> Permanently wipe user
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "Account deleted successfully." });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ message: "Server error during account deletion." });
  }
};

// GET /api/users/settings/monetization
exports.getMonetizationSettings = async (req, res) => {
  try {
    // THE FIX: Safely extract ID
    const userId = req.user._id || req.user.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: No user ID in token." });
    }

    const user = await User.findById(userId).select("monetizationSettings");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user.monetizationSettings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ message: "Server error fetching monetization settings" });
  }
};

// PUT /api/users/settings/monetization
exports.updateMonetizationSettings = async (req, res) => {
  try {
    const {
      defaultPPVPrice,
      weeklySubscription,
      monthlySubscription,
      threeMonthBundle,
    } = req.body;

    // THE FIX: Safely extract ID
    const userId = req.user._id || req.user.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: No user ID in token." });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          monetizationSettings: {
            defaultPPVPrice: Number(defaultPPVPrice) || 0,
            weeklySubscription: Number(weeklySubscription) || 0,
            monthlySubscription: Number(monthlySubscription) || 0,
            threeMonthBundle: Number(threeMonthBundle) || 0,
          },
        },
      },
      {
        returnDocument: 'after', // THE FIX: Silences Mongoose deprecation warnings
        runValidators: true,
        // Removed upsert: true because $set on an existing user document works perfectly without it, 
        // and upserting a completely missing user document based just on an ID is dangerous here.
      }
    ).select("monetizationSettings");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      message: "Monetization tiers locked in.",
      settings: user.monetizationSettings,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ message: "Failed to update monetization settings" });
  }
};

// GET /api/users/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    
    res.status(200).json(user);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

// PUT /api/users/settings
exports.updateSettings = async (req, res) => {
  try {
    const { currentPassword, newEmail, newPassword, newWalletAddress } = req.body;

    // 1. Fetch user (explicitly selecting the password field if it's hidden by default)
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. THE GATEKEEPER: Require current password for sensitive changes
    if (!currentPassword) {
      return res.status(400).json({ message: "Current password is required to change security settings." });
    }

    // Assuming you have a comparePassword method on your User model
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect current password. Access denied." });
    }

    // 3. Apply updates safely
    if (newEmail) {
      const emailExists = await User.findOne({ email: newEmail, _id: { $ne: req.user._id } });
      if (emailExists) return res.status(400).json({ message: "Email is already in use by another account." });
      user.email = newEmail;
    }

    if (newPassword) {
      // Your Mongoose pre-save hook will hash this automatically
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters." });
      }
      user.password = newPassword; 
    }

    if (newWalletAddress) {
      // Basic regex check for an Ethereum/Polygon address format
      const isAddress = /^0x[a-fA-F0-9]{40}$/.test(newWalletAddress);
      if (!isAddress) return res.status(400).json({ message: "Invalid Web3 wallet address format." });
      user.walletAddress = newWalletAddress;
    }

    await user.save();

    res.status(200).json({ message: "Security settings updated successfully." });
  } catch (error) {
    console.error("Settings update error:", error);
    res.status(500).json({ message: "Server error updating security settings." });
  }
};

// PUT /api/users/profile
// Used for everyday, non-sensitive profile edits
exports.updateProfile = async (req, res) => {
  try {
    const { username, profileImage } = req.body;
    
    // Check if username is taken by someone else
    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({ message: "Username is already taken" });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { 
        $set: { 
          ...(username && { username }),
          ...(profileImage && { profileImage })
        } 
      },
      { new: true }
    ).select("-password");

    res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Server error updating profile" });
  }
};
