// client/src/components/AgeGateway.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

const AgeGateway =
  () => {
    const navigate =
      useNavigate();

    const handleEnter =
      () => {
        // In production, save a cookie or localStorage token here with timestamp/IP
        localStorage.setItem(
          "nippy_age_verified",
          "true",
        );
        navigate(
          "/auth/login",
        );
      };

    const handleExit =
      () => {
        window.location.href =
          "https://www.google.com"; // Redirect minors away
      };

    return (
      <div className="min-h-screen bg-nippy-onyx flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-nippy-obsidian border border-gray-800 rounded-2xl p-10 shadow-2xl">
          <div className="flex justify-center mb-6">
            <ShieldAlert className="text-nippy-coral w-16 h-16" />
          </div>

          <h1 className="text-4xl font-bold text-nippy-blush mb-4 tracking-tight">
            18+
          </h1>
          <p className="text-gray-400 mb-10 text-sm leading-relaxed">
            This
            website
            contains
            age-restricted
            adult
            material.
            By
            entering,
            you
            confirm
            that
            you
            are
            at
            least
            18
            years
            of
            age
            or
            the
            age
            of
            majority
            in
            your
            jurisdiction,
            and
            you
            consent
            to
            viewing
            sexually
            explicit
            content.
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={
                handleEnter
              }
              className="w-full bg-nippy-blush text-nippy-onyx font-bold py-4 rounded-xl hover:bg-white transition-colors text-lg"
            >
              I
              am
              18
              or
              older
              -
              Enter
            </button>

            <button
              onClick={
                handleExit
              }
              className="w-full border-2 border-gray-600 text-gray-400 font-bold py-4 rounded-xl hover:border-nippy-coral hover:text-nippy-coral transition-colors text-lg"
            >
              I
              am
              under
              18
              -
              Exit
            </button>
          </div>

          <p className="text-xs text-gray-600 mt-8">
            The
            records
            required
            by
            18
            U.S.C.
            §
            2257
            are
            maintained
            by
            the
            Custodian
            of
            Records.
          </p>
        </div>
      </div>
    );
  };

export default AgeGateway;
