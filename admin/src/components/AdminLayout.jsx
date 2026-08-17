import React from "react";
import {
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  ShieldAlert,
  Shield,
  Users,
  LogOut,
  Activity,
  MessageSquare,
  Wallet,
} from "lucide-react";
import nippyLogo from "../assets/NippyLogo.png";

const AdminLayout =
  () => {
    const navigate =
      useNavigate();
    const location =
      useLocation();
    const user =
      JSON.parse(
        localStorage.getItem(
          "nippy_admin_user",
        ) ||
          "{}",
      );

    const handleLogout =
      () => {
        localStorage.removeItem(
          "nippy_admin_token",
        );
        localStorage.removeItem(
          "nippy_admin_user",
        );
        navigate(
          "/login",
        );
      };

    // SMART NAVIGATION: Forces a refresh if clicking the active tab
    const handleNavigation =
      (
        path,
      ) => {
        if (
          location.pathname ===
          path
        ) {
          // Force a window reload to clear all React state (resets User360 to default search)
          window.location.reload();
        } else {
          navigate(
            path,
          );
        }
      };

    // DYNAMIC STYLING: Highlights the currently active tab
    const getNavClass =
      (
        path,
      ) => {
        const isActive =
          location.pathname ===
          path;
        return `w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
          isActive
            ? "bg-slate-800 text-white shadow-sm"
            : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
        }`;
      };

    // DYNAMIC STYLING FOR GOD ADMIN BUTTON
    const getGodAdminNavClass =
      (
        path,
      ) => {
        const isActive =
          location.pathname ===
          path;
        return `w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
          isActive
            ? "bg-[#FF5757]/20 text-[#FF5757] shadow-sm"
            : "text-[#FF5757] hover:bg-[#FF5757]/10"
        }`;
      };

    return (
      <div className="flex h-screen bg-slate-950 text-slate-200">
        {/* SIDEBAR */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-2xl font-bold text-[#FF5757] flex items-center gap-2">
              <img
                src={
                  nippyLogo
                }
                alt="Nippy Logo"
                className="w-8 h-8 object-contain group-hover:scale-105 transition-transform"
              />
              nippy
              <span className="text-white">
                Admin
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">
              {user.role?.replace(
                "_",
                " ",
              )}
            </p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() =>
                handleNavigation(
                  "/",
                )
              }
              className={getNavClass(
                "/",
              )}
            >
              <Users
                size={
                  18
                }
              />{" "}
              User
              360
            </button>

            <button
              onClick={() =>
                handleNavigation(
                  "/support",
                )
              }
              className={getNavClass(
                "/support",
              )}
            >
              <MessageSquare
                size={
                  18
                }
              />{" "}
              Support
              Desk
            </button>

            <button
              onClick={() =>
                handleNavigation(
                  "/payouts",
                )
              }
              className={getNavClass(
                "/payouts",
              )}
            >
              <Wallet
                size={
                  18
                }
              />{" "}
              Payout
              Queue
            </button>

            {/* ONLY GOD ADMIN CAN SEE THIS BUTTON */}
            {user.role ===
              "GOD_ADMIN" && (
              <button
                onClick={() =>
                  handleNavigation(
                    "/access",
                  )
                }
                className={getGodAdminNavClass(
                  "/access",
                )}
              >
                <Shield
                  size={
                    18
                  }
                />{" "}
                Access
                Control
              </button>
            )}

            <button
              onClick={() =>
                handleNavigation(
                  "/logs",
                )
              } // Changed to /logs to prevent collision with User360
              className={getNavClass(
                "/logs",
              )}
            >
              <Activity
                size={
                  18
                }
              />{" "}
              System
              Logs
            </button>
          </nav>

          <div className="p-4 border-t border-slate-800">
            <button
              onClick={
                handleLogout
              }
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-colors"
            >
              <LogOut
                size={
                  18
                }
              />{" "}
              Emergency
              Log
              Out
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-slate-900/50 border-b border-slate-800 flex items-center px-8 justify-between">
            <h2 className="font-semibold text-slate-300">
              Command
              Center
            </h2>
            <div className="text-sm font-mono font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              System
              Secure
            </div>
          </header>
          <div className="flex-1 overflow-auto p-8 relative">
            <Outlet />
          </div>
        </main>
      </div>
    );
  };

export default AdminLayout;
