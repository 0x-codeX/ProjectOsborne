import React, {
  useState,
} from "react";
import {
  ShieldCheck,
  User,
  Camera,
  FileText,
  Lock,
} from "lucide-react";
import api from "../utils/api";



const KycPage =
  () => {
    const [
      verificationStatus,
      setVerificationStatus,
    ] =
      useState(
        "idle",
      ); // idle, processing, success, error
    const [
      error,
      setError,
    ] =
      useState(
        "",
      );

    const startKycSession =
      async () => {
        setVerificationStatus(
          "processing",
        );
        setError(
          "",
        );

        try {
          // Pull the user ID we saved during the Web3 login
          const user =
            JSON.parse(
              localStorage.getItem(
                "nippy_user",
              ),
            );

          if (
            !user ||
            !user._id
          ) {
            throw new Error(
              "Authentication error. Please log in again.",
            );
          }

          const response =
            await api.post(
              "/auth/kyc/start-session",
              {
                userId:
                  user._id,
              },
            );

          if (
            response.data &&
            response
              .data
              .url
          ) {
            window.location.href =
              response.data.url;
          } else {
            throw new Error(
              "Failed to initialize gateway.",
            );
          }
        } catch (err) {
          console.error(
            err,
          );
          setError(
            err.message,
          );
          setVerificationStatus(
            "error",
          );
        }
      };

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-slate-200">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            Creator
            Verification
          </h1>
          <p className="text-slate-400 max-w-md mx-auto">
            To
            maintain
            a
            secure
            ecosystem
            and
            comply
            with
            18
            U.S.C.
            §
            2257,
            we
            require
            a
            one-time
            identity
            verification.
          </p>
        </div>

        {/* KYC Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex items-center justify-center w-16 h-16 bg-slate-800 rounded-full mb-6 mx-auto">
            <ShieldCheck className="w-8 h-8 text-[#FF5757]" />{" "}
            {/* Electric Coral */}
          </div>

          <h2 className="text-xl font-semibold text-center text-white mb-6">
            Identity
            Requirements
          </h2>

          <div className="space-y-4 mb-8">
            <div className="flex items-start">
              <User className="w-5 h-5 text-[#FF5757] mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-white">
                  Government
                  ID
                </h3>
                <p className="text-sm text-slate-400">
                  Valid
                  Passport,
                  Driver's
                  License,
                  or
                  National
                  ID.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <Camera className="w-5 h-5 text-[#FF5757] mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-white">
                  Liveness
                  Check
                </h3>
                <p className="text-sm text-slate-400">
                  A
                  quick
                  selfie
                  scan
                  to
                  prove
                  you
                  are
                  the
                  ID
                  owner.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <FileText className="w-5 h-5 text-[#FF5757] mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-white">
                  Legal
                  Age
                </h3>
                <p className="text-sm text-slate-400">
                  You
                  must
                  be
                  strictly
                  18
                  years
                  or
                  older
                  to
                  proceed.
                </p>
              </div>
            </div>
          </div>

          {/* Error Alert Banner */}
          {verificationStatus ===
            "error" &&
            error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                {
                  error
                }
              </div>
            )}

          <button
            onClick={
              startKycSession
            }
            disabled={
              verificationStatus ===
              "processing"
            }
            className="w-full bg-[#FF5757] hover:bg-[#ff4040] text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
          >
            {verificationStatus ===
            "processing" ? (
              <span className="animate-pulse">
                Initializing
                Secure
                Gateway...
              </span>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Start
                Verification
              </>
            )}
          </button>

          <p className="text-xs text-center text-slate-500 mt-6">
            Your
            data
            is
            encrypted
            and
            handled
            by
            our
            certified
            Custodian
            of
            Records.
            We
            do
            not
            store
            raw
            identity
            documents
            on
            our
            servers.
          </p>
        </div>
      </div>
    );
  };

export default KycPage;
