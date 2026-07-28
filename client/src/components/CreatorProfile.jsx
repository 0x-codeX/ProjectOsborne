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
} from "lucide-react";

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
      setFormData(
        {
          username:
            storedData.username ||
            "",
          email:
            storedData.email ||
            "",
          phone:
            storedData.phone ||
            "",
          country:
            storedData.country ||
            "",
          willingNsfw:
            storedData.willingNsfw ||
            false,
        },
      );
    }, [
      navigate,
    ]);

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

    const handleSave =
      async () => {
        setIsSaving(
          true,
        );
        setError(
          "",
        );

        try {
          // Grab token - adjust this if you store your JWT differently (e.g., in cookies)
          const token =
            localStorage.getItem(
              "token",
            );

          const response =
            await fetch(
              "/api/users/profile",
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
                  formData,
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

          // Update local state and localStorage so the UI updates instantly everywhere
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

    if (
      !user
    )
      return null;

    return (
      <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-slate-200 font-sans">
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

            {/* Edit / Save Toggle Buttons */}
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
                    // Reset form data back to current user state
                    setFormData(
                      {
                        username:
                          user.username ||
                          "",
                        email:
                          user.email ||
                          "",
                        phone:
                          user.phone ||
                          "",
                        country:
                          user.country ||
                          "",
                        willingNsfw:
                          user.willingNsfw ||
                          false,
                      },
                    );
                  }}
                  className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={
                    handleSave
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

              <div className="space-y-6 bg-slate-950 p-6 rounded-2xl border border-slate-800">
                {/* Preferences */}
                <div>
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
                          className={`block w-10 h-6 rounded-full transition-colors ${formData.willingNsfw ? "bg-[#FF5757]" : "bg-slate-700"}`}
                        ></div>
                        <div
                          className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.willingNsfw ? "transform translate-x-4" : ""}`}
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
                  {isEditing && (
                    <p className="text-xs text-slate-500 mt-2 italic">
                      Legal
                      agreements
                      cannot
                      be
                      modified
                      after
                      acceptance.
                    </p>
                  )}
                </div>

                {user.walletAddress && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                      Connected
                      Wallet
                    </p>
                    <p className="text-white font-mono text-sm bg-slate-900 p-2 rounded-lg border border-slate-700 truncate opacity-70">
                      {
                        user.walletAddress
                      }
                    </p>
                    {isEditing && (
                      <p className="text-xs text-slate-500 mt-1 italic">
                        Wallet
                        address
                        cannot
                        be
                        changed.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

export default CreatorProfile;
