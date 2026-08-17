import React, {
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  Users,
  ShieldAlert,
  User,
  LogOut,
  Radio,
} from "lucide-react";
import { ethers } from "ethers";
import MediaUploader from "../components/MediaUploader";
import MonetizationSettings from "../components/MonetizationSettings";
import EarningsDashboard from "../components/EarningsDashboard";
import api from "../utils/api";

const CreatorDashboard =
  () => {
    const navigate =
      useNavigate();
    const [
      isLoading,
      setIsLoading,
    ] =
      useState(
        true,
      );
    const [
      user,
      setUser,
    ] =
      useState(
        null,
      );
    const [
      usdtBalance,
      setUsdtBalance,
    ] =
      useState(
        "0.00",
      );
    const [
      isFetchingBalance,
      setIsFetchingBalance,
    ] =
      useState(
        false,
      );
    const [
      isStartingKyc,
      setIsStartingKyc,
    ] =
      useState(
        false,
      );

    // 1. Authenticate & Sync User Data with Backend
    useEffect(() => {
      const fetchFreshUserData =
        async () => {
          try {
            const storedData =
              JSON.parse(
                localStorage.getItem(
                  "nippy_user",
                ) ||
                  "{}",
              );
            const token =
              localStorage.getItem(
                "nippy_token",
              ) ||
              localStorage.getItem(
                "token",
              );

            if (
              !storedData ||
              storedData.role !==
                "creator" ||
              !token
            ) {
              navigate(
                "/auth/login",
              );
              return;
            }

            setUser(
              storedData,
            );

            // Source of truth fetch using global API utility
            const response =
              await api.get(
                "/auth/me",
              );
            const freshUser =
              response.data;

            setUser(
              freshUser,
            );
            localStorage.setItem(
              "nippy_user",
              JSON.stringify(
                freshUser,
              ),
            );
          } catch (error) {
            console.error(
              "Auth Check Error:",
              error.message,
            );
            localStorage.removeItem(
              "nippy_user",
            );
            localStorage.removeItem(
              "nippy_token",
            );
            localStorage.removeItem(
              "token",
            );
            navigate(
              "/auth/login",
            );
          } finally {
            setIsLoading(
              false,
            );
          }
        };

      fetchFreshUserData();
    }, [
      navigate,
    ]);

    // 2. Fetch Web3 Wallet USDT Balance
    useEffect(() => {
      const fetchUsdtBalance =
        async () => {
          if (
            !user?.walletAddress
          ) {
            setUsdtBalance(
              "0.00",
            );
            return;
          }

          setIsFetchingBalance(
            true,
          );

          const usdtAddress =
            "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
          const abi =
            [
              "function balanceOf(address owner) view returns (uint256)",
            ];

          let fetchedBalance =
            null;

          if (
            window.ethereum
          ) {
            try {
              const provider =
                new ethers.BrowserProvider(
                  window.ethereum,
                );
              const contract =
                new ethers.Contract(
                  usdtAddress,
                  abi,
                  provider,
                );
              const rawBalance =
                await contract.balanceOf(
                  user.walletAddress,
                );
              fetchedBalance =
                ethers.formatUnits(
                  rawBalance,
                  6,
                );
            } catch (e) {
              console.warn(
                "Browser provider lookup failed, falling back to public RPCs:",
                e.message,
              );
            }
          }

          if (
            fetchedBalance ===
            null
          ) {
            const rpcEndpoints =
              [
                "https://polygon-bor-rpc.publicnode.com",
                "https://1rpc.io/matic",
                "https://rpc.ankr.com/polygon",
                "https://polygon.llamarpc.com",
              ];

            for (const endpoint of rpcEndpoints) {
              try {
                const provider =
                  new ethers.JsonRpcProvider(
                    endpoint,
                    137,
                  );
                const contract =
                  new ethers.Contract(
                    usdtAddress,
                    abi,
                    provider,
                  );

                const fetchPromise =
                  contract.balanceOf(
                    user.walletAddress,
                  );
                const timeoutPromise =
                  new Promise(
                    (
                      _,
                      reject,
                    ) =>
                      setTimeout(
                        () =>
                          reject(
                            new Error(
                              "RPC Timeout",
                            ),
                          ),
                        4000,
                      ),
                  );

                const rawBalance =
                  await Promise.race(
                    [
                      fetchPromise,
                      timeoutPromise,
                    ],
                  );
                fetchedBalance =
                  ethers.formatUnits(
                    rawBalance,
                    6,
                  );
                break;
              } catch (e) {
                console.warn(
                  `RPC failed (${endpoint}):`,
                  e.message,
                );
              }
            }
          }

          if (
            fetchedBalance !==
            null
          ) {
            setUsdtBalance(
              parseFloat(
                fetchedBalance,
              ).toFixed(
                2,
              ),
            );
          } else {
            setUsdtBalance(
              "0.00",
            );
          }

          setIsFetchingBalance(
            false,
          );
        };

      if (
        user
      ) {
        fetchUsdtBalance();
      }
    }, [
      user,
    ]);

    // 3. Initiate Didit KYC Session
    const handleStartKyc =
      async () => {
        try {
          setIsStartingKyc(
            true,
          );
          const userId =
            user?._id ||
            user?.id;

          if (
            !userId
          ) {
            alert(
              "User session invalid. Please log in again.",
            );
            return;
          }

          const response =
            await api.post(
              "/auth/kyc/start-session",
              {
                userId,
              },
            );

          if (
            response
              .data
              .url
          ) {
            window.location.href =
              response.data.url;
          } else {
            alert(
              "Didit session URL not returned from backend.",
            );
          }
        } catch (error) {
          console.error(
            "KYC Initialization Error:",
            error,
          );
          alert(
            error
              .response
              ?.data
              ?.message ||
              "Could not start verification session.",
          );
        } finally {
          setIsStartingKyc(
            false,
          );
        }
      };

    // 4. Secure Logout Handler
    const handleLogout =
      () => {
        localStorage.removeItem(
          "nippy_user",
        );
        localStorage.removeItem(
          "nippy_token",
        );
        localStorage.removeItem(
          "token",
        );
        navigate(
          "/auth/login",
        );
      };

    if (
      isLoading
    ) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-[#FF5757] animate-pulse">
          Decrypting
          Vault...
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
        {/* Top Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center gap-4">
            {/* PROFILE PICTURE AVATAR */}
            <button
              onClick={() =>
                navigate(
                  "/creator/vault",
                )
              }
              title="View My Creator Vault"
              className="relative w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 hover:border-[#FF5757] overflow-hidden flex items-center justify-center transition-all cursor-pointer flex-shrink-0 group shadow-lg"
            >
              {user?.profileImage ? (
                <img
                  src={
                    user.profileImage
                  }
                  alt="Profile"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                />
              ) : (
                <User className="w-7 h-7 text-slate-400 group-hover:text-white transition-colors" />
              )}
            </button>

            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Creator
                Dashboard
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Authenticated
                as:{" "}
                <button
                  onClick={() =>
                    navigate(
                      user?.hasCompletedBioData
                        ? "/creator/profile"
                        : "/auth/creator/biodata",
                    )
                  }
                  className="font-mono text-[#FF5757] hover:text-rose-400 hover:underline transition-colors"
                >
                  {user?.username
                    ? `@${user.username}`
                    : user?.email
                      ? user.email
                      : user?.walletAddress
                        ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
                        : "Profile Setup Pending"}
                </button>
              </p>
            </div>
          </div>

          {/* Right Side Container: Go Live, Balance & Logout */}
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap sm:flex-nowrap">
            {/* RED GO LIVE BUTTON */}
            <button
              onClick={() =>
                navigate(
                  "/creator/live/setup",
                )
              }
              className="bg-red-500 hover:bg-red-600 text-white px-5 py-3 rounded-xl flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all cursor-pointer text-sm font-bold animate-pulse"
            >
              <Radio className="w-5 h-5 text-white" />
              <span>
                Go
                Live
              </span>
            </button>

            {/* Balance Card */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex items-center shadow-lg flex-grow md:flex-grow-0">
              <div className="bg-slate-800 p-2 rounded-lg mr-4">
                <Wallet className="w-5 h-5 text-[#FF5757]" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Available
                  Balance
                </p>
                <p className="text-xl font-mono font-bold text-white">
                  {isFetchingBalance ? (
                    <span className="animate-pulse">
                      ---
                    </span>
                  ) : (
                    usdtBalance
                  )}{" "}
                  <span className="text-[#FF5757]">
                    USDT
                  </span>
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={
                handleLogout
              }
              title="Sign Out"
              className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center justify-center shadow-lg text-slate-400 hover:text-[#FF5757] hover:border-[#FF5757] transition-all cursor-pointer"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">
                Monthly
                Revenue
              </h3>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-white font-mono">
              $0.00
            </p>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">
                Active
                Subscribers
              </h3>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-white font-mono">
              0
            </p>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-400 font-medium">
                Compliance
                Status
              </h3>
              <ShieldAlert
                className={`w-5 h-5 ${
                  user?.kycStatus ===
                  "verified"
                    ? "text-emerald-500"
                    : "text-[#FF5757]"
                }`}
              />
            </div>
            <p className="text-xl font-bold text-white capitalize">
              {user?.kycStatus ||
                "Unverified"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              18
              U.S.C.
              §
              2257{" "}
              {user?.kycStatus ===
              "verified"
                ? "Active"
                : "Required"}
            </p>
          </div>
        </div>

        {/* Compliance Gatekeeper */}
        {!user?.hasCompletedBioData ? (
          /* GATE 1: BIO DATA MISSING */
          <div className="mb-10 bg-slate-900 p-8 rounded-2xl border border-amber-500/30 text-center">
            <User className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              Profile
              Setup
              Required
            </h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Before
              you
              can
              verify
              your
              identity
              or
              start
              monetizing,
              you
              need
              to
              set
              up
              your
              creator
              profile
              and
              agree
              to
              the
              platform
              guidelines.
            </p>
            <button
              onClick={() =>
                navigate(
                  "/auth/creator/biodata",
                )
              }
              className="bg-amber-500 text-slate-950 px-6 py-3 rounded-lg font-bold hover:bg-amber-400 transition-colors"
            >
              Complete
              Creator
              Profile
            </button>
          </div>
        ) : user?.kycStatus !==
          "verified" ? (
          /* GATE 2: IDENTITY UNVERIFIED */
          <div className="mb-10 bg-slate-900 p-8 rounded-2xl border border-[#FF5757]/30 text-center">
            <ShieldAlert className="w-12 h-12 text-[#FF5757] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              Identity
              Verification
              Required
            </h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Federal
              law
              (18
              U.S.C.
              §
              2257)
              requires
              identity
              verification
              before
              you
              can
              upload
              or
              monetize
              content.
            </p>
            <button
              onClick={
                handleStartKyc
              }
              disabled={
                isStartingKyc
              }
              className="bg-[#FF5757] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#ff3d3d] transition-colors disabled:opacity-50"
            >
              {isStartingKyc
                ? "Generating Secure Gateway..."
                : "Start Identity Verification"}
            </button>
          </div>
        ) : (
          /* GATE 3: FULLY UNLOCKED */
          <>
            <div className="mb-10">
              <MediaUploader />
            </div>
            <div className="mb-10">
              <MonetizationSettings />
            </div>
            <div className="mb-10">
              <EarningsDashboard />
            </div>
          </>
        )}
      </div>
    );
  };

export default CreatorDashboard;
