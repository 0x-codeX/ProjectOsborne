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
  Globe,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";

const COUNTRY_TO_CURRENCY =
  {
    Nigeria:
      "NGN",
    "United States":
      "USD",
    "United Kingdom":
      "GBP",
    Kenya:
      "KES",
    Ghana:
      "GHS",
    default:
      "USD",
  };

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

    // Deletion state
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
          country:
            "",
          preferredCurrency:
            "USD",
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
      ) {
        setUser(
          storedData,
        );

        const autoCurrency =
          COUNTRY_TO_CURRENCY[
            storedData
              .country
          ] ||
          COUNTRY_TO_CURRENCY.default;

        setFormData(
          (
            prev,
          ) => ({
            ...prev,
            country:
              storedData.country ||
              "",
            preferredCurrency:
              storedData.preferredCurrency ||
              autoCurrency,
          }),
        );
      }
    }, []);

    const handleChange =
      (
        e,
      ) => {
        const {
          name,
          value,
        } =
          e.target;
        setFormData(
          (
            prev,
          ) => {
            const newData =
              {
                ...prev,
                [name]:
                  value,
              };

            // Auto-select currency if they change their country
            if (
              name ===
              "country"
            ) {
              newData.preferredCurrency =
                COUNTRY_TO_CURRENCY[
                  value
                ] ||
                COUNTRY_TO_CURRENCY.default;
            }

            return newData;
          },
        );
      };

    // WEB2 UPDATE: Profile Settings
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
              text: "Current password is required to authorize updates.",
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

            // Update local storage user safely
            if (
              user
            ) {
              const updatedUser =
                {
                  ...user,
                  country:
                    formData.country,
                  preferredCurrency:
                    formData.preferredCurrency,
                };
              if (
                formData.newEmail
              )
                updatedUser.email =
                  formData.newEmail;

              setUser(
                updatedUser,
              );
              localStorage.setItem(
                "nippy_user",
                JSON.stringify(
                  updatedUser,
                ),
              );
            }

            setFormData(
              (
                prev,
              ) => ({
                ...prev,
                currentPassword:
                  "",
                newEmail:
                  "",
                newPassword:
                  "",
              }),
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
        setMessage(
          {
            type: "",
            text: "",
          },
        );
        let authPayload =
          {};

        try {
          if (
            user.walletAddress
          ) {
            // --- WEB3 FLOW: Require MetaMask Signature ---
            if (
              !window.ethereum
            )
              throw new Error(
                "MetaMask wallet is required to confirm deletion.",
              );

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

            const expectedMessage = `CONFIRM_ACCOUNT_DELETION: I confirm that I want to permanently delete my Nippy account (${user.walletAddress.toLowerCase()}).`;
            const signature =
              await signer.signMessage(
                expectedMessage,
              );

            authPayload =
              {
                signature,
              };
          } else {
            // --- WEB2 FLOW: Require Password ---
            if (
              !deletePassword
            ) {
              return setMessage(
                {
                  type: "error",
                  text: "Password is required to delete your account.",
                },
              );
            }
            authPayload =
              {
                password:
                  deletePassword,
              };
          }

          setLoading(
            true,
          );
          const token =
            localStorage.getItem(
              "nippy_token",
            ) ||
            localStorage.getItem(
              "token",
            );

          // --- EXECUTE DELETION ---
          const response =
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
                  authPayload,
                ),
              },
            );

          const data =
            await response.json();

          if (
            !response.ok
          ) {
            throw new Error(
              data.message ||
                "Failed to delete account.",
            );
          }

          // --- WIPE LOCAL STATE & REDIRECT ---
          localStorage.removeItem(
            "nippy_user",
          );
          localStorage.removeItem(
            "nippy_token",
          );
          localStorage.removeItem(
            "token",
          );

          navigate(
            "/auth/login",
          );
        } catch (err) {
          console.error(
            "Deletion Error:",
            err,
          );
          if (
            err.code ===
            "ACTION_REJECTED"
          ) {
            setMessage(
              {
                type: "error",
                text: "Signature request rejected. Account deletion cancelled.",
              },
            );
          } else {
            setMessage(
              {
                type: "error",
                text:
                  err.message ||
                  "An error occurred during account deletion.",
              },
            );
          }
        } finally {
          setLoading(
            false,
          );
        }
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

        <form
          onSubmit={
            handleStandardUpdate
          }
        >
          {/* PREFERENCES SECTION */}
          <div className="bg-nippy-obsidian border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
            <h2 className="text-white font-bold mb-6">
              General
              Preferences
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                  <MapPin
                    size={
                      16
                    }
                  />{" "}
                  Location
                  (Country)
                </label>
                <input
                  type="text"
                  name="country"
                  value={
                    formData.country
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full bg-black border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-nippy-coral transition-colors"
                  placeholder="e.g. Nigeria"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                  <Globe
                    size={
                      16
                    }
                    className="text-amber-500"
                  />{" "}
                  Display
                  Currency
                </label>
                <div className="relative">
                  <select
                    name="preferredCurrency"
                    value={
                      formData.preferredCurrency
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full bg-black border border-gray-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-nippy-coral transition-colors appearance-none font-medium"
                  >
                    <option value="USD">
                      USD
                      -
                      US
                      Dollar
                    </option>
                    <option value="NGN">
                      NGN
                      -
                      Nigerian
                      Naira
                    </option>
                    <option value="GHS">
                      GHS
                      -
                      Ghanaian
                      Cedi
                    </option>
                    <option value="GBP">
                      GBP
                      -
                      British
                      Pound
                    </option>
                    <option value="KES">
                      KES
                      -
                      Kenyan
                      Shilling
                    </option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                    <svg
                      className="fill-current h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              Content
              prices
              across
              the
              platform
              will
              automatically
              be
              displayed
              in
              your
              preferred
              currency.
              Changing
              your
              location
              will
              automatically
              update
              your
              currency
              default.
            </p>
          </div>

          {/* WEB2 CREDENTIALS */}
          <div className="bg-nippy-obsidian border border-red-900/30 rounded-2xl p-6 shadow-xl relative overflow-hidden mb-8">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500"></div>
            <h2 className="text-white font-bold mb-4">
              Web2
              Credentials
            </h2>

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
              className="w-full bg-nippy-coral text-white font-bold py-3 rounded-xl hover:bg-nippy-coralHover transition-all flex justify-center items-center gap-2 disabled:opacity-50 mt-6"
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
              Save
              Profile
              Settings
            </button>
          </div>
        </form>

        {/* WEB3 INTEGRATION */}
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

        {/* DANGER ZONE */}
        <div className="border border-red-900/40 rounded-2xl bg-red-950/20 p-6 mt-8">
          <h3 className="text-lg font-bold text-red-500 mb-4">
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
              className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 px-6 py-3 rounded-xl transition-colors font-bold w-full md:w-auto"
            >
              Delete
              Account
            </button>
          ) : (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-slate-300 text-sm leading-relaxed mb-6 border-l-2 border-red-500 pl-4">
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
                purchases,
                cancel
                subscriptions,
                and
                wipe
                your
                data.
              </p>

              {!user.walletAddress && (
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
                  className="w-full bg-black border border-red-900/50 rounded-xl py-3 px-4 text-white text-sm mb-4 focus:outline-none focus:border-red-500"
                />
              )}

              <div className="flex gap-4">
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
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={
                    handleDeleteAccount
                  }
                  disabled={
                    loading
                  }
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20 flex justify-center items-center"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : user.walletAddress ? (
                    "Sign in MetaMask"
                  ) : (
                    "Confirm Deletion"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

export default FanSettings;
