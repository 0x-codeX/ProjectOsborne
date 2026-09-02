import React, {
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";


const FanBiodata =
  () => {
    const navigate =
      useNavigate();
    const [
      username,
      setUsername,
    ] =
      useState(
        "",
      );
    const [
      isOver18,
      setIsOver18,
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

    const handleSubmit =
      async (
        e,
      ) => {
        e.preventDefault();
        setError(
          "",
        );

        if (
          !isOver18
        ) {
          setError(
            "You must be 18 or older to access this platform.",
          );
          return;
        }

        try {
          // 1. Send the request using your configured api interceptor
          // It automatically handles the localhost vs Render routing and attaches the token
          const response =
            await api.put(
              "/users/biodata",
              {
                username,
                confirmedAge: true,
                agreedTerms: true,
                isAgeVerified: true,
              },
            );

          const data =
            response.data;

          // 2. Crucial Step: Update the user object in localStorage!
          const storedUser =
            JSON.parse(
              localStorage.getItem(
                "nippy_user",
              ),
            ) ||
            {};
          storedUser.username =
            username;
          storedUser.isAgeVerified = true;
          localStorage.setItem(
            "nippy_user",
            JSON.stringify(
              storedUser,
            ),
          );

          // 3. Drop them into the feed
          navigate(
            "/feed",
          );
        } catch (err) {
          console.error(
            "Biodata update error:",
            err,
          );
          // Safely parse Axios error responses
          setError(
            err
              .response
              ?.data
              ?.message ||
              err.message ||
              "Failed to update profile. Try again.",
          );
        }
      };

    return (
      <div className="max-w-md mx-auto mt-12 p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">
          Complete
          Your
          Fan
          Profile
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-4 font-bold text-sm">
            {
              error
            }
          </div>
        )}

        <form
          onSubmit={
            handleSubmit
          }
        >
          <div className="mb-6">
            <label className="block text-slate-300 font-bold mb-2 text-sm">
              Pick
              a
              Username
            </label>
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
              value={
                username
              }
              onChange={(
                e,
              ) =>
                setUsername(
                  e
                    .target
                    .value,
                )
              }
              required
              placeholder="e.g. CryptoKing99"
            />
          </div>

          {/* THE AGE GATE */}
          <div className="mb-6 p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <label className="flex items-start cursor-pointer group">
              <input
                type="checkbox"
                className="mt-1 mr-3 w-5 h-5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer shrink-0"
                checked={
                  isOver18
                }
                onChange={(
                  e,
                ) =>
                  setIsOver18(
                    e
                      .target
                      .checked,
                  )
                }
              />
              <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">
                I
                confirm
                that
                I
                am
                at
                least
                18
                years
                old
                and
                consent
                to
                viewing
                adult
                material.
                I
                understand
                that
                misrepresenting
                my
                age
                is
                a
                violation
                of
                the
                Terms
                of
                Service.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={
              !isOver18
            }
            className={`w-full py-3.5 rounded-xl font-bold transition-all ${
              isOver18
                ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            Enter
            the
            Feed
          </button>
        </form>
      </div>
    );
  };

export default FanBiodata;
