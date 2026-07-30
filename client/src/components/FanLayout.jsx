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

    const navItems =
      [
        {
          path: "/feed",
          label:
            "Feed",
          icon: PlaySquare,
        },
        {
          path: "/notifications",
          label:
            "Notifications",
          icon: Bell,
        },
        {
          path: "/bookmarks",
          label:
            "Bookmarks",
          icon: Bookmark,
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
        {
          path: "/fan/settings",
          label:
            "Settings",
          icon: Settings,
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
        ); // Send them back to the landing page
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
          {/* This is where your nested routes (like FanFeed) will render */}
          <Outlet />
        </main>

        {/* MOBILE BOTTOM NAV (Hidden on Desktop) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-nippy-obsidian/95 backdrop-blur-md border-t border-gray-800 z-50 flex justify-around items-center py-3 px-2 pb-safe">
          {navItems.map(
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
