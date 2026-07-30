// client/src/components/CreatorProfile.jsx
import React, {
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  ArrowLeft,
  Edit2,
  X,
  Check,
  AlertCircle,
  Wallet,
  Camera,
  Lock,
} from "lucide-react";
import { ethers } from "ethers";

const CreatorProfile =
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
      isEditing,
      setIsEditing,
    ] =
      useState(
        false,
      );
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

    // Payout Address Security state
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
        },
      );;

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
            phone:
              userData.phone ||
              "",
            country:
              userData.country ||
              "",
            willingNsfw:
              userData.willingNsfw ||
              false,
            profileImage:
              userData.profileImage ||
              "",
            payoutAddress:
              userData.payoutAddress ||
              userData.walletAddress ||
              "",
            agreedTerms:
              userData.agreedTerms !==
              undefined
                ? userData.agreedTerms
                : true,
            confirmedAge:
              userData.confirmedAge !==
              undefined
                ? userData.confirmedAge
                : true,
            hasCompletedBioData:
              userData.hasCompletedBioData !==
              undefined
                ? userData.hasCompletedBioData
                : true,
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

    // STEP 1: Intercept the Save Click
    const handleInitialSaveClick =
      () => {
        setError(
          "",
        );
        const currentPayout =
          user.payoutAddress ||
          user.walletAddress ||
          "";
        const currentEmail =
          user.email ||
          "";

        const emailChanged =
          formData.email !==
          currentEmail;
        const payoutChanged =
          formData.payoutAddress !==
          currentPayout;

        if (
          emailChanged ||
          payoutChanged
        ) {
          setPendingChanges(
            {
              email:
                emailChanged,
              payout:
                payoutChanged,
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

    // STEP 2: Handle the Security Popup Confirmation
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

            // Dynamically build the exact cryptographic message
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
                `payout address to ${formData.payoutAddress}`,
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
                "Password is required to confirm sensitive changes.",
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

    // STEP 3: The actual API call to save
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
                // We inject the security payload (password/signature) alongside the form data
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
          setIsEditing(
            false,
          );
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
            user.walletAddress
          ) {
            if (
              !window.ethereum
            ) {
              setError(
                "MetaMask wallet is required to sign the deletion request.",
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
              setError(
                "Please enter your password to confirm deletion.",
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
            setError(
              data.message ||
                "Failed to delete account.",
            );
          }
        } catch (err) {
          if (
            err.code ===
            "ACTION_REJECTED"
          ) {
            setError(
              "You rejected the signature request in MetaMask.",
            );
          } else {
            setError(
              "Error processing account deletion.",
            );
          }
        }
      };

    if (
      !user
    )
      return null;

    return (
      <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-slate-200 font-sans relative">
        {/* UNIFIED SECURITY POPUP OVERLAY */}
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
                    permanently
                    update
                    your
                    login
                    credentials.
                  </span>
                )}
              </p>

              {pendingChanges.email && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                    New
                    Login
                    Email
                  </p>
                  <p className="font-mono text-amber-400 text-sm truncate">
                    {
                      formData.email
                    }
                  </p>
                </div>
              )}

              {pendingChanges.payout && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                    New
                    Payout
                    Address
                  </p>
                  <p className="font-mono text-amber-400 text-sm break-all">
                    {
                      formData.payoutAddress
                    }
                  </p>
                </div>
              )}

              {!user.walletAddress && (
                <div className="mb-6 mt-4">
                  <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2 block">
                    Enter
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
          <div className="flex justify-between items-center mb-8">
            <button
              onClick={() =>
                navigate(
                  "/creator/dashboard",
                )
              }
              className="flex items-center text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
              to
              Dashboard
            </button>

            {!isEditing ? (
              <button
                onClick={() =>
                  setIsEditing(
                    true,
                  )
                }
                className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
                Profile
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsEditing(
                      false,
                    );
                    setError(
                      "",
                    );
                    resetForm(
                      user,
                    );
                  }}
                  className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={
                    handleInitialSaveClick
                  }
                  disabled={
                    isSaving
                  }
                  className="flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors text-sm font-bold disabled:opacity-50"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {isSaving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center text-red-500 text-sm">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              {
                error
              }
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF5757]/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>

            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center relative flex-shrink-0">
                    {isEditing &&
                    !formData.profileImage ? (
                      <Camera className="w-8 h-8 text-slate-400" />
                    ) : user.profileImage ||
                      formData.profileImage ? (
                      <img
                        src={
                          isEditing
                            ? formData.profileImage
                            : user.profileImage
                        }
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-slate-500" />
                    )}
                  </div>

                  {isEditing && (
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
                  )}
                </div>

                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
                    Creator
                    Profile
                  </h1>
                  <p className="text-slate-400">
                    Your
                    personal
                    details
                    and
                    compliance
                    data.
                  </p>
                </div>
              </div>

              <div
                className={`px-4 py-2 rounded-full border text-sm font-bold flex items-center gap-2 ${
                  user.kycStatus ===
                  "verified"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-500"
                }`}
              >
                <Shield className="w-4 h-4" />
                {user.kycStatus ===
                "verified"
                  ? "Identity Verified"
                  : "Unverified"}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              <div className="space-y-6 bg-slate-950 p-6 rounded-2xl border border-slate-800">
                {/* Username */}
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                    Username
                  </p>
                  {isEditing ? (
                    <div className="relative">
                      <User className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        name="username"
                        value={
                          formData.username
                        }
                        onChange={
                          handleChange
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center text-white font-medium text-lg">
                      <User className="w-5 h-5 mr-3 text-slate-400" />

                      @
                      {user.username ||
                        "N/A"}
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                    Email
                    Address
                  </p>
                  {isEditing ? (
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        name="email"
                        value={
                          formData.email
                        }
                        onChange={
                          handleChange
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center text-white font-medium">
                      <Mail className="w-5 h-5 mr-3 text-slate-400" />
                      {user.email ||
                        "N/A"}
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                    Phone
                    Number
                  </p>
                  {isEditing ? (
                    <div className="relative">
                      <Phone className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        name="phone"
                        value={
                          formData.phone
                        }
                        onChange={
                          handleChange
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center text-white font-medium">
                      <Phone className="w-5 h-5 mr-3 text-slate-400" />
                      {user.phone ||
                        "N/A"}
                    </div>
                  )}
                </div>

                {/* Country */}
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                    Location
                  </p>
                  {isEditing ? (
                    <div className="relative">
                      <MapPin className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        name="country"
                        value={
                          formData.country
                        }
                        onChange={
                          handleChange
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center text-white font-medium">
                      <MapPin className="w-5 h-5 mr-3 text-slate-400" />
                      {user.country ||
                        "N/A"}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6 bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  {/* Financial & Payout Settings */}
                  <div className="pb-4 border-b border-slate-800 mb-6">
                    <h3 className="text-sm font-bold text-white flex items-center mb-4 uppercase tracking-wider">
                      <Wallet className="w-4 h-4 mr-2 text-[#FF5757]" />
                      Financial
                      Settings
                    </h3>

                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                        USDT
                        Payout
                        Address
                        (Polygon)
                      </p>
                      {isEditing ? (
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
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-amber-500 font-mono text-sm"
                        />
                      ) : (
                        <p className="text-white font-mono text-sm bg-slate-900 p-3 rounded-lg border border-slate-700 truncate opacity-90">
                          {user.payoutAddress ||
                            user.walletAddress ||
                            "No payout address set"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Preferences */}
                  <div className="mb-6">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">
                      Content
                      Preferences
                    </p>
                    {isEditing ? (
                      <label className="flex items-center cursor-pointer">
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
                            className={`block w-10 h-6 rounded-full transition-colors ${
                              formData.willingNsfw
                                ? "bg-[#FF5757]"
                                : "bg-slate-700"
                            }`}
                          ></div>
                          <div
                            className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                              formData.willingNsfw
                                ? "transform translate-x-4"
                                : ""
                            }`}
                          ></div>
                        </div>
                        <span className="ml-3 text-white text-sm">
                          Host
                          NSFW
                          Content
                        </span>
                      </label>
                    ) : (
                      <p className="text-white font-medium">
                        NSFW
                        Content:{" "}
                        <span
                          className={
                            user.willingNsfw
                              ? "text-[#FF5757]"
                              : "text-slate-400"
                          }
                        >
                          {user.willingNsfw
                            ? "Enabled"
                            : "Disabled"}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Immutable Legal Section */}
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                      Legal
                      Agreements
                    </p>
                    <ul className="text-sm text-slate-300 space-y-2 mt-2">
                      <li className="flex items-center opacity-70">
                        <span className="text-emerald-500 mr-2">
                          ✓
                        </span>{" "}
                        Age
                        Confirmed
                        (18+)
                      </li>
                      <li className="flex items-center opacity-70">
                        <span className="text-emerald-500 mr-2">
                          ✓
                        </span>{" "}
                        Terms
                        of
                        Service
                      </li>
                    </ul>
                  </div>
                </div>

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
                          {user.walletAddress
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
                            setError(
                              "",
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
          </div>
        </div>
      </div>
    );
  };

export default CreatorProfile;
