// client/src/components/CreatorSettings.jsx
import React, {
  useEffect,
  useState,
} from "react";
import {
  useNavigate,
  Link,
} from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  X,
  Check,
  AlertCircle,
  Wallet,
  Camera,
  Lock,
  ShieldAlert,
  Landmark,
  CreditCard,
  FileCheck,
  Globe, // <-- Added Globe icon for currency
} from "lucide-react";
import { ethers } from "ethers";

// OFFICIAL PAYSTACK BANK CODES FOR NIGERIA
const NIGERIAN_BANKS =
  [
    {
      code: "044",
      name: "Access Bank",
    },
    {
      code: "050",
      name: "Ecobank Nigeria",
    },
    {
      code: "070",
      name: "Fidelity Bank",
    },
    {
      code: "011",
      name: "First Bank of Nigeria",
    },
    {
      code: "214",
      name: "First City Monument Bank",
    },
    {
      code: "058",
      name: "Guaranty Trust Bank (GTCO)",
    },
    {
      code: "030",
      name: "Heritage Bank",
    },
    {
      code: "082",
      name: "Keystone Bank",
    },
    {
      code: "076",
      name: "Polaris Bank",
    },
    {
      code: "221",
      name: "Stanbic IBTC Bank",
    },
    {
      code: "232",
      name: "Sterling Bank",
    },
    {
      code: "032",
      name: "Union Bank of Nigeria",
    },
    {
      code: "033",
      name: "United Bank For Africa (UBA)",
    },
    {
      code: "215",
      name: "Unity Bank",
    },
    {
      code: "035",
      name: "Wema Bank",
    },
    {
      code: "057",
      name: "Zenith Bank",
    },
  ];

