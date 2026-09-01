import React, {
  useState,
  useEffect,
} from "react";
import {
  Outlet,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import api from "../utils/api";
import {
  LayoutDashboard,
  FolderKanban,
  Rss,
  Bell,
  MessageCircle,
  User,
  Settings,
  LogOut,
  ShieldCheck,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  LifeBuoy,
  Send,
} from "lucide-react";
import landingBackground from "../assets/background7.jpg";
import nippyLogo from "../assets/NippyLogo.png";
import { useUpload } from "./UploadContext";

const CreatorLayout =
  () => {
    const location =
      useLocation();
    const navigate =
      useNavigate();
    const [
      globalUnread,
      setGlobalUnread,
    ] =
      useState(
        0,
      );

    const {
      uploadState,
      clearUpload,
    } =
      useUpload();

    // --- SUPPORT WIDGET STATE ---
    const [
      isSupportOpen,
      setIsSupportOpen,
    ] =
      useState(
        false,
      );
    const [
      supportName,
      setSupportName,
    ] =
      useState(
        "",
      );
    const [
      supportEmail,
      setSupportEmail,
    ] =
      useState(
        "",
      );
    const [
      supportMessage,
      setSupportMessage,
    ] =
      useState(
        "",
      );
    const [
      supportStatus,
      setSupportStatus,
    ] =
      useState(
        "idle",
      );
    const [
      supportError,
      setSupportError,
    ] =
      useState(
        "",
      );

    // Auto-fill user details for the Support Widget
    useEffect(() => {
      const userObj =
        JSON.parse(
          localStorage.getItem(
            "nippy_user",
          ) ||
            "{}",
        );
      if (
        userObj.username
      )
        setSupportName(
          userObj.username,
        );
      if (
        userObj.email
      )
        setSupportEmail(
          userObj.email,
        );
    }, []);

    useEffect(() => {
      const fetchUnreadCount =
        async () => {
          try {
            const res =
              await api.get(
                "/messages/unread-count",
              );
            setGlobalUnread(
              res
                .data
                .unreadCount ||
                0,
            );
          } catch (error) {
            console.error(
              "Failed to fetch unread count:",
              error,
            );
          }
        };

      fetchUnreadCount();
      const interval =
        setInterval(
          fetchUnreadCount,
          30000,
        );
      return () =>
        clearInterval(
          interval,
        );
    }, []);

    // --- SUPPORT SUBMIT LOGIC ---
    const handleSupportSubmit =
      async (
        e,
      ) => {
        e.preventDefault();
        setSupportStatus(
          "loading",
        );
        setSupportError(
          "",
        );

        try {
          const payload =
            {
              subject: `Creator Support Request from ${supportName}`,
              message: `Contact Email: ${supportEmail}\n\n${supportMessage}`,
            };

          await api.post(
            "/users/support",
            payload,
          );

          setSupportStatus(
            "success",
          );
          setSupportMessage(
            "",
          );
        } catch (err) {
          setSupportStatus(
            "error",
          );
          setSupportError(
            err
              .response
              ?.data
              ?.message ||
              "Failed to submit ticket. Please try again.",
          );
        }
      };

    const desktopNavItems =
      [
        {
          path: "/creator/dashboard",
          label:
            "Dashboard",
          icon: LayoutDashboard,
        },
        {
          path: "/creator/feed",
          label:
            "Feed",
          icon: Rss,
        },
        {
          path: "/creator/vault",
          label:
            "Vault",
          icon: FolderKanban,
        },
        {
          path: "/creator/messages",
          label:
            "Messages",
          icon: MessageCircle,
        },
        {
          path: "/creator/notifications",
          label:
            "Alerts",
          icon: Bell,
        },
        {
          path: "/creator/profile",
          label:
            "Profile",
          icon: User,
        },
      ];

    const mobileNavItems =
      desktopNavItems.filter(
        (
          item,
        ) =>
          item.label !==
          "Alerts",
      );

    const handleLogout =
      () => {
        localStorage.removeItem(
          "nippy_token",
        );
        localStorage.removeItem(
          "token",
        );
        localStorage.removeItem(
          "nippy_user",
        );
        navigate(
          "/auth/login",
        );
      };

    return (
      <div className="relative min-h-screen text-slate-200 flex flex-col font-sans">
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
          <img
            src={
              landingBackground
            }
            alt="Creator Background"
            className="w-full h-full object-cover grayscale-[50%] blur-2xl scale-125 opacity-30"
          />
          <div className="absolute inset-0 bg-slate-950/95"></div>
        </div>

        {/* --- DESKTOP TOP NAV --- */}
        <header className="hidden md:flex justify-between items-center py-4 px-10 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
          <div
            className="flex items-center cursor-pointer group"
            onClick={() =>
              navigate(
                "/creator/dashboard",
              )
            }
          >
            <img
              src={
                nippyLogo
              }
              alt="Nippy Logo"
              className="w-8 h-8 object-contain group-hover:scale-105 transition-transform"
            />
            <span className="text-[#FF5757] font-bold text-2xl tracking-tight -ml-1 transition-colors">
              ippy
              <span className="text-[#FF5757]">
                .
              </span>
            </span>
            <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF5757]/10 text-[#FF5757] border border-[#FF5757]/20 uppercase tracking-wider">
              Creator
            </span>
          </div>

          <nav className="flex gap-2">
            {desktopNavItems.map(
              (
                item,
              ) => {
                const isActive =
                  location.pathname.includes(
                    item.path,
                  ) ||
                  (item.label ===
                    "Profile" &&
                    location.pathname ===
                      "/creator/settings");
                const Icon =
                  item.icon;

                if (
                  item.label ===
                  "Profile"
                ) {
                  return (
                    <div
                      key={
                        item.path
                      }
                      className="relative group flex items-center"
                    >
                      <Link
                        to={
                          item.path
                        }
                        className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                          isActive
                            ? "bg-slate-800 text-[#FF5757] font-bold shadow-lg"
                            : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                        }`}
                      >
                        <Icon
                          size={
                            18
                          }
                        />
                        <span className="text-sm">
                          {
                            item.label
                          }
                        </span>
                      </Link>

                      {/* ✅ THE FIX: Replaced mt-2 with a pt-2 transparent wrapper to bridge the hover gap */}
                      <div className="absolute top-full right-0 pt-2 w-48 opacity-0 group-hover:opacity-100 transition-opacity invisible group-hover:visible z-50">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                          <Link
                            to="/creator/settings"
                            className="flex items-center px-4 py-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border-b border-slate-800/50"
                          >
                            <Settings
                              size={
                                16
                              }
                              className="mr-3 text-slate-500"
                            />{" "}
                            Account
                            Settings
                          </Link>
                          <Link
                            to="/auth/creator/biodata"
                            className="flex items-center px-4 py-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                          >
                            <ShieldCheck
                              size={
                                16
                              }
                              className="mr-3 text-slate-500"
                            />{" "}
                            KYC
                            &
                            Verification
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={
                      item.path
                    }
                    to={
                      item.path
                    }
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                      isActive
                        ? "bg-slate-800 text-[#FF5757] font-bold shadow-lg"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="relative">
                      <Icon
                        size={
                          18
                        }
                      />
                      {item.label ===
                        "Messages" &&
                        globalUnread >
                          0 && (
                          <span className="absolute -top-1.5 -right-2 bg-[#FF5757] text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-slate-900">
                            {globalUnread >
                            99
                              ? "99+"
                              : globalUnread}
                          </span>
                        )}
                    </div>
                    <span className="text-sm">
                      {
                        item.label
                      }
                    </span>
                  </Link>
                );
              },
            )}
          </nav>

          <button
            onClick={
              handleLogout
            }
            className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-[#FF5757] transition-colors group"
          >
            <LogOut
              size={
                18
              }
              className="group-hover:scale-110 transition-transform"
            />
            <span className="text-sm font-bold">
              Sign
              Out
            </span>
          </button>
        </header>

        {/* --- MOBILE TOP HEADER --- */}
        <header className="md:hidden flex justify-between items-center py-3 px-5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
          <div
            className="flex items-center"
            onClick={() =>
              navigate(
                "/creator/dashboard",
              )
            }
          >
            <img
              src={
                nippyLogo
              }
              alt="Nippy Logo"
              className="w-7 h-7 object-contain"
            />
            <span className="text-[#FF5757] font-bold text-xl tracking-tight -ml-1">
              ippy.
            </span>
          </div>
          <Link
            to="/creator/notifications"
            className={`relative p-2 rounded-full transition-colors ${
              location.pathname.includes(
                "/creator/notifications",
              )
                ? "text-[#FF5757] bg-[#FF5757]/10"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Bell
              size={
                22
              }
            />
          </Link>
        </header>

        <main className="flex-grow pb-20 md:pb-0 relative">
          <Outlet />
        </main>

        {/* --- GLOBAL UPLOAD PROGRESS TOAST --- */}
        {uploadState.isUploading && (
          <div className="fixed bottom-24 left-4 right-4 md:left-auto md:bottom-8 md:right-[26rem] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl md:w-80 z-[100] p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 overflow-hidden">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    uploadState.status ===
                    "error"
                      ? "bg-red-500/10 text-red-500"
                      : uploadState.status ===
                          "complete"
                        ? "bg-[#FF5757]/10 text-[#FF5757]"
                        : "bg-blue-500/10 text-blue-500"
                  }`}
                >
                  {uploadState.status ===
                  "error" ? (
                    <AlertCircle
                      size={
                        20
                      }
                    />
                  ) : uploadState.status ===
                    "complete" ? (
                    <CheckCircle2
                      size={
                        20
                      }
                    />
                  ) : (
                    <UploadCloud
                      size={
                        20
                      }
                      className="animate-pulse"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {uploadState.fileName ||
                      "Media Upload"}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {uploadState.status ===
                    "error"
                      ? "Failed"
                      : uploadState.status ===
                          "complete"
                        ? "Processed Successfully"
                        : "Uploading in background"}
                  </p>
                </div>
              </div>

              {uploadState.status !==
                "uploading" && (
                <button
                  onClick={
                    clearUpload
                  }
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <X
                    size={
                      16
                    }
                  />
                </button>
              )}
            </div>

            {uploadState.status ===
              "uploading" && (
              <div className="w-full">
                <div className="flex justify-between mb-1.5">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Transferring...
                  </span>
                  <span className="text-[10px] text-[#FF5757] font-bold font-mono">
                    {
                      uploadState.progress
                    }
                    %
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-800">
                  <div
                    className="bg-[#FF5757] h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${uploadState.progress}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}

            {uploadState.status ===
              "error" && (
              <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                {
                  uploadState.errorMessage
                }
              </p>
            )}
          </div>
        )}

        {/* --- FLOATING SUPPORT BUBBLE --- */}
        <button
          onClick={() =>
            setIsSupportOpen(
              !isSupportOpen,
            )
          }
          className={`fixed z-[100] bottom-24 right-4 md:bottom-8 md:right-8 text-white p-3.5 sm:p-4 rounded-full shadow-[0_4px_20px_rgba(255,87,87,0.4)] transition-all flex items-center justify-center group ${
            isSupportOpen
              ? "bg-slate-700 hover:bg-slate-600 scale-100"
              : "bg-[#FF5757] hover:bg-rose-600 hover:scale-110"
          }`}
          aria-label="Help & Support"
        >
          {isSupportOpen ? (
            <X
              size={
                26
              }
            />
          ) : (
            <LifeBuoy
              size={
                26
              }
            />
          )}
          {!isSupportOpen && (
            <span className="absolute right-full mr-4 bg-slate-800 text-white text-sm font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-slate-700 shadow-lg hidden md:block">
              Creator
              Support
            </span>
          )}
        </button>

        {/* --- INLINE SUPPORT WIDGET --- */}
        {isSupportOpen && (
          <div className="fixed z-[95] bottom-[8.5rem] right-4 md:bottom-[5.5rem] md:right-8 w-[calc(100vw-2rem)] sm:w-[380px] bg-slate-900 border border-slate-700 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-800/30">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <LifeBuoy
                  className="text-[#FF5757]"
                  size={
                    20
                  }
                />{" "}
                Creator
                Support
              </h3>
              <button
                onClick={() =>
                  setIsSupportOpen(
                    false,
                  )
                }
                className="text-slate-400 hover:text-white transition-colors md:hidden"
              >
                <X
                  size={
                    20
                  }
                />
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {supportStatus ===
              "success" ? (
                <div className="flex flex-col items-center text-center py-6">
                  <div className="w-14 h-14 bg-[#FF5757]/10 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle2
                      className="text-[#FF5757]"
                      size={
                        28
                      }
                    />
                  </div>
                  <h4 className="text-md font-bold text-white mb-1">
                    Ticket
                    Submitted
                  </h4>
                  <p className="text-slate-400 text-xs px-2">
                    Our
                    admins
                    have
                    received
                    your
                    message
                    and
                    will
                    assist
                    you
                    shortly.
                  </p>
                  <button
                    onClick={() => {
                      setSupportStatus(
                        "idle",
                      );
                      setIsSupportOpen(
                        false,
                      );
                    }}
                    className="mt-5 w-full bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={
                    handleSupportSubmit
                  }
                  className="space-y-4"
                >
                  {supportStatus ===
                    "error" && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-2">
                      <AlertCircle
                        className="text-red-500 shrink-0 mt-0.5"
                        size={
                          16
                        }
                      />
                      <p className="text-red-400 text-xs">
                        {
                          supportError
                        }
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        required
                        value={
                          supportName
                        }
                        onChange={(
                          e,
                        ) =>
                          setSupportName(
                            e
                              .target
                              .value,
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF5757]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={
                          supportEmail
                        }
                        onChange={(
                          e,
                        ) =>
                          setSupportEmail(
                            e
                              .target
                              .value,
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#FF5757]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                      How
                      can
                      we
                      help?
                    </label>
                    <textarea
                      required
                      value={
                        supportMessage
                      }
                      onChange={(
                        e,
                      ) =>
                        setSupportMessage(
                          e
                            .target
                            .value,
                        )
                      }
                      placeholder="Describe your issue, payout delay, or bug report..."
                      rows="4"
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#FF5757] resize-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      supportStatus ===
                      "loading"
                    }
                    className="w-full bg-[#FF5757] hover:bg-rose-600 text-white text-sm font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-1 shadow-lg shadow-[#FF5757]/20"
                  >
                    {supportStatus ===
                    "loading" ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send
                          size={
                            16
                          }
                        />{" "}
                        Send
                        Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* --- MOBILE BOTTOM NAV --- */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 z-50 flex justify-around items-center py-2 px-2 pb-safe shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]">
          {mobileNavItems.map(
            (
              item,
            ) => {
              const isActive =
                location.pathname.includes(
                  item.path,
                );
              const Icon =
                item.icon;

              return (
                <Link
                  key={
                    item.path
                  }
                  to={
                    item.path
                  }
                  className={`flex flex-col items-center p-2 rounded-xl transition-all w-16 ${
                    isActive
                      ? "text-[#FF5757]"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <div
                    className={`relative p-1.5 rounded-lg transition-colors ${
                      isActive
                        ? "bg-[#FF5757]/10"
                        : "bg-transparent"
                    }`}
                  >
                    <Icon
                      size={
                        22
                      }
                      className={
                        isActive
                          ? "fill-[#FF5757]/20"
                          : ""
                      }
                    />
                    {item.label ===
                      "Messages" &&
                      globalUnread >
                        0 && (
                        <span className="absolute -top-0.5 -right-1 bg-[#FF5757] text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-slate-950">
                          {globalUnread >
                          99
                            ? "99+"
                            : globalUnread}
                        </span>
                      )}
                  </div>
                  <span className="text-[10px] mt-1 font-bold tracking-wide">
                    {
                      item.label
                    }
                  </span>
                </Link>
              );
            },
          )}
        </nav>
      </div>
    );
  };

export default CreatorLayout;
