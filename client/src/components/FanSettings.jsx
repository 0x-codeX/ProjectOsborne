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
        },
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
      )
        setUser(
          storedData,
        );
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

    // WEB2 UPDATE: Email & Password
    const handleStandardUpdate =
      async (
        e,
      ) => {
        e.preventDefault();
        if (
          !formData.currentPassword
        ) {
          return setMessage(
            {
              type: "error",
              text: "Current password is required.",
            },
          );
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
            setFormData(
              {
                currentPassword:
                  "",
                newEmail:
                  "",
                newPassword:
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

    // WEB3 UPDATE: Cryptographic Wallet Linking
    const handleLinkWallet =
      async () => {
        setMessage(
          {
            type: "",
            text: "",
          },
        );
        try {
          if (
            !window.ethereum
          ) {
            return setMessage(
              {
                type: "error",
                text: "MetaMask is not installed.",
              },
            );
          }

          setLoading(
            true,
          );
          const provider =
            new ethers.BrowserProvider(
              window.ethereum,
            );
          const signer =
            await provider.getSigner();
          const address =
            await signer.getAddress();

          const authMessage = `LINK_WALLET_TO_NIPPY:${address.toLowerCase()}`;
          const signature =
            await signer.signMessage(
              authMessage,
            );

          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const res =
            await fetch(
              "http://localhost:5000/api/auth/link-wallet",
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
                    walletAddress:
                      address,
                    signature,
                  },
                ),
              },
            );

          const data =
            await res.json();
          if (
            res.ok
          ) {
            setMessage(
              {
                type: "success",
                text: "Wallet successfully linked!",
              },
            );
            const updatedUser =
              {
                ...user,
                walletAddress:
                  address.toLowerCase(),
              };
            setUser(
              updatedUser,
            );
            localStorage.setItem(
              "nippy_user",
              JSON.stringify(
                updatedUser,
              ),
            );
          } else {
            setMessage(
              {
                type: "error",
                text: data.message,
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
                text: "Signature rejected.",
              },
            );
          } else {
            setMessage(
              {
                type: "error",
                text: "Failed to link wallet.",
              },
            );
          }
        } finally {
          setLoading(
            false,
          );
        }
      };

    const handleDeleteAccount =
      async () => {
        /* Retain your existing deletion logic here */
      };

    if (
      !user
    )
      return null;

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

        <div className="bg-nippy-obsidian border border-red-900/30 rounded-2xl p-6 shadow-xl relative overflow-hidden mb-8">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500"></div>
          <h2 className="text-white font-bold mb-4">
            Web2
            Credentials
          </h2>

          <form
            onSubmit={
              handleStandardUpdate
            }
            className="space-y-6"
          >
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
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                !formData.currentPassword
              }
              className="w-full bg-nippy-coral text-white font-bold py-3 rounded-xl hover:bg-nippy-coralHover transition-all flex justify-center items-center gap-2 disabled:opacity-50 mt-4"
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
              Update
              Web2
              Settings
            </button>
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative mb-8">
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <Wallet className="text-emerald-500" />{" "}
            Web3
            Integration
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Link
            a
            MetaMask
            wallet
            to
            sign
            in
            with
            Web3
            or
            process
            crypto
            transactions.
          </p>

          {user.walletAddress ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-500 font-bold mb-1">
                  Linked
                  Wallet
                </p>
                <p className="font-mono text-white text-sm">
                  {
                    user.walletAddress
                  }
                </p>
              </div>
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
            </div>
          ) : (
            <button
              onClick={
                handleLinkWallet
              }
              disabled={
                loading
              }
              className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2"
            >
              <Wallet
                size={
                  20
                }
              />{" "}
              Link
              MetaMask
              Wallet
            </button>
          )}
        </div>

        {message.text && (
          <div
            className={`p-4 rounded-xl font-bold text-sm text-center mb-8 ${
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

        {/* DANGER ZONE - Keep your existing block here */}
      </div>
    );
  };

export default FanSettings;
