import React, {
  useState,
  useEffect,
} from "react";
import {
  ShieldAlert,
  Mail,
  Lock,
  Wallet,
  Save,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";

const FanSettings =
  () => {
    const navigate =
      useNavigate();
    const [
      user,
      setUser,
    ] =
      useState(
        null,
      );

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

    // Deletion state management
    const [
      showDeleteConfirm,
      setShowDeleteConfirm,
    ] =
      useState(
        false,
      );
    const [
      deletePassword,
      setDeletePassword,
    ] =
      useState(
        "",
      );

    useEffect(() => {
      const storedData =
        JSON.parse(
          localStorage.getItem(
            "nippy_user",
          ),
        );
      if (
        storedData
      ) {
        setUser(
          storedData,
        );
      }
    }, []);

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
            // Clear form on success
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

    const handleDeleteAccount =
      async () => {
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
            ) ||
            localStorage.getItem(
              "token",
            );
          let payload =
            {};

          if (
            user?.walletAddress
          ) {
            if (
              !window.ethereum
            ) {
              setMessage(
                {
                  type: "error",
                  text: "MetaMask wallet is required to sign the deletion request.",
                },
              );
              return;
            }
            let targetProvider =
              window.ethereum;
            if (
              window
                .ethereum
                .providers
                ?.length
            ) {
              targetProvider =
                window.ethereum.providers.find(
                  (
                    p,
                  ) =>
                    p.isMetaMask,
                ) ||
                window
                  .ethereum
                  .providers[0];
            }
            const provider =
              new ethers.BrowserProvider(
                targetProvider,
              );
            const signer =
              await provider.getSigner();
            const deletionMessage = `CONFIRM_ACCOUNT_DELETION: I confirm that I want to permanently delete my Nippy account (${user.walletAddress.toLowerCase()}).`;
            const signature =
              await signer.signMessage(
                deletionMessage,
              );
            payload =
              {
                signature,
              };
          } else {
            if (
              !deletePassword
            ) {
              setMessage(
                {
                  type: "error",
                  text: "Please enter your password to confirm deletion.",
                },
              );
              return;
            }
            payload =
              {
                password:
                  deletePassword,
              };
          }

          const res =
            await fetch(
              "http://localhost:5000/api/users/profile",
              {
                method:
                  "DELETE",
                headers:
                  {
                    "Content-Type":
                      "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                body: JSON.stringify(
                  payload,
                ),
              },
            );

          if (
            res.ok
          ) {
            localStorage.clear();
            navigate(
              "/home",
            );
          } else {
            const data =
              await res.json();
            setMessage(
              {
                type: "error",
                text:
                  data.message ||
                  "Failed to delete account.",
              },
            );
          }
        } catch (err) {
          if (
            err.code ===
            "ACTION_REJECTED"
          ) {
            setMessage(
              {
                type: "error",
                text: "You rejected the signature request in MetaMask.",
              },
            );
          } else {
            setMessage(
              {
                type: "error",
                text: "Error processing account deletion.",
              },
            );
          }
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
                className={`p-4 rounded-xl font-bold text-sm text-center ${
                  message.type ===
                  "error"
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-green-500/10 text-green-400 border border-green-500/20"
                }`}
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

          {/* DANGER ZONE - Compact & Multi-Step */}
          <div className="mt-8 border border-red-900/40 rounded-xl bg-red-950/20 p-5">
            <h3 className="text-base font-bold text-red-500 mb-2">
              Danger
              Zone
            </h3>

            {!showDeleteConfirm ? (
              <button
                onClick={() =>
                  setShowDeleteConfirm(
                    true,
                  )
                }
                className="text-sm bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Delete
                Account
              </button>
            ) : (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-slate-300 text-xs leading-relaxed mb-4 border-l-2 border-red-500 pl-3">
                  Deleting
                  your
                  account
                  is
                  permanent.
                  This
                  will
                  erase
                  your
                  profile,
                  revoke
                  your
                  Creator
                  Vault
                  access,
                  remove
                  your
                  uploaded
                  content,
                  cancel
                  your
                  subscriptions,
                  and
                  permanently
                  wipe
                  your
                  account
                  data.
                </p>

                {(!user ||
                  !user.walletAddress) && (
                  <input
                    type="password"
                    placeholder="Enter your password to confirm"
                    value={
                      deletePassword
                    }
                    onChange={(
                      e,
                    ) =>
                      setDeletePassword(
                        e
                          .target
                          .value,
                      )
                    }
                    className="w-full bg-slate-900 border border-red-900/50 rounded-lg py-2 px-4 text-white text-sm mb-4 focus:outline-none focus:border-red-500"
                  />
                )}

                <div className="flex gap-3">
                  <button
                    onClick={
                      handleDeleteAccount
                    }
                    className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
                  >
                    {user?.walletAddress
                      ? "Sign in MetaMask to Delete"
                      : "Confirm Deletion"}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(
                        false,
                      );
                      setDeletePassword(
                        "",
                      );
                      setMessage(
                        {
                          type: "",
                          text: "",
                        },
                      );
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

export default FanSettings;
