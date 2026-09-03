// server/controllers/authController.js
const crypto = require("crypto");
const User = require("../models/User");
const bcrypt = require("bcryptjs"); // For password hashing
const jwt = require("jsonwebtoken");
const axios = require("axios");
const {
  sendEmail,
} = require("../utils/emailService");


// Generate JWT with a 30-day expiration
const generateToken =
  (
    id,
    role,
  ) => {
    return jwt.sign(
      {
        id,
        role,
      },
      process
        .env
        .JWT_SECRET,
      {
        expiresIn:
          "30d",
      },
    );
  };

const generateFallbackUsername =
    async () => {
      let isUnique = false;
      let newUsername =
        "";
      while (
        !isUnique
      ) {
        newUsername = `user${Math.floor(10000 + Math.random() * 90000)}`;
        const exists =
          await User.findOne(
            {
              username:
                newUsername,
            },
          );
        if (
          !exists
        )
          isUnique = true;
      }
      return newUsername;
    };

// @desc    Register a new user (Fan or Creator)
// @route   POST /api/auth/register
exports.registerUser =
  async (
    req,
    res,
  ) => {
    try {
      const {
        email,
        password,
        role,
      } =
        req.body;

      if (
        !email ||
        !password
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "Please add all fields",
            },
          );
      }

      // Check if user exists
      const userExists =
        await User.findOne(
          {
            email,
          },
        );
      if (
        userExists
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              message:
                "User already exists",
            },
          );
      }

      const generatedUsername =
        await generateFallbackUsername();
        await User.create(
          {
            email,
            passwordHash:
              hashedPassword,
            role:
              role ||
              "fan",
            username:
              generatedUsername, // <-- ADDED
          },
        );

      // Hash password securely
      const salt =
        await bcrypt.genSalt(
          10,
        );
      const hashedPassword =
        await bcrypt.hash(
          password,
          salt,
        );

      // Create user in the database
      const user =
        await User.create(
          {
            email,
            passwordHash:
              hashedPassword,
            role:
              role ||
              "fan", // Default to fan if not specified
          },
        );

      if (
        user
      ) {
        res
          .status(
            201,
          )
          .json(
            {
              _id: user.id,
              email:
                user.email,
              role: user.role,
              username:
                user.username,
              hasCompletedBioData:
                user.hasCompletedBioData,
              isAgeVerified:
                user.isAgeVerified,
              token:
                generateToken(
                  user._id,
                  user.role,
                ),
            },
          );
      } else {
        res
          .status(
            400,
          )
          .json(
            {
              message:
                "Invalid user data",
            },
          );
      }
    } catch (error) {
      if (
        error.code ===
        11000
      ) {
        const duplicateField =
          Object.keys(
            error.keyValue,
          )[0];
        const duplicateValue =
          error
            .keyValue[
            duplicateField
          ];
        return res
          .status(
            409,
          )
          .json(
            {
              message: `The ${duplicateField} '${duplicateValue}' is already in use. Please choose another.`,
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
              "Server Error",
            error:
              error.message,
          },
        );
    }
  };

// @desc    Authenticate a user
// @route   POST /api/auth/login
exports.loginUser =
  async (
    req,
    res,
  ) => {
    try {
      const {
        email,
        password,
      } =
        req.body;

      const user =
        await User.findOne(
          {
            email,
          },
        );

      // Compare incoming password with hashed password
      if (
        user &&
        (await bcrypt.compare(
          password,
          user.passwordHash,
        ))
      ) {
        res.json(
          {
            _id: user.id,
            email:
              user.email,
            role: user.role,
            username:
              user.username,
            hasCompletedBioData:
              user.hasCompletedBioData,
            isAgeVerified:
              user.isAgeVerified,
            token:
              generateToken(
                user._id,
                user.role,
              ),
          },
        );
      } else {
        res
          .status(
            401,
          )
          .json(
            {
              message:
                "Invalid credentials",
            },
          );
      }
    } catch (error) {
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server Error",
            error:
              error.message,
          },
        );
    }
  };

const {
  ethers,
} = require("ethers");

