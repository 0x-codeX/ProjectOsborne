const requireGodAdmin =
  (
    req,
    res,
    next,
  ) => {
    if (
      !req.user ||
      req
        .user
        .role !==
        "GOD_ADMIN"
    ) {
      return res
        .status(
          403,
        )
        .json(
          {
            message:
              "Access Denied: God Admin clearance required.",
          },
        );
    }
    next();
  };

// NEW: For Super Admins and God Admins ONLY
const requireSuperAdmin =
  (
    req,
    res,
    next,
  ) => {
    const allowedRoles =
      [
        "GOD_ADMIN",
        "SUPER_ADMIN",
      ];
    if (
      !req.user ||
      !allowedRoles.includes(
        req
          .user
          .role,
      )
    ) {
      return res
        .status(
          403,
        )
        .json(
          {
            message:
              "Access Denied: Super Admin clearance required.",
          },
        );
    }
    next();
  };

// Existing: For all admin levels
const requireAnyAdmin =
  (
    req,
    res,
    next,
  ) => {
    const allowedRoles =
      [
        "GOD_ADMIN",
        "SUPER_ADMIN",
        "MODERATE_ADMIN",
      ];
    if (
      !req.user ||
      !allowedRoles.includes(
        req
          .user
          .role,
      )
    ) {
      return res
        .status(
          403,
        )
        .json(
          {
            message:
              "Access Denied: Administrative clearance required.",
          },
        );
    }
    next();
  };

module.exports =
  {
    requireGodAdmin,
    requireSuperAdmin,
    requireAnyAdmin,
  };
