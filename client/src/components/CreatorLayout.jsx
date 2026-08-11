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
import axios from "axios";
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
} from "lucide-react";

import landingBackground from "../assets/background7.jpg";
import nippyLogo from "../assets/NippyLogo.png";

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

    // Fetch lightweight unread count for the sidebar badge
    useEffect(() => {
      const fetchUnreadCount =
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
            const res =
              await axios.get(
                "/api/messages/unread-count",
                {
                  headers:
                    {
                      Authorization: `Bearer ${token}`,
                    },
                },
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

      // Optional: Poll every 30s to keep the layout badge updated without full sockets
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

                      <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity invisible group-hover:visible z-50 overflow-hidden">
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
                      {/* UNREAD BADGE INJECTION */}
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

        <main className="flex-grow pb-20 md:pb-0">
          <Outlet />
        </main>

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
                    className={`relative p-1.5 rounded-lg transition-colors ${isActive ? "bg-[#FF5757]/10" : "bg-transparent"}`}
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

                    {/* UNREAD BADGE INJECTION MOBILE */}
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
