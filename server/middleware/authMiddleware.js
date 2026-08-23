const jwt = require("jsonwebtoken");
const User = require("../models/User");

const requireAuth =
  async (
    req,
    res,
    next,
  ) => {
    let token;

    if (
      req
        .headers
        .authorization &&
      req.headers.authorization.startsWith(
        "Bearer",
      )
    ) {
      try {
        token =
          req.headers.authorization.split(
            " ",
          )[1];

        const decoded =
          jwt.verify(
            token,
            process
              .env
              .JWT_SECRET,
          );

        // Check how your login route signs the token. It's usually decoded.id or decoded.userId.
        // This explicitly maps it to _id so MongoDB can use it.
        const idToSearch =
          decoded.id ||
          decoded.userId ||
          decoded._id;

        req.user =
          await User.findById(
            idToSearch,
          ).select(
            "-passwordHash",
          );

        if (
          !req.user
        ) {
          return res
            .status(
              401,
            )
            .json(
              {
                message:
                  "Not authorized, user not found",
              },
            );
        }

        next();
      } catch (error) {
        if (
          error.name ===
          "TokenExpiredError"
        ) {
          return res
            .status(
              401,
            )
            .json(
              {
                error:
                  "Unauthorized: Token has expired",
              },
            );
        }
        return res
          .status(
            401,
          )
          .json(
            {
              message:
                "Not authorized, token failed",
            },
          );
      }
    }

    if (
      !token
    ) {
      return res
        .status(
          401,
        )
        .json(
          {
            message:
              "Not authorized, no token provided",
          },
        );
    }
  };

// 18 U.S.C. § 2257 Enforcer
const requireVerifiedCreator =
  (
    req,
    res,
    next,
  ) => {
    if (
      req.user &&
      req
        .user
        .role ===
        "creator"
    ) {
      if (
        req
          .user
          .kycStatus ===
        "verified"
      ) {
        next(); // Access granted
      } else {
        res
          .status(
            403,
          )
          .json(
            {
              message:
                "Account restricted. Mandatory KYC verification pending or failed.",
            },
          );
      }
    } else {
      res
        .status(
          403,
        )
        .json(
          {
            message:
              "Access denied. Creator accounts only.",
          },
        );
    }
  };

// =================================================================
// 18+ Geofence & Age Verification Enforcer
// =================================================================
const requireAgeVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized, user not found." });
  }

  // Creators are already KYC-verified by the platform (18 U.S.C. § 2257)
  // If the user is a creator OR a verified fan, let them through.
  if (req.user.role === "creator" || req.user.isAgeVerified === true) {
    next(); 
  } else {
    // Block unverified fans
    res.status(403).json({
      message: "SECURITY BLOCK: Age verification required. Explicit content cannot be requested without a verified ID."
    });
  }
};

module.exports =
  {
    requireAuth,
    requireVerifiedCreator,
    requireAgeVerified,
  };