// 1. Generate the Nonce and Sync the User
exports.getWeb3Nonce = async (req, res) => {
  try {
    const { walletAddress } = req.query;
    if (!walletAddress) {
      return res.status(400).json({ message: "Wallet address required" });
    }

    const cleanAddress = walletAddress.toLowerCase();
    
    // Generate a secure, random hex string (looks exactly like the one you posted)
    const nonce = crypto.randomBytes(16).toString('hex');

    const generatedUsername =
      await generateFallbackUsername();
    if (
      !user
    ) {
      user =
        await User.create(
          {
            walletAddress:
              cleanAddress,
            nonce:
              nonce,
            role: "fan",
            hasCompletedBioData: false,
            username:
              generatedUsername, // <-- ADDED
          },
        );
    }

    let user = await User.findOne({ walletAddress: cleanAddress });

    // CRITICAL FIX: If the user doesn't exist, we MUST create them now 
    // so the nonce is saved in the database for the login route to verify.
    if (!user) {
      user = await User.create({
        walletAddress: cleanAddress,
        nonce: nonce,
        role: 'fan', // Temporary default, updated during login
        hasCompletedBioData: false
      });
    } else {
      user.nonce = nonce;
      await user.save();
    }

    // This exact string will be sent to the frontend to sign
    const message = `Welcome to Nippy.\n\nSign this one-time challenge to securely log in. This costs zero gas.\n\nNonce: ${nonce}`;
    
    res.status(200).json({ message });
  } catch (error) {
    console.error("Nonce generation error:", error);
    res.status(500).json({ message: "Server error generating nonce" });
  }
};


// 2. Verify the Signature
exports.web3Login = async (req, res) => {
  try {
    const { walletAddress, signature, role } = req.body;

    if (!walletAddress || !signature) {
      return res.status(400).json({ message: "Wallet address and signature required." });
    }

    const cleanAddress = walletAddress.toLowerCase();
    const user = await User.findOne({ walletAddress: cleanAddress });

    if (!user || !user.nonce) {
      return res.status(400).json({ message: "Invalid session. Please request a new signature challenge." });
    }

    // THE PERFECT MATCH: We reconstruct the exact same string from step 1 using the saved nonce
    const expectedMessage = `Welcome to Nippy.\n\nSign this one-time challenge to securely log in. This costs zero gas.\n\nNonce: ${user.nonce}`;

    // Recover the address from the signature
    const recoveredAddress = ethers.verifyMessage(expectedMessage, signature);

    if (recoveredAddress.toLowerCase() !== cleanAddress) {
      return res.status(401).json({ message: "Cryptographic signature verification failed." });
    }

    // If we reach here, they are authenticated!
    // 1. Rotate the nonce for security (prevents replay attacks)
    user.nonce = crypto.randomBytes(16).toString('hex');
    
    // 2. If they just signed up via the modal, update their intended role
    let isNewUser = false;
    if (!user.hasCompletedBioData) {
      isNewUser = true;
      if (role && role !== user.role) {
        user.role = role;
      }
    }
    
    await user.save();

    // 3. Issue the JWT
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(200).json({
      message: "Web3 Login successful",
      token,
      user,
      isNewUser
    });

  } catch (error) {
    console.error("Web3 Login Error:", error);
    res.status(500).json({ message: "Server error verifying signature." });
  }
};

// @desc    Get current logged in user data
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    // Look for id (from requireAuth decoded JWT) OR _id (from protect full document)
    const userId = req.user.id || req.user._id;
    
    if (!userId) {
      return res.status(401).json({ message: "Malformed token: no user ID found." });
    }

    const user = await User.findById(userId).select("-passwordHash -nonce"); 
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("GET /me Error:", error);
    res.status(500).json({ message: "Server error retrieving user data" });
  }
};

