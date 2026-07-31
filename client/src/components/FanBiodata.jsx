import React, {
  useState,
} from "react";
import { useNavigate } from "react-router-dom";


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
          const token =
            localStorage.getItem(
              "nippy_token",
            );

          // 1. Send the native fetch call
          const response =
            await fetch(
              "http://localhost:5000/api/users/biodata",
              {
                method:
                  "PUT",
                headers:
                  {
                    Authorization: `Bearer ${token}`,
                    "Content-Type":
                      "application/json",
                  },
                body: JSON.stringify(
                  {
                    username,
                    // Match the backend variable names exactly:
                    confirmedAge: true,
                    agreedTerms: true,
                    // You can keep this here if your user schema relies on it for routing later
                    isAgeVerified: true,
                  },
                ),
              },
            );

          // 🚨 NEW ERROR HANDLING: Parse the backend's exact complaint
          if (
            !response.ok
          ) {
            const errorData =
              await response
                .json()
                .catch(
                  () => ({}),
                );
            console.error(
              "BACKEND REJECTION:",
              errorData,
            );
            throw new Error(
              errorData.message ||
                "Server rejected the profile update.",
            );
          }

          const data =
            await response.json();

          // 2. Crucial Step: Update the user object in localStorage!
          // If you don't do this, the frontend still thinks they are unverified until they log out.
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
          setError(
            err.message ||
              "Failed to update profile. Try again.",
          );
        }
      };

    return (
      <div className="max-w-md mx-auto mt-12 p-6 border rounded-lg bg-white shadow-sm">
        <h2 className="text-2xl font-bold mb-6">
          Complete
          Your
          Fan
          Profile
        </h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
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
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">
              Pick
              a
              Username
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-black"
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
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 mr-3 w-5 h-5 cursor-pointer"
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
              <span className="text-sm text-gray-800">
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
            className={`w-full py-3 rounded font-bold text-white transition-colors ${
              isOver18
                ? "bg-black hover:bg-gray-800"
                : "bg-gray-400 cursor-not-allowed"
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
