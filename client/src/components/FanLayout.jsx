import React from "react";
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
} from "lucide-react";
import landingBackground from "../assets/background7.jpg";
import nippyLogo from "../assets/NippyLogo.png";

const FanLayout =
  () => {
    const location =
      useLocation();
    const navigate =
      useNavigate();

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
        {/* BACKGROUND INJECTION - IRONCLAD UI */}
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

        {/* DESKTOP TOP NAV (Hidden on Mobile) */}
        <header className="hidden md:flex justify-between items-center py-4 px-10 border-b border-gray-800 bg-nippy-obsidian/90 backdrop-blur-md sticky top-0 z-50">
          {/* Logo */}
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
            {/* Cleaned up conflicting text colors - streamlined to White + Emerald */}
            <span className="text-emerald-500 font-bold text-2xl tracking-tight -ml-1 transition-colors">
              ippy
              <span className="text-emerald-500">
                .
              </span>
            </span>
          </div>

          {/* Center Nav Links */}
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
                );
              },
            )}
          </nav>

          {/* Logout Button */}
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

        {/* MAIN CONTENT AREA */}
        <main className="flex-grow pb-20 md:pb-0">
          <Outlet />
        </main>

        {/* MOBILE BOTTOM NAV (Hidden on Desktop) */}
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
