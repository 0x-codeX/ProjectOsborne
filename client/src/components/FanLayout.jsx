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
import {
  PlaySquare,
  Bell,
  MessageCircle,
  Bookmark,
  LayoutDashboard,
  User,
  Settings,
  LogOut,
  Users,
  LifeBuoy,
  X,
  Send,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import axios from "axios";
import landingBackground from "../assets/background7.jpg";
import nippyLogo from "../assets/NippyLogo.png";

const FanLayout =
  () => {
    const location =
      useLocation();
    const navigate =
      useNavigate();

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

    const [
      unreadData,
      setUnreadData,
    ] =
      useState(
        {
          creatorsCount: 0,
          singleCreatorMessages: 0,
        },
      );
    const [
      unreadNotifs,
      setUnreadNotifs,
    ] =
      useState(
        0,
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
      const fetchBadges =
        async () => {
          try {
            const token =
              localStorage.getItem(
                "nippy_token",
              );
            if (
              !token
            )
              return;

            const msgRes =
              await axios.get(
                "/api/messages/inbox",
                {
                  headers:
                    {
                      Authorization: `Bearer ${token}`,
                    },
                },
              );
            const chats =
              msgRes.data ||
              [];
            const unreadChats =
              chats.filter(
                (
                  chat,
                ) =>
                  chat.unreadCount >
                  0,
              );

            setUnreadData(
              {
                creatorsCount:
                  unreadChats.length,
                singleCreatorMessages:
                  unreadChats.length ===
                  1
                    ? unreadChats[0]
                        .unreadCount
                    : 0,
              },
            );

            const notifRes =
              await axios.get(
                "/api/notifications/unread-count",
                {
                  headers:
                    {
                      Authorization: `Bearer ${token}`,
                    },
                },
              );
            setUnreadNotifs(
              notifRes
                .data
                .unreadCount ||
                0,
            );
          } catch (error) {
            console.error(
              "Failed to sync badges:",
              error,
            );
          }
        };

      fetchBadges();

      const handleNotifsRead =
        () =>
          setUnreadNotifs(
            0,
          );
      window.addEventListener(
        "notificationsRead",
        handleNotifsRead,
      );

      const interval =
        setInterval(
          fetchBadges,
          30000,
        );

      return () => {
        clearInterval(
          interval,
        );
        window.removeEventListener(
          "notificationsRead",
          handleNotifsRead,
        );
      };
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
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const payload =
            {
              subject: `Support Request from ${supportName}`,
              message: `Contact Email: ${supportEmail}\n\n${supportMessage}`,
            };

          await axios.post(
            "http://localhost:5000/api/users/support",
            payload,
            {
              headers:
                {
                  Authorization: `Bearer ${token}`,
                },
            },
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

    const navItems =
      [
        {
          path: "/feed",
          label:
            "Feed",
          icon: PlaySquare,
        },
        {
          path: "/bookmarks",
          label:
            "Bookmarks",
          icon: Bookmark,
        },
        {
          path: "/notifications",
          label:
            "Notifications",
          icon: Bell,
        },
        {
          path: "/messages",
          label:
            "Messages",
          icon: MessageCircle,
        },
        {
          path: "/fan/dashboard",
          label:
            "Dashboard",
          icon: LayoutDashboard,
        },
        {
          path: "/fan/profile",
          label:
            "Profile",
          icon: User,
        },
      ];

    const handleLogout =
      () => {
        localStorage.removeItem(
          "nippy_token",
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
            className="w-full h-full object-cover grayscale-[50%] blur-2xl scale-125 opacity-40"
          />
          <div className="absolute inset-0 bg-nippy-onyx/95"></div>
        </div>

        <header className="hidden md:flex justify-between items-center py-4 px-10 border-b border-gray-800 bg-nippy-obsidian/90 backdrop-blur-md sticky top-0 z-50">
          <div
            className="flex items-center cursor-pointer group"
            onClick={() =>
              navigate(
                "/feed",
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
            <span className="text-emerald-500 font-bold text-2xl tracking-tight -ml-1 transition-colors">
              ippy
              <span className="text-emerald-500">
                .
              </span>
            </span>
          </div>

          <nav className="flex gap-2">
            {navItems.map(
              (
                item,
              ) => {
                const isActive =
                  location.pathname ===
                    item.path ||
                  (item.label ===
                    "Profile" &&
                    location.pathname ===
                      "/fan/settings");
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
                            ? "bg-gray-800 text-emerald-500 font-semibold"
                            : "text-gray-400 hover:text-white hover:bg-gray-800/50"
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

                      <div className="absolute top-full right-0 mt-2 w-40 bg-nippy-obsidian border border-gray-800 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity invisible group-hover:visible z-50 overflow-hidden">
                        <Link
                          to="/fan/settings"
                          className="flex items-center px-4 py-3 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                        >
                          <Settings
                            size={
                              16
                            }
                            className="mr-2"
                          />{" "}
                          Settings
                        </Link>
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                      isActive
                        ? "bg-gray-800 text-emerald-500 font-semibold"
                        : "text-gray-400 hover:text-white hover:bg-gray-800/50"
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
                        unreadData.creatorsCount >
                          0 && (
                          <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-nippy-obsidian shadow-sm">
                            {unreadData.creatorsCount >
                            1 ? (
                              <>
                                <Users
                                  size={
                                    8
                                  }
                                />{" "}
                                {
                                  unreadData.creatorsCount
                                }
                              </>
                            ) : (
                              unreadData.singleCreatorMessages
                            )}
                          </span>
                        )}
                      {item.label ===
                        "Notifications" &&
                        unreadNotifs >
                          0 && (
                          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-nippy-obsidian shadow-sm shadow-red-500/50"></span>
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
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-red-400 transition-colors"
          >
            <LogOut
              size={
                18
              }
            />
            <span className="text-sm font-medium">
              Exit
            </span>
          </button>
        </header>

        <main className="flex-grow pb-20 md:pb-0">
          <Outlet />
        </main>

        {/* --- FLOATING SUPPORT BUBBLE --- */}
        <button
          onClick={() =>
            setIsSupportOpen(
              !isSupportOpen,
            )
          }
          className={`fixed z-[100] bottom-24 right-4 md:bottom-8 md:right-8 text-white p-3.5 sm:p-4 rounded-full shadow-[0_4px_20px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center group ${isSupportOpen ? "bg-slate-700 hover:bg-slate-600 scale-100" : "bg-emerald-500 hover:bg-emerald-600 hover:scale-110"}`}
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
              Get
              Help
            </span>
          )}
        </button>

        {/* --- INLINE SUPPORT WIDGET (Slides up from the bubble) --- */}
        {isSupportOpen && (
          <div className="fixed z-[95] bottom-[8.5rem] right-4 md:bottom-[5.5rem] md:right-8 w-[calc(100vw-2rem)] sm:w-[380px] bg-slate-900 border border-slate-700 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300 overflow-hidden">
            {/* Widget Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-800/30">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <LifeBuoy
                  className="text-emerald-500"
                  size={
                    20
                  }
                />{" "}
                Support
                Desk
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

            {/* Widget Body */}
            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {supportStatus ===
              "success" ? (
                <div className="flex flex-col items-center text-center py-6">
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle
                      className="text-emerald-500"
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
                    review
                    it
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
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
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
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
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
                      placeholder="Describe your issue, report a bug, or flag content..."
                      rows="4"
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      supportStatus ===
                      "loading"
                    }
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-1 shadow-lg shadow-emerald-500/20"
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

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-nippy-obsidian/95 backdrop-blur-md border-t border-gray-800 z-50 flex justify-around items-center py-3 px-2 pb-safe">
          {navItems
            .filter(
              (
                item,
              ) =>
                item.label !==
                "Dashboard",
            )
            .map(
              (
                item,
              ) => {
                const isActive =
                  location.pathname ===
                  item.path;
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
                    className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                      isActive
                        ? "text-emerald-500"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <div className="relative">
                      <Icon
                        size={
                          24
                        }
                        className={
                          isActive
                            ? "fill-emerald-500/20"
                            : ""
                        }
                      />
                      {item.label ===
                        "Messages" &&
                        unreadData.creatorsCount >
                          0 && (
                          <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-nippy-obsidian shadow-sm shadow-black">
                            {unreadData.creatorsCount >
                            1 ? (
                              <>
                                <Users
                                  size={
                                    8
                                  }
                                />{" "}
                                {
                                  unreadData.creatorsCount
                                }
                              </>
                            ) : (
                              unreadData.singleCreatorMessages
                            )}
                          </span>
                        )}
                      {item.label ===
                        "Notifications" &&
                        unreadNotifs >
                          0 && (
                          <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-nippy-obsidian shadow-sm shadow-red-500/50"></span>
                        )}
                    </div>
                    <span className="text-[10px] mt-1 font-medium">
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

export default FanLayout;