// @desc    Link Email & Password to an existing Web3 account
// @route   PUT /api/auth/link-email
// @access  Private (Requires JWT token)
exports.linkEmailToAccount = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id; 
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Ensure this email isn't already attached to another account
    const emailExists = await User.findOne({ email: cleanEmail });
    if (emailExists) {
      return res.status(409).json({ message: "This email is already in use by another account." });
    }

    // 2. Fetch the current logged-in user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 3. Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Update the existing user document
    user.email = cleanEmail;
    user.passwordHash = hashedPassword;
    
    await user.save();

    res.status(200).json({ 
      message: "Email and password successfully linked to your account.",
      user: {
        _id: user._id,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Link Email Error:", error);
    res.status(500).json({ message: "Server error linking email.", error: error.message });
  }
};

// PUT /api/auth/link-wallet
exports.linkWalletToAccount = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      return res.status(400).json({ message: "Wallet address and signature required." });
    }

    const cleanAddress = walletAddress.toLowerCase();

    // 1. Check if this wallet is already hijacked/used by another account
    const walletExists = await User.findOne({ walletAddress: cleanAddress });
    if (walletExists && walletExists._id.toString() !== userId.toString()) {
      return res.status(409).json({ message: "This wallet is already linked to another account." });
    }

    // 2. Cryptographic Proof of Ownership
    const expectedMessage = `LINK_WALLET_TO_NIPPY:${cleanAddress}`;
    const recoveredAddress = ethers.verifyMessage(expectedMessage, signature);

    if (recoveredAddress.toLowerCase() !== cleanAddress) {
      return res.status(401).json({ message: "Cryptographic signature verification failed." });
    }

    // 3. Bind the wallet
    const user = await User.findById(userId);
    user.walletAddress = cleanAddress;
    await user.save();

    res.status(200).json({ message: "Wallet successfully linked to your account.", user });
  } catch (error) {
    console.error("Link Wallet Error:", error);
    res.status(500).json({ message: "Server error linking wallet." });
  }
};

// @desc    Authenticate with Google OAuth
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = async (req, res) => {
  try {
    const { credential, role } = req.body; // 'credential' is the access_token from React

    if (!credential) {
      return res.status(400).json({ message: "No credential provided." });
    }

    // 1. Verify token with Google's UserInfo endpoint
    const googleResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${credential}` },
    });

    if (!googleResponse.ok) {
      throw new Error("Failed to verify token with Google");
    }

    const payload = await googleResponse.json();
    const { email, sub: googleId } = payload;

    // 2. Check if the user already exists in Nippy
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      // 3. Create a new user if they don't exist
      isNewUser = true;
      user = new User({
        email,
        googleId,
        role: role || "fan",
        isEmailVerified: true,
        hasCompletedBioData: false,
        isAgeVerified: false,
      });
      await user.save();
    }

    // 4. Generate your platform's JWT using the helper at the top of your file
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      token,
      user,
      isNewUser,
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ message: "Google authentication failed. Invalid token." });
  }
};

// @desc    Generate & Send Verification OTP
// @route   POST /api/auth/send-otp
exports.sendVerificationOtp = async (req, res) => {
  try {
    const user = await User.findById(req.user.id); // Assuming protected route
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP before saving to DB to prevent database breaches exposing valid OTPs
    const salt = await bcrypt.genSalt(10);
    user.emailVerificationOtp = await bcrypt.hash(otp, salt);
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now
    
    await user.save();

    // Fire and forget email delivery
    await sendEmail({
      to: user.email,
      subject: "Verify your Nippy Account",
      text: `Your verification code is: ${otp}. It expires in 10 minutes.`
    });

    res.status(200).json({ message: "OTP sent successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error sending OTP." });
  }
};

// @desc    Verify the OTP
// @route   POST /api/auth/verify-otp
exports.verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    // Explicitly select the hidden OTP field
    const user = await User.findById(req.user.id).select("+emailVerificationOtp +otpExpires");
    
    if (!user.emailVerificationOtp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP is invalid or has expired." });
    }

    const isMatch = await bcrypt.compare(otp, user.emailVerificationOtp);
    if (!isMatch) return res.status(400).json({ message: "Incorrect OTP." });

    user.isEmailVerified = true;
    user.emailVerificationOtp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Email successfully verified." });
  } catch (error) {
    res.status(500).json({ message: "Error verifying OTP." });
  }
};

// @desc    Initiate Password Reset
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    // Always return 200 even if user doesn't exist to prevent email enumeration attacks
    if (!user) return res.status(200).json({ message: "If that email exists, a reset link was sent." });

    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // Hash token for database storage
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      text: `Reset your password by clicking here: ${resetUrl}`
    });

    res.status(200).json({ message: "If that email exists, a reset link was sent." });
  } catch (error) {
    res.status(500).json({ message: "Error processing request." });
  }
};

// @desc    Execute Password Reset
// @route   PUT /api/auth/reset-password/:token
exports.resetPassword = async (req, res) => {
  try {
    // Reconstruct the hash from the raw token in the URL params
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired reset token." });

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(req.body.password, salt);
    
    // Clean up reset fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: "Server error resetting password." });
  }
};