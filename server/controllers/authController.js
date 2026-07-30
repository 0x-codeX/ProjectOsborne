// server/controllers/authController.js
const crypto = require("crypto");
const User = require("../models/User");
const bcrypt = require("bcryptjs"); // For password hashing
const jwt = require("jsonwebtoken"); // For token generation



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
        .JWT_SECRET ||
        "nippy_super_secret_key_2026",
      {
        expiresIn:
          "30d",
      },
    );
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