import React, {
  useEffect,
  useState,
} from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Wallet,
  Settings,
} from "lucide-react";
import {
  useNavigate,
  Link,
} from "react-router-dom";

const CreatorProfile =
  () => {
    const navigate =
      useNavigate();
    const [
      user,
      setUser,
    ] =
      useState(
        null,
      );

    useEffect(() => {
      const storedData =
        JSON.parse(
          localStorage.getItem(
            "nippy_user",
          ),
        );
      if (
        !storedData ||
        storedData.role !==
          "creator"
      ) {
        navigate(
          "/auth/login",
        );
        return;
      }
      setUser(
        storedData,
      );
    }, [
      navigate,
    ]);

    if (
      !user
    )
      return null;

    return (
      <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-slate-200 font-sans relative">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Profile
              Overview
            </h1>
            <Link
              to="/creator/settings"
              className="flex items-center px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors text-sm font-bold shadow-lg"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit
              Settings
            </Link>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF5757]/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>

            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {user.profileImage ? (
                    <img
                      src={
                        user.profileImage
                      }
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-slate-500" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    @
                    {user.username ||
                      "Creator"}
                  </h2>
                  <div
                    className={`inline-flex px-3 py-1 rounded-full border text-xs font-bold items-center gap-1.5 ${
                      user.kycStatus ===
                      "verified"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-500"
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    {user.kycStatus ===
                    "verified"
                      ? "Identity Verified"
                      : "Unverified"}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              <div className="space-y-6 bg-slate-950 p-6 rounded-2xl border border-slate-800">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                    Email
                  </p>
                  <div className="flex items-center text-white font-medium">
                    <Mail className="w-5 h-5 mr-3 text-slate-400" />{" "}
                    {user.email ||
                      "N/A"}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                    Phone
                  </p>
                  <div className="flex items-center text-white font-medium">
                    <Phone className="w-5 h-5 mr-3 text-slate-400" />{" "}
                    {user.phone ||
                      "N/A"}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                    Location
                  </p>
                  <div className="flex items-center text-white font-medium">
                    <MapPin className="w-5 h-5 mr-3 text-slate-400" />{" "}
                    {user.country ||
                      "N/A"}
                  </div>
                </div>
              </div>

              <div className="space-y-6 bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="pb-4 border-b border-slate-800 mb-6">
                    <h3 className="text-sm font-bold text-white flex items-center mb-4 uppercase tracking-wider">
                      <Wallet className="w-4 h-4 mr-2 text-[#FF5757]" />{" "}
                      Financials
                    </h3>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                        Payout
                        Address
                      </p>
                      <p className="text-white font-mono text-sm bg-slate-900 p-3 rounded-lg border border-slate-700 truncate opacity-90">
                        {user.payoutAddress ||
                          user.walletAddress ||
                          "Not configured"}
                      </p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">
                      Content
                      Policy
                    </p>
                    <p className="text-white font-medium">
                      NSFW
                      Allowed:{" "}
                      <span
                        className={
                          user.willingNsfw
                            ? "text-[#FF5757]"
                            : "text-slate-400"
                        }
                      >
                        {user.willingNsfw
                          ? "Yes"
                          : "No"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

export default CreatorProfile;
