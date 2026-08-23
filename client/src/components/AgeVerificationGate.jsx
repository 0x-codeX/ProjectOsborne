import React, {
  useState,
} from "react";
import {
  ShieldAlert,
  UserCheck,
  CreditCard,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import api from "../utils/api";

const AgeVerificationGate =
  ({
    isOpen,
    onClose,
    onVerificationStarted,
  }) => {
    const [
      loading,
      setLoading,
    ] =
      useState(
        false,
      );
    const [
      error,
      setError,
    ] =
      useState(
        "",
      );
    const [
      bypassAvailable,
      setBypassAvailable,
    ] =
      useState(
        false,
      );

    if (
      !isOpen
    )
      return null;

    const handleStartDidit =
      async () => {
        setLoading(
          true,
        );
        setError(
          "",
        );

        try {
          const response =
            await api.post(
              "/age-verification/start",
            );

          if (
            response
              .data
              .action ===
            "bypass_available"
          ) {
            setBypassAvailable(
              true,
            );
            setLoading(
              false,
            );
            return;
          }

          if (
            response
              .data
              .verification_url
          ) {
            // Notify parent, then redirect the user to Didit's secure environment
            if (
              onVerificationStarted
            )
              onVerificationStarted();
            window.location.href =
              response.data.verification_url;
          }
        } catch (err) {
          console.error(
            "Verification error:",
            err,
          );
          setError(
            "Failed to initialize verification. Please try again.",
          );
          setLoading(
            false,
          );
        }
      };

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="text-rose-500 w-5 h-5" />{" "}
              Age
              Verification
              Required
            </h3>
            <button
              onClick={
                onClose
              }
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              disabled={
                loading
              }
            >
              <X
                size={
                  24
                }
              />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-300 text-center leading-relaxed mb-6">
              To
              comply
              with
              local
              laws
              and
              keep
              our
              platform
              safe,
              you
              must
              verify
              that
              you
              are
              18
              or
              older
              before
              unlocking
              explicit
              content.
            </p>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs flex items-center gap-2">
                <AlertTriangle
                  size={
                    16
                  }
                />{" "}
                {
                  error
                }
              </div>
            )}

            {bypassAvailable ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                <UserCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-emerald-400 font-bold mb-1">
                  Safe
                  Jurisdiction
                  Detected
                </h4>
                <p className="text-xs text-slate-400">
                  You
                  are
                  in
                  a
                  region
                  that
                  does
                  not
                  require
                  strict
                  ID
                  checks.
                  (Self-attestation
                  bypass
                  coming
                  soon!)
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={
                    handleStartDidit
                  }
                  disabled={
                    loading
                  }
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-between transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <UserCheck
                      size={
                        20
                      }
                    />
                    <div className="text-left">
                      <div className="text-sm">
                        Verify
                        Anonymously
                        via
                        Didit
                      </div>
                      <div className="text-[10px] text-blue-200 font-normal">
                        Takes
                        60
                        seconds.
                        We
                        don't
                        store
                        your
                        ID.
                      </div>
                    </div>
                  </div>
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ShieldAlert
                      size={
                        16
                      }
                      className="opacity-50"
                    />
                  )}
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-700"></div>
                  <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase font-bold">
                    OR
                  </span>
                  <div className="flex-grow border-t border-slate-700"></div>
                </div>

                <button
                  onClick={
                    onClose
                  }
                  disabled={
                    loading
                  }
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-3.5 px-4 rounded-xl flex items-center gap-3 transition-all disabled:opacity-50"
                >
                  <CreditCard
                    size={
                      20
                    }
                    className="text-emerald-400"
                  />
                  <div className="text-left">
                    <div className="text-sm">
                      Pay
                      with
                      Fiat
                      /
                      Card
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      Banks
                      verify
                      your
                      age
                      automatically.
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

export default AgeVerificationGate;
