// client/src/components/OAuthSuccess.jsx
import React, {
  useEffect,
} from "react";
import {
  useNavigate,
  useLocation,
} from "react-router-dom";

const OAuthSuccess =
  () => {
    const navigate =
      useNavigate();
    const location =
      useLocation();

    useEffect(() => {
      const params =
        new URLSearchParams(
          location.search,
        );
      const token =
        params.get(
          "token",
        );
      const userData =
        params.get(
          "user",
        );

      if (
        token &&
        userData
      ) {
        localStorage.setItem(
          "nippy_token",
          token,
        );

        try {
          const userObj =
            JSON.parse(
              decodeURIComponent(
                userData,
              ),
            );
          localStorage.setItem(
            "nippy_user",
            JSON.stringify(
              userObj,
            ),
          );

          // Route them exactly like the normal login flow
          if (
            userObj.role ===
            "creator"
          ) {
            if (
              userObj.hasCompletedBioData ===
              false
            ) {
              navigate(
                "/auth/creator/biodata",
              );
            } else {
              navigate(
                "/creator/dashboard",
              );
            }
          } else {
            if (
              !userObj.isAgeVerified
            ) {
              navigate(
                "/fan-setup",
              );
            } else {
              navigate(
                "/feed",
              );
            }
          }
        } catch (e) {
          navigate(
            "/?error=invalid_user_data",
          );
        }
      } else {
        navigate(
          "/?error=missing_token",
        );
      }
    }, [
      navigate,
      location,
    ]);

    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-emerald-500">
        <h2 className="text-2xl font-bold animate-pulse">
          Securing
          your
          session...
        </h2>
      </div>
    );
  };

export default OAuthSuccess;
