// server/controllers/authController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs"); // For password hashing
const jwt = require("jsonwebtoken"); // For token generation
const crypto = require("crypto");


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

// @desc    Authenticate a user via Web3 Wallet Signature
// @route   POST /api/auth/web3-login
exports.web3Login =
  async (
    req,
    res,
  ) => {
    try {
      const {
        walletAddress,
        signature,
        role,
      } =
        req.body;

      // ... signature verification logic here ...

      let user =
        await User.findOne(
          {
            walletAddress,
          },
        );
      let isNewUser = false;

      if (
        !user
      ) {
        // Create brand new Web3 user
        user =
          await User.create(
            {
              walletAddress,
              role,
              hasCompletedBioData: false, // Crucial for routing
            },
          );
        isNewUser = true;
      }

      const token =
        jwt.sign(
          {
            id: user._id,
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
            isNewUser, // The frontend reads this flag!
          },
        );
    } catch (error) {
      res
        .status(
          500,
        )
        .json(
          {
            message:
              "Server error during Web3 login.",
          },
        );
    }
  };

// @desc    Generate a random nonce for Web3 login challenge
// @route   GET /api/auth/web3-nonce?walletAddress=0x...
exports.getWeb3Nonce = async (req, res) => {
  try {
    const { walletAddress } = req.query;
    
    if (!walletAddress) {
      return res.status(400).json({ message: "Wallet address required" });
    }

    // Generate a secure, one-time random string
    const nonce = crypto.randomBytes(16).toString("hex");
    const message = `Welcome to Nippy.\n\nSign this one-time challenge to securely log in. This costs zero gas.\n\nNonce: ${nonce}`;

    // Find user or create a temporary record just to hold the nonce
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    
    if (!user) {
      // If they don't exist yet, we create a skeleton record to store the nonce.
      // We will fill in the rest of their details during the actual login step.
      user = await User.create({
        email: `${walletAddress.toLowerCase()}@web3.nippy.com`,
        passwordHash: crypto.randomBytes(32).toString("hex"), // Dummy hash
        walletAddress: walletAddress.toLowerCase(),
        role: "fan", // Temporary default
        nonce: message // <--- Ensure your MongoDB User schema has a 'nonce' String field
      });
    } else {
      user.nonce = message;
      await user.save();
    }

    res.status(200).json({ message: user.nonce });
  } catch (error) {
    res.status(500).json({ message: "Error generating nonce", error: error.message });
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