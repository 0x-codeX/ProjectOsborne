const jwt = require("jsonwebtoken");
const User = require("../models/User");

const requireAuth =
  (
    req,
    res,
    next,
  ) => {
    // 1. Extract the Authorization header
    const authHeader =
      req
        .headers
        .authorization;

    // 2. Format Check: Must exist and start with 'Bearer '
    if (
      !authHeader ||
      !authHeader.startsWith(
        "Bearer ",
      )
    ) {
      return res
        .status(
          401,
        )
        .json(
          {
            error:
              "Unauthorized: Missing or invalid token format",
          },
        );
    }

    // 3. Isolate the actual token string
    const token =
      authHeader.split(
        " ",
      )[1];

    try {
      // 4. Verify and Decode
      // process.env.JWT_SECRET must be defined in your .env file
      const decoded =
        jwt.verify(
          token,
          process
            .env
            .JWT_SECRET,
        );

      // 5. Attach payload to the request
      // Assuming your login route signs the token with { id: user._id }
      req.user =
        decoded;

      // 6. Hand off to the next function (requestWithdrawal)
      next();
    } catch (error) {
      // Distinguish between an expired token and a completely forged one
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
          403,
        )
        .json(
          {
            error:
              "Forbidden: Invalid token",
          },
        );
    }
  };

module.exports =
  {
    requireAuth,
  };

exports.protect =
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

        req.user =
          await User.findById(
            decoded.id,
          ).select(
            "-passwordHash",
          );
        next();
      } catch (error) {
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
              "Not authorized, no token",
          },
        );
    }
  };

// 18 U.S.C. § 2257 Enforcer
exports.requireVerifiedCreator =
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