const CreatorSettings =
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

    // Edit state management
    const [
      formData,
      setFormData,
    ] =
      useState(
        {},
      );
    const [
      isSaving,
      setIsSaving,
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
      successMsg,
      setSuccessMsg,
    ] =
      useState(
        "",
      );

    // Security state
    const [
      showSecurityConfirm,
      setShowSecurityConfirm,
    ] =
      useState(
        false,
      );
    const [
      securityPassword,
      setSecurityPassword,
    ] =
      useState(
        "",
      );
    const [
      pendingChanges,
      setPendingChanges,
    ] =
      useState(
        {
          email: false,
          payout: false,
          password: false,
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
        !storedData ||
        storedData.role !==
          "creator"
      ) {
        navigate(
          "/auth/login",
        );
        return;
      }
      setUser(
        storedData,
      );
      resetForm(
        storedData,
      );
    }, [
      navigate,
    ]);

    const resetForm =
      (
        userData,
      ) => {
        setFormData(
          {
            username:
              userData.username ||
              "",
            email:
              userData.email ||
              "",
            newPassword:
              "",
            phone:
              userData.phone ||
              "",
            country:
              userData.country ||
              "",
            preferredCurrency:
              userData.preferredCurrency ||
              "USD", // <-- ADDED PREFERRED CURRENCY
            willingNsfw:
              userData.willingNsfw ||
              false,
            profileImage:
              userData.profileImage ||
              "",

            // Legal KYC Name (Pulled from Webhook data)
            legalName:
              userData
                .kycRecord
                ?.legalName ||
              "",

            // Payout Fields
            payoutMethod:
              userData.payoutMethod ||
              "crypto",
            payoutAddress:
              userData.payoutAddress ||
              userData.walletAddress ||
              "",
            bankName:
              userData.bankName ||
              "",
            bankCode:
              userData.bankCode ||
              "",
            accountNumber:
              userData.accountNumber ||
              "",
            accountName:
              userData.accountName ||
              "",
            fiatCurrency:
              userData.fiatCurrency ||
              "NGN",
            paypalEmail:
              userData.paypalEmail ||
              "",
          },
        );
      };

    const handleChange =
      (
        e,
      ) => {
        const {
          name,
          value,
          type,
          checked,
        } =
          e.target;
        setFormData(
          (
            prev,
          ) => ({
            ...prev,
            [name]:
              type ===
              "checkbox"
                ? checked
                : value,
          }),
        );
      };

    const handleBankChange =
      (
        e,
      ) => {
        const selectedBankName =
          e
            .target
            .value;
        const selectedBankObj =
          NIGERIAN_BANKS.find(
            (
              b,
            ) =>
              b.name ===
              selectedBankName,
          );

        setFormData(
          (
            prev,
          ) => ({
            ...prev,
            bankName:
              selectedBankName,
            bankCode:
              selectedBankObj
                ? selectedBankObj.code
                : "",
          }),
        );
      };

    const handleImageSelect =
      (
        e,
      ) => {
        const file =
          e
            .target
            .files[0];
        if (
          file
        ) {
          if (
            file.size >
            2 *
              1024 *
              1024
          ) {
            setError(
              "Image size must be less than 2MB.",
            );
            return;
          }
          const reader =
            new FileReader();
          reader.onloadend =
            () => {
              setFormData(
                (
                  prev,
                ) => ({
                  ...prev,
                  profileImage:
                    reader.result,
                }),
              );
            };
          reader.readAsDataURL(
            file,
          );
        }
      };

    const validateNameMatch =
      (
        legalName,
        payoutName,
      ) => {
        if (
          !legalName ||
          !payoutName
        )
          return false;

        const normalize =
          (
            str,
          ) =>
            str
              .toLowerCase()
              .replace(
                /[^a-z0-9]/g,
                "",
              );
        const legalParts =
          legalName
            .toLowerCase()
            .trim()
            .split(
              /\s+/,
            )
            .filter(
              Boolean,
            );
        const payoutParts =
          payoutName
            .toLowerCase()
            .trim()
            .split(
              /\s+/,
            )
            .filter(
              Boolean,
            );

        if (
          legalParts.length <
          2
        ) {
          return payoutParts.some(
            (
              p,
            ) =>
              normalize(
                p,
              ) ===
              normalize(
                legalParts[0],
              ),
          );
        }

        const surname =
          legalParts[
            legalParts.length -
              1
          ];
        const otherNames =
          legalParts.slice(
            0,
            -1,
          );

        const payoutContainsSurname =
          payoutParts.some(
            (
              p,
            ) =>
              normalize(
                p,
              ) ===
              normalize(
                surname,
              ),
          );
        const payoutContainsOtherName =
          otherNames.some(
            (
              name,
            ) =>
              payoutParts.some(
                (
                  p,
                ) =>
                  normalize(
                    p,
                  ) ===
                  normalize(
                    name,
                  ),
              ),
          );

        return (
          payoutContainsSurname &&
          payoutContainsOtherName
        );
      };

    const handleInitialSaveClick =
      (
        e,
      ) => {
        e.preventDefault();
        setError(
          "",
        );
        setSuccessMsg(
          "",
        );

        if (
          user.kycStatus ===
            "verified" &&
          (formData.payoutMethod ===
            "bank" ||
            formData.payoutMethod ===
              "paypal")
        ) {
          if (
            formData.payoutMethod ===
            "bank"
          ) {
            const isMatch =
              validateNameMatch(
                formData.legalName,
                formData.accountName,
              );
            if (
              !isMatch
            ) {
              setError(
                "Compliance Error: The bank account name must mathematically match your verified Government ID (Surname + at least one First/Middle name).",
              );
              return;
            }
          }
        }

        const emailChanged =
          formData.email !==
          (user.email ||
            "");
        const passwordChanged =
          formData.newPassword &&
          formData
            .newPassword
            .length >
            0;

        const payoutChanged =
          formData.payoutMethod !==
            (user.payoutMethod ||
              "crypto") ||
          formData.payoutAddress !==
            (user.payoutAddress ||
              user.walletAddress ||
              "") ||
          formData.bankName !==
            (user.bankName ||
              "") ||
          formData.bankCode !==
            (user.bankCode ||
              "") ||
          formData.accountNumber !==
            (user.accountNumber ||
              "") ||
          formData.accountName !==
            (user.accountName ||
              "") ||
          formData.fiatCurrency !==
            (user.fiatCurrency ||
              "NGN") ||
          formData.paypalEmail !==
            (user.paypalEmail ||
              "");

        if (
          emailChanged ||
          payoutChanged ||
          passwordChanged
        ) {
          setPendingChanges(
            {
              email:
                emailChanged,
              payout:
                payoutChanged,
              password:
                passwordChanged,
            },
          );
          setShowSecurityConfirm(
            true,
          );
        } else {
          executeSave(
            {},
          );
        }
      };

    const handleSecureConfirm =
      async () => {
        setError(
          "",
        );
        let authPayload =
          {};

        try {
          if (
            user.walletAddress
          ) {
            if (
              !window.ethereum
            )
              throw new Error(
                "MetaMask wallet is required.",
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

            let changesText =
              [];
            if (
              pendingChanges.email
            )
              changesText.push(
                `email to ${formData.email}`,
              );
            if (
              pendingChanges.payout
            )
              changesText.push(
                `payout settings to ${formData.payoutMethod.toUpperCase()}`,
              );
            if (
              pendingChanges.password
            )
              changesText.push(
                `set a new backup password`,
              );

            const message = `CONFIRM_ACCOUNT_UPDATE: I authorize changing my ${changesText.join(" and ")}.`;
            const securitySignature =
              await signer.signMessage(
                message,
              );

            authPayload =
              {
                securitySignature,
              };
          } else {
            if (
              !securityPassword
            ) {
              setError(
                "Current password is required to confirm sensitive changes.",
              );
              return;
            }
            authPayload =
              {
                securityPassword,
              };
          }

          setShowSecurityConfirm(
            false,
          );
          setSecurityPassword(
            "",
          );
          await executeSave(
            authPayload,
          );
        } catch (err) {
          console.error(
            err,
          );
          if (
            err.code ===
            "ACTION_REJECTED"
          ) {
            setError(
              "Signature request rejected in MetaMask.",
            );
          } else {
            setError(
              err.message ||
                "Failed to verify identity.",
            );
          }
        }
      };

    const executeSave =
      async (
        authPayload,
      ) => {
        setIsSaving(
          true,
        );
        setError(
          "",
        );

        // Track if the currency is being changed right now
        const currencyChanged =
          formData.preferredCurrency !==
          (user.preferredCurrency ||
            "USD");

        try {
          const token =
            localStorage.getItem(
              "nippy_token",
            ) ||
            localStorage.getItem(
              "token",
            );
          const response =
            await fetch(
              "http://localhost:5000/api/users/profile",
              {
                method:
                  "PUT",
                headers:
                  {
                    "Content-Type":
                      "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                body: JSON.stringify(
                  {
                    ...formData,
                    ...authPayload,
                  },
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
                "Failed to update profile",
            );
          }

          const updatedUser =
            {
              ...user,
              ...data.user,
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

          setFormData(
            (
              prev,
            ) => ({
              ...prev,
              newPassword:
                "",
            }),
          );
          setPendingChanges(
            {
              email: false,
              payout: false,
              password: false,
            },
          );

          // THE FIX: If currency changed, redirect immediately.
          if (
            currencyChanged
          ) {
            // UPDATE THIS PATH to match your exact React Router path for monetization settings
            navigate(
              "/creator/monetization",
              {
                state:
                  {
                    currencyChanged: true,
                  },
              },
            );
          } else {
            setSuccessMsg(
              "Settings updated successfully.",
            );
          }
        } catch (err) {
          setError(
            err.message,
          );
        } finally {
          setIsSaving(
            false,
          );
        }
      };

    const handleDeleteAccount =
      async () => {
        setError(
          "",
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

            // Exact string match required by backend
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
              setError(
                "Password is required to delete your account.",
              );
              return;
            }
            authPayload =
              {
                password:
                  deletePassword,
              };
          }

          setIsSaving(
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
            setError(
              "Signature request rejected. Account deletion cancelled.",
            );
          } else {
            setError(
              err.message ||
                "An error occurred during account deletion.",
            );
          }
        } finally {
          setIsSaving(
            false,
          );
        }
      };

    if (
      !user
    )
      return null;

    return (
      <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-slate-200 font-sans relative">
        {/* SECURITY OVERLAY */}
        {showSecurityConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-amber-500/30 p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
              <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 border border-amber-500/20">
                <Lock className="w-7 h-7 text-amber-500" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">
                Security
                Verification
              </h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                You
                are
                about
                to
                modify
                sensitive
                account
                information.
                {pendingChanges.email && (
                  <span className="block mt-3 text-[#FF5757] font-semibold p-2 bg-[#FF5757]/10 rounded-lg border border-[#FF5757]/20">
                    ⚠️
                    Note:
                    Changing
                    your
                    email
                    will
                    update
                    your
                    login
                    credentials.
                  </span>
                )}
              </p>

              {pendingChanges.payout && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                    New
                    Payout
                    Method
                  </p>
                  <p className="font-mono text-amber-400 text-sm capitalize">
                    {
                      formData.payoutMethod
                    }
                  </p>
                </div>
              )}

              {!user.walletAddress && (
                <div className="mb-6 mt-4">
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2 block">
                    Enter
                    Current
                    Password
                    to
                    Confirm
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={
                      securityPassword
                    }
                    onChange={(
                      e,
                    ) =>
                      setSecurityPassword(
                        e
                          .target
                          .value,
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => {
                    setShowSecurityConfirm(
                      false,
                    );
                    setSecurityPassword(
                      "",
                    );
                  }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={
                    handleSecureConfirm
                  }
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold transition-colors shadow-lg shadow-amber-500/20"
                >
                  {user.walletAddress
                    ? "Sign in Wallet"
                    : "Confirm Update"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <Link
                to="/creator/profile"
                className="text-slate-400 hover:text-white transition-colors mr-2"
              >
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <h1 className="text-2xl font-bold text-white">
                Creator
                Settings
              </h1>
            </div>

            <button
              onClick={
                handleInitialSaveClick
              }
              disabled={
                isSaving
              }
              className="flex items-center px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-all text-sm font-bold shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {isSaving
                ? "Saving..."
                : "Save Changes"}
              {!isSaving && (
                <Check className="w-4 h-4 ml-2" />
              )}
            </button>
          </div>

          {/* ALERTS */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center text-red-500 text-sm font-medium">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              {
                error
              }
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl flex items-center text-emerald-500 text-sm font-medium">
              <Check className="w-5 h-5 mr-3 flex-shrink-0" />
              {
                successMsg
              }
            </div>
          )}

          {/* GENERAL INFORMATION */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden mb-8">
            <h2 className="text-lg font-bold text-white mb-6">
              General
              Information
            </h2>

            <div className="flex flex-col md:flex-row gap-8 mb-8">
              {/* Avatar Upload */}
              <div className="flex-shrink-0 relative group w-24 h-24">
                <div className="w-full h-full rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center">
                  {formData.profileImage ? (
                    <img
                      src={
                        formData.profileImage
                      }
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="w-6 h-6 text-white" />
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={
                      handleImageSelect
                    }
                  />
                </label>
              </div>

              <div className="flex-grow space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      name="username"
                      value={
                        formData.username
                      }
                      onChange={
                        handleChange
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                    Legal
                    Name
                    (Government
                    ID)
                    {user.kycStatus ===
                      "verified" && (
                      <Check className="w-4 h-4 text-emerald-500" />
                    )}
                  </label>
                  <div className="relative">
                    <FileCheck
                      className={`w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 ${
                        user.kycStatus ===
                        "verified"
                          ? "text-emerald-500"
                          : "text-slate-500"
                      }`}
                    />
                    <input
                      type="text"
                      name="legalName"
                      value={
                        formData.legalName
                      }
                      onChange={
                        user.kycStatus ===
                        "verified"
                          ? undefined
                          : handleChange
                      }
                      disabled={
                        user.kycStatus ===
                        "verified"
                      }
                      placeholder={
                        user.kycStatus ===
                        "verified"
                          ? ""
                          : "Complete KYC to lock name"
                      }
                      className={`w-full py-3 pl-12 pr-4 rounded-xl transition-colors ${
                        user.kycStatus ===
                        "verified"
                          ? "bg-emerald-500/5 border border-emerald-500/30 text-emerald-400 cursor-not-allowed font-medium"
                          : "bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                      }`}
                    />
                  </div>
                  {user.kycStatus ===
                    "verified" && (
                    <p className="text-xs text-emerald-500/70 mt-2">
                      Verified
                      by
                      Didit
                      Identity.
                      This
                      name
                      cannot
                      be
                      changed.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* GRID: Phone, Country, & Currency */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    name="phone"
                    value={
                      formData.phone
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    name="country"
                    value={
                      formData.country
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              {/* THE FIX: PREFERRED CURRENCY SELECTOR */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Globe className="w-3 h-3 text-amber-500" />{" "}
                  Preferred
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500 transition-colors appearance-none font-medium"
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
          </div>

          {/* SECURE CREDENTIALS SECTION */}
          <div className="bg-slate-900 border border-amber-500/20 rounded-3xl p-8 shadow-2xl relative mb-8">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <ShieldAlert className="text-amber-500 w-5 h-5" />{" "}
              Secured
              Credentials
            </h2>

            <p className="text-sm text-slate-400 mb-6">
              Link
              an
              email
              to
              secure
              your
              account
              against
              wallet
              loss.
              You
              can
              optionally
              set
              a
              password
              to
              enable
              standard
              Web2
              login
              on
              other
              devices.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                  Recovery
                  /
                  Login
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    name="email"
                    value={
                      formData.email
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                  Set
                  Backup
                  Password
                  (Optional)
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    name="newPassword"
                    value={
                      formData.newPassword
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                    placeholder="Leave blank unless setting/changing password"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PAYOUT PREFERENCES */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative mb-8">
            <h2 className="text-lg font-bold text-white mb-6">
              Payout
              Preferences
            </h2>

            <div className="mb-6 flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800 w-full md:w-max">
              {[
                "crypto",
                "bank",
                "paypal",
              ].map(
                (
                  method,
                ) => (
                  <button
                    key={
                      method
                    }
                    type="button"
                    onClick={() =>
                      // MUTUALLY EXCLUSIVE PAYOUT ROUTING: Clears stale data immediately
                      setFormData(
                        (
                          prev,
                        ) => ({
                          ...prev,
                          payoutMethod:
                            method,
                          ...(method ===
                            "crypto" && {
                            bankName:
                              "",
                            bankCode:
                              "",
                            accountNumber:
                              "",
                            accountName:
                              "",
                            paypalEmail:
                              "",
                          }),
                          ...(method ===
                            "bank" && {
                            payoutAddress:
                              "",
                            paypalEmail:
                              "",
                          }),
                          ...(method ===
                            "paypal" && {
                            payoutAddress:
                              "",
                            bankName:
                              "",
                            bankCode:
                              "",
                            accountNumber:
                              "",
                            accountName:
                              "",
                          }),
                        }),
                      )
                    }
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold capitalize transition-colors ${
                      formData.payoutMethod ===
                      method
                        ? "bg-slate-800 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {
                      method
                    }
                  </button>
                ),
              )}
            </div>

            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Crypto Layout */}
              {formData.payoutMethod ===
                "crypto" && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#10b981]" />{" "}
                    USDT
                    Payout
                    Address
                    (Polygon)
                  </label>
                  <input
                    type="text"
                    name="payoutAddress"
                    value={
                      formData.payoutAddress
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="0x..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              )}

              {/* Bank Layout */}
              {formData.payoutMethod ===
                "bank" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                    <p className="text-sm text-blue-400">
                      <span className="font-bold">
                        Compliance
                        Notice:
                      </span>{" "}
                      The
                      Account
                      Holder
                      Name
                      must
                      match
                      your
                      verified
                      Government
                      ID.
                      Payments
                      to
                      third-party
                      bank
                      accounts
                      will
                      be
                      rejected.
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />{" "}
                      Exact
                      Account
                      Holder
                      Name
                    </label>
                    <input
                      type="text"
                      name="accountName"
                      value={
                        formData.accountName
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="e.g. John Doe Surname"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* BANK DROPDOWN: Captures both Name and Code */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-blue-500" />{" "}
                      Bank
                      Name
                    </label>
                    <select
                      name="bankName"
                      value={
                        formData.bankName
                      }
                      onChange={
                        handleBankChange
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                    >
                      <option
                        value=""
                        disabled
                      >
                        Select
                        your
                        bank
                      </option>
                      {NIGERIAN_BANKS.map(
                        (
                          bank,
                        ) => (
                          <option
                            key={
                              bank.code
                            }
                            value={
                              bank.name
                            }
                          >
                            {
                              bank.name
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                      Account
                      Number
                    </label>
                    <input
                      type="text"
                      name="accountNumber"
                      value={
                        formData.accountNumber
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="0123456789"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                      Currency
                    </label>
                    <select
                      name="fiatCurrency"
                      value={
                        formData.fiatCurrency
                      }
                      onChange={
                        handleChange
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                    >
                      <option value="NGN">
                        NGN
                        -
                        Nigerian
                        Naira
                      </option>
                      <option value="USD">
                        USD
                        -
                        US
                        Dollar
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
                  </div>
                </div>
              )}

              {/* PayPal Layout */}
              {formData.payoutMethod ===
                "paypal" && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#0070ba]" />{" "}
                    PayPal
                    Email
                    Address
                  </label>
                  <input
                    type="email"
                    name="paypalEmail"
                    value={
                      formData.paypalEmail
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="creator@paypal.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-[#0070ba] transition-colors"
                  />
                </div>
              )}
            </div>
          </div>

          {/* CONTENT PREFERENCES */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative mb-8">
            <h2 className="text-lg font-bold text-white mb-6">
              Content
              Preferences
            </h2>

            <label className="flex items-center justify-between cursor-pointer bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <p className="text-white font-medium mb-1">
                  Host
                  NSFW
                  Content
                </p>
                <p className="text-xs text-slate-500">
                  Allow
                  your
                  profile
                  to
                  host
                  sensitive
                  material.
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  name="willingNsfw"
                  checked={
                    formData.willingNsfw
                  }
                  onChange={
                    handleChange
                  }
                  className="sr-only"
                />
                <div
                  className={`block w-12 h-7 rounded-full transition-colors ${
                    formData.willingNsfw
                      ? "bg-[#FF5757]"
                      : "bg-slate-700"
                  }`}
                />
                <div
                  className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${
                    formData.willingNsfw
                      ? "transform translate-x-5"
                      : ""
                  }`}
                />
              </div>
            </label>
          </div>

          {/* DANGER ZONE */}
          <div className="border border-red-900/40 rounded-3xl bg-red-950/20 p-8">
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
                className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 px-6 py-3 rounded-xl transition-colors font-bold"
              >
                Delete
                Creator
                Account
              </button>
            ) : (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 max-w-md">
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
                  Creator
                  Vault
                  access,
                  remove
                  uploaded
                  content,
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
                    className="w-full bg-slate-950 border border-red-900/50 rounded-xl py-3 px-4 text-white text-sm mb-4 focus:outline-none focus:border-red-500"
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
                      setError(
                        "",
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
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20"
                  >
                    {user.walletAddress
                      ? "Sign in MetaMask"
                      : "Confirm Deletion"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

export default CreatorSettings;
