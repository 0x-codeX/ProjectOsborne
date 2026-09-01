import React, {
  useState,
  useEffect,
} from "react";
import { Link } from "react-router-dom";
import {
  User,
  Wallet,
  Camera,
  Save,
  Loader2,
  ShieldCheck,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import api from "../utils/api";



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
          const response =
            await api.get(
              "/users/profile",
            );
          setProfile(
            response.data,
          );
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
          const response =
            await api.put(
              "/users/profile",
              {
                username:
                  profile.username,
              },
            );
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
        <div className="flex justify-center items-center h-64 text-emerald-500 animate-pulse">
          Loading
          profile...
        </div>
      );
    }

    return (
      <div className="w-full max-w-2xl mx-auto pb-20 md:pb-0">
        <div className="md:hidden flex justify-between items-center p-4 bg-nippy-obsidian/90 backdrop-blur-md sticky top-0 z-40 border-b border-gray-800">
          <Link
            to="/fan/dashboard"
            className="p-2 text-gray-400 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-700 rounded-full"
          >
            <LayoutDashboard
              size={
                20
              }
            />
          </Link>
          <h1 className="font-bold text-white text-lg tracking-wide">
            Profile
          </h1>
          <Link
            to="/fan/settings"
            className="p-2 text-gray-400 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-700 rounded-full"
          >
            <Settings
              size={
                20
              }
            />
          </Link>
        </div>

        <div className="hidden md:flex justify-end pt-6 px-4">
          <Link
            to="/fan/settings"
            className="flex items-center gap-2 p-2 px-4 text-sm font-medium text-gray-400 hover:text-white transition-colors bg-gray-800/50 hover:bg-gray-700 rounded-full"
          >
            <Settings
              size={
                16
              }
            />{" "}
            Settings
          </Link>
        </div>

        <div className="px-4 py-4 md:py-2">
          <div className="hidden md:flex items-center gap-3 mb-8 border-b border-gray-800 pb-4">
            <User
              size={
                28
              }
              className="text-emerald-500"
            />
            <h1 className="text-2xl font-bold text-slate-200">
              Your
              Profile
            </h1>
          </div>

          <div className="bg-nippy-obsidian border border-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col items-center mb-8">
              {/* Wrap the avatar in a label to trigger the file input */}
              <label
                htmlFor="avatar-upload"
                className="relative group cursor-pointer"
              >
                <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center border-2 border-gray-700 overflow-hidden shadow-lg transition-transform group-hover:scale-105">
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
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera
                    size={
                      24
                    }
                    className="text-white"
                  />
                </div>
              </label>

              {/* The Invisible File Input */}
              <input
                type="file"
                id="avatar-upload"
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
                onChange={async (
                  e,
                ) => {
                  const file =
                    e
                      .target
                      .files[0];
                  if (
                    !file
                  )
                    return;

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

                    // 1. Request the Presigned S3 Ticket
                    const ticketRes =
                      await api.post(
                        "/media/upload-ticket",
                        {
                          fileName:
                            file.name,
                          fileType:
                            file.type,
                        },
                      );
                    const {
                      uploadUrl,
                      publicUrl,
                    } =
                      ticketRes.data;

                    // 2. Upload file directly to Cloudflare R2
                    const uploadRes =
                      await fetch(
                        uploadUrl,
                        {
                          method:
                            "PUT",
                          headers:
                            {
                              "Content-Type":
                                file.type,
                            },
                          body: file,
                        },
                      );

                    if (
                      !uploadRes.ok
                    )
                      throw new Error(
                        "Failed to upload image to bucket",
                      );

                    // 3. Update local state immediately for snappy UX
                    setProfile(
                      {
                        ...profile,
                        profileImage:
                          publicUrl,
                      },
                    );

                    // 4. Save the new image URL to the database
                    await api.put(
                      "/users/profile",
                      {
                        profileImage:
                          publicUrl,
                      },
                    );
                    setSuccessMessage(
                      "Avatar updated successfully!",
                    );
                    setTimeout(
                      () =>
                        setSuccessMessage(
                          "",
                        ),
                      3000,
                    );
                  } catch (error) {
                    console.error(
                      "Avatar upload failed:",
                      error,
                    );
                    alert(
                      error.message ||
                        "Failed to update avatar",
                    );
                  } finally {
                    setSaving(
                      false,
                    );
                    // Clear the input so the user can select the same file again if it failed
                    e.target.value =
                      null;
                  }
                }}
              />

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
                  className="w-full bg-black border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="e.g., Web3Whale"
                  required
                />
              </div>

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
                className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
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
                <p className="text-emerald-400 text-center text-sm font-bold mt-2 animate-in fade-in">
                  {
                    successMessage
                  }
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  };

export default FanProfile;
