import React, {
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import api from "../utils/api";

const VerificationCallback =
  () => {
    const navigate =
      useNavigate();
    const [
      status,
      setStatus,
    ] =
      useState(
        "checking",
      ); // checking, success, failed

    useEffect(() => {
      const verifyStatus =
        async () => {
          try {
            // Wait 3 seconds to ensure the Didit webhook hit your backend first
            setTimeout(
              async () => {
                const res =
                  await api.get(
                    "/age-verification/status",
                  );

                if (
                  res
                    .data
                    .ageData
                    .isAgeVerified
                ) {
                  // Update local storage user cache
                  const user =
                    JSON.parse(
                      localStorage.getItem(
                        "nippy_user",
                      ) ||
                        "{}",
                    );
                  user.isAgeVerified = true;
                  localStorage.setItem(
                    "nippy_user",
                    JSON.stringify(
                      user,
                    ),
                  );

                  setStatus(
                    "success",
                  );
                  setTimeout(
                    () =>
                      navigate(
                        "/feed",
                      ),
                    2000,
                  );
                } else {
                  setStatus(
                    "failed",
                  );
                  setTimeout(
                    () =>
                      navigate(
                        "/feed",
                      ),
                    4000,
                  );
                }
              },
              3000,
            );
          } catch (error) {
            console.error(
              "Status check failed",
              error,
            );
            setStatus(
              "failed",
            );
            setTimeout(
              () =>
                navigate(
                  "/feed",
                ),
              4000,
            );
          }
        };

      verifyStatus();
    }, [
      navigate,
    ]);

    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        {status ===
          "checking" && (
          <div className="text-center animate-pulse">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              Finalizing
              Verification...
            </h2>
            <p className="text-slate-400">
              Please
              wait
              while
              we
              confirm
              your
              status.
            </p>
          </div>
        )}

        {status ===
          "success" && (
          <div className="text-center animate-in zoom-in">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Verification
              Complete!
            </h2>
            <p className="text-slate-400">
              Redirecting
              you
              back
              to
              your
              feed...
            </p>
          </div>
        )}

        {status ===
          "failed" && (
          <div className="text-center animate-in zoom-in">
            <XCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Verification
              Failed
            </h2>
            <p className="text-slate-400">
              We
              could
              not
              verify
              your
              age.
              Redirecting...
            </p>
          </div>
        )}
      </div>
    );
  };

export default VerificationCallback;
