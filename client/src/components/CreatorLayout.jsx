import React from "react";
import {
  Outlet,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  UserCog,
  Radio,
} from "lucide-react";

const CreatorLayout =
  () => {
    const location =
      useLocation();
    const navigate =
      useNavigate();

    const navItems =
      [
        {
          name: "Dashboard",
          path: "/creator/dashboard",
          icon: LayoutDashboard,
        },
        {
          name: "Vault",
          path: "/creator/vault",
          icon: FolderKanban,
        },
        {
          name: "Profile",
          path: "/creator/profile",
          icon: UserCog,
        },
      ];

    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
        {/* DESKTOP TOP NAVIGATION (Hidden on mobile) */}
        <nav className="hidden md:flex fixed top-0 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-50 h-16 items-center justify-between px-8">
          <div className="flex items-center gap-2">
            {/* Your Logo goes here */}
            <div className="w-8 h-8 bg-[#FF5757] rounded-lg flex items-center justify-center font-bold text-white">
              N
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Nippy
            </span>
            <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded font-mono ml-2">
              CREATOR
            </span>
          </div>

          <div className="flex items-center gap-6">
            {navItems.map(
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
                  <NavLink
                    key={
                      item.name
                    }
                    to={
                      item.path
                    }
                    className={`flex items-center gap-2 text-sm font-semibold transition-all ${
                      isActive
                        ? "text-[#FF5757]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${isActive ? "text-[#FF5757]" : ""}`}
                    />
                    {
                      item.name
                    }
                  </NavLink>
                );
              },
            )}
          </div>

          {/* Action Button: Jump to Fan Feed */}
          <button
            onClick={() =>
              navigate(
                "/feed",
              )
            }
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            View
            Fan
            Feed
          </button>
        </nav>

        {/* MAIN CONTENT AREA */}
        {/* We add pt-16 for desktop top nav, and pb-20 for mobile bottom nav */}
        <main className="pt-4 md:pt-20 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
          {/* The Outlet is where Dashboard, Vault, or Profile will actually render */}
          <Outlet />
        </main>

        {/* MOBILE BOTTOM NAVIGATION (Hidden on desktop) */}
        <nav className="md:hidden fixed bottom-0 w-full bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 z-50 h-16 flex items-center justify-around px-2 pb-safe">
          {navItems.map(
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
                <NavLink
                  key={
                    item.name
                  }
                  to={
                    item.path
                  }
                  className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
                    isActive
                      ? "text-[#FF5757]"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive ? "text-[#FF5757]" : ""}`}
                  />
                  <span className="text-[10px] font-semibold">
                    {
                      item.name
                    }
                  </span>
                </NavLink>
              );
            },
          )}
        </nav>
      </div>
    );
  };

export default CreatorLayout;
