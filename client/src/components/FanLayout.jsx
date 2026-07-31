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

const FanLayout =
  () => {
    const location =
      useLocation();
    const navigate =
      useNavigate();

    // 1. UPDATED NAV ARRAY: Added Messages, Removed Settings
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
          path: "/messages", // Added Messages exactly where you wanted it
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
      <div className="min-h-screen bg-nippy-onyx text-slate-200 flex flex-col font-sans">
        {/* DESKTOP TOP NAV (Hidden on Mobile) */}
        <header className="hidden md:flex justify-between items-center py-4 px-10 border-b border-gray-800 bg-nippy-obsidian/90 backdrop-blur-md sticky top-0 z-50">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() =>
              navigate(
                "/feed",
              )
            }
          >
            <div className="w-8 h-8 bg-gradient-to-tr from-nippy-coral to-nippy-coralHover rounded-lg flex items-center justify-center shadow-lg shadow-nippy-coral/20">
              <span className="text-white font-bold text-xl italic tracking-tighter">
                n
              </span>
            </div>
            <span className="text-nippy-blush font-bold text-xl tracking-tight">
              nippy
              <span className="text-nippy-coral">
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
                // Keep Profile highlighted if they are inside Settings
                const isActive =
                  location.pathname ===
                    item.path ||
                  (item.label ===
                    "Profile" &&
                    location.pathname ===
                      "/fan/settings");
                const Icon =
                  item.icon;

                // 2. THE DROPDOWN INJECTION FOR PROFILE
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
                            ? "bg-gray-800 text-nippy-coral font-semibold"
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

                      {/* Hover Dropdown for Settings (Desktop Only) */}
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

                // Standard render for everything else
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
                        ? "bg-gray-800 text-nippy-coral font-semibold"
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
                        ? "text-nippy-coral"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <Icon
                      size={
                        24
                      }
                      className={
                        isActive
                          ? "fill-nippy-coral/20"
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
