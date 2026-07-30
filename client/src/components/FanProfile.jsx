import React, {
  useState,
  useEffect,
} from "react";
import {
  User,
  Wallet,
  Camera,
  Save,
  Loader2,
  ShieldCheck,
} from "lucide-react";

const FanProfile =
  () => {
    const [
      profile,
      setProfile,
    ] =
      useState(
        {
          username:
            "",
          email:
            "",
          walletAddress:
            "",
        },
      );
    const [
      loading,
      setLoading,
    ] =
      useState(
        true,
      );
    const [
      saving,
      setSaving,
    ] =
      useState(
        false,
      );
    const [
      successMessage,
      setSuccessMessage,
    ] =
      useState(
        "",
      );

    useEffect(() => {
      fetchProfile();
    }, []);

    const fetchProfile =
      async () => {
        try {
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const response =
            await fetch(
              "http://localhost:5000/api/users/profile",
              {
                headers:
                  {
                    Authorization: `Bearer ${token}`,
                  },
              },
            );
          if (
            response.ok
          ) {
            const data =
              await response.json();
            setProfile(
              data,
            );
          }
        } catch (error) {
          console.error(
            "Failed to load profile",
            error,
          );
        } finally {
          setLoading(
            false,
          );
        }
      };

    const handleSave =
      async (
        e,
      ) => {
        e.preventDefault();
        setSaving(
          true,
        );
        setSuccessMessage(
          "",
        );

        try {
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const response =
            await fetch(
              "http://localhost:5000/api/users/profile",
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
                    username:
                      profile.username,
                    // If you have image upload logic, you'd pass the new fileKey here as profileImage
                  },
                ),
              },
            );

          if (
            response.ok
          ) {
            setSuccessMessage(
              "Profile updated successfully!",
            );
            setTimeout(
              () =>
                setSuccessMessage(
                  "",
                ),
              3000,
            );
          } else {
            const errorData =
              await response.json();
            alert(
              errorData.message ||
                "Update failed",
            );
          }
        } catch (error) {
          console.error(
            "Update failed",
            error,
          );
        } finally {
          setSaving(
            false,
          );
        }
      };

    const formatWallet =
      (
        address,
      ) => {
        if (
          !address
        )
          return "No wallet connected";
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
      };

    if (
      loading
    ) {
      return (
        <div className="flex justify-center items-center h-64 text-nippy-coral animate-pulse">
          Loading
          profile...
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8 border-b border-gray-800 pb-4">
          <User
            size={
              28
            }
            className="text-nippy-coral"
          />
          <h1 className="text-2xl font-bold text-slate-200">
            Your
            Profile
          </h1>
        </div>

        <div className="bg-nippy-obsidian border border-gray-800 rounded-2xl p-6 shadow-xl">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center border-2 border-gray-700 overflow-hidden shadow-lg">
                {profile.profileImage ? (
                  <img
                    src={
                      profile.profileImage
                    }
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-gray-400">
                    {profile.username
                      ?.charAt(
                        0,
                      )
                      .toUpperCase() ||
                      "U"}
                  </span>
                )}
              </div>
              {/* Hover overlay for changing avatar */}
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera
                  size={
                    24
                  }
                  className="text-white"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3 font-medium">
              Click
              to
              update
              avatar
            </p>
          </div>

          <form
            onSubmit={
              handleSave
            }
            className="space-y-6"
          >
            {/* Username */}
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">
                Username
              </label>
              <input
                type="text"
                value={
                  profile.username ||
                  ""
                }
                onChange={(
                  e,
                ) =>
                  setProfile(
                    {
                      ...profile,
                      username:
                        e
                          .target
                          .value,
                    },
                  )
                }
                className="w-full bg-black border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-nippy-coral transition-colors"
                placeholder="e.g., Web3Whale"
                required
              />
            </div>

            {/* Read-Only Web3 Wallet Section */}
            <div className="bg-black/50 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-1 flex items-center gap-2">
                  <Wallet
                    size={
                      16
                    }
                  />{" "}
                  Connected
                  Web3
                  Wallet
                </label>
                <p className="text-lg font-mono text-slate-200">
                  {formatWallet(
                    profile.walletAddress,
                  )}
                </p>
              </div>
              {profile.walletAddress && (
                <div className="bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-green-500/20">
                  <ShieldCheck
                    size={
                      14
                    }
                  />{" "}
                  Verified
                </div>
              )}
            </div>

            {/* Read-Only Email Warning */}
            <p className="text-xs text-gray-500 flex items-center gap-2 bg-gray-900/50 p-3 rounded-lg">
              <ShieldCheck
                size={
                  16
                }
                className="text-gray-400"
              />
              To
              change
              your
              wallet
              address
              or
              email,
              please
              visit
              the
              Security
              Settings
              page.
            </p>

            <button
              type="submit"
              disabled={
                saving
              }
              className="w-full bg-nippy-coral text-white font-bold py-3 rounded-xl hover:bg-nippy-coralHover transition-all flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
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
              {saving
                ? "Saving..."
                : "Save Profile"}
            </button>

            {successMessage && (
              <p className="text-green-400 text-center text-sm font-bold mt-2 animate-in fade-in">
                {
                  successMessage
                }
              </p>
            )}
          </form>
        </div>
      </div>
    );
  };

export default FanProfile;
