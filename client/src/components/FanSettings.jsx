import React, {
  useState,
} from "react";
import {
  ShieldAlert,
  Mail,
  Lock,
  Wallet,
  Save,
  Loader2,
} from "lucide-react";

const FanSettings =
  () => {
    const [
      formData,
      setFormData,
    ] =
      useState(
        {
          currentPassword:
            "",
          newEmail:
            "",
          newPassword:
            "",
          newWalletAddress:
            "",
        },
      );
    const [
      loading,
      setLoading,
    ] =
      useState(
        false,
      );
    const [
      message,
      setMessage,
    ] =
      useState(
        {
          type: "",
          text: "",
        },
      );

    const handleChange =
      (
        e,
      ) => {
        setFormData(
          {
            ...formData,
            [e
              .target
              .name]:
              e
                .target
                .value,
          },
        );
      };

    const handleSubmit =
      async (
        e,
      ) => {
        e.preventDefault();
        if (
          !formData.currentPassword
        ) {
          setMessage(
            {
              type: "error",
              text: "Current password is required.",
            },
          );
          return;
        }

        setLoading(
          true,
        );
        setMessage(
          {
            type: "",
            text: "",
          },
        );

        try {
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const response =
            await fetch(
              "http://localhost:5000/api/users/settings",
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
                  formData,
                ),
              },
            );

          const data =
            await response.json();

          if (
            response.ok
          ) {
            setMessage(
              {
                type: "success",
                text: data.message,
              },
            );
            // Clear form on success, except perhaps the email if they updated it
            setFormData(
              {
                currentPassword:
                  "",
                newEmail:
                  "",
                newPassword:
                  "",
                newWalletAddress:
                  "",
              },
            );
          } else {
            setMessage(
              {
                type: "error",
                text: data.message,
              },
            );
          }
        } catch (error) {
          setMessage(
            {
              type: "error",
              text: "A network error occurred.",
            },
          );
        } finally {
          setLoading(
            false,
          );
        }
      };

    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8 border-b border-gray-800 pb-4">
          <ShieldAlert
            size={
              28
            }
            className="text-red-500"
          />
          <h1 className="text-2xl font-bold text-slate-200">
            Security
            &
            Settings
          </h1>
        </div>

        <div className="bg-nippy-obsidian border border-red-900/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          {/* Subtle security background stripe */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500"></div>

          <p className="text-sm text-gray-400 mb-8 border-b border-gray-800 pb-4">
            Updates
            to
            your
            email,
            password,
            or
            Web3
            wallet
            address
            require
            your
            current
            password
            to
            authorize.
          </p>

          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-6"
          >
            {/* THE GATEKEEPER INPUT */}
            <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl mb-6">
              <label className="block text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
                <Lock
                  size={
                    16
                  }
                />{" "}
                Current
                Password
                (Required)
              </label>
              <input
                type="password"
                name="currentPassword"
                value={
                  formData.currentPassword
                }
                onChange={
                  handleChange
                }
                className="w-full bg-black border border-red-900 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
                placeholder="Enter current password to authorize changes"
                required
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-white font-bold mb-4">
                New
                Details
                (Leave
                blank
                to
                keep
                current)
              </h3>

              {/* New Email */}
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                  <Mail
                    size={
                      16
                    }
                  />{" "}
                  Update
                  Email
                  Address
                </label>
                <input
                  type="email"
                  name="newEmail"
                  value={
                    formData.newEmail
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full bg-black border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-nippy-coral transition-colors"
                  placeholder="New email address"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                  <Lock
                    size={
                      16
                    }
                  />{" "}
                  Update
                  Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={
                    formData.newPassword
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full bg-black border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-nippy-coral transition-colors"
                  placeholder="New password (min 6 characters)"
                />
              </div>

              {/* New Wallet */}
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                  <Wallet
                    size={
                      16
                    }
                  />{" "}
                  Update
                  Web3
                  Wallet
                  Address
                </label>
                <input
                  type="text"
                  name="newWalletAddress"
                  value={
                    formData.newWalletAddress
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full bg-black border border-gray-700 text-white rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-nippy-coral transition-colors"
                  placeholder="0x..."
                />
              </div>
            </div>

            {message.text && (
              <div
                className={`p-4 rounded-xl font-bold text-sm text-center ${message.type === "error" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"}`}
              >
                {
                  message.text
                }
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                !formData.currentPassword
              }
              className="w-full bg-nippy-coral text-white font-bold py-3 rounded-xl hover:bg-nippy-coralHover transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? (
                <Loader2
                  size={
                    20
                  }
                  className="animate-spin"
                />
              ) : (
                <Save
                  size={
                    20
                  }
                />
              )}
              {loading
                ? "Authorizing..."
                : "Update Security Settings"}
            </button>
          </form>
        </div>
      </div>
    );
  };

export default FanSettings;
