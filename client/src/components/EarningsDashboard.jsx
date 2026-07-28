import React, {
  useState,
  useEffect,
} from "react";
import axios from "axios";
import WithdrawalModal from "./WithdrawalModal";

const EarningsDashboard =
  ({
    userAddress,
  }) => {
    const [
      dashboardData,
      setDashboardData,
    ] =
      useState(
        {
          wallet:
            {
              balanceUSDT: 0,
              totalEarnedUSDT: 0,
            },
          withdrawals:
            [],
          recentSales:
            [],
        },
      );
    const [
      isLoading,
      setIsLoading,
    ] =
      useState(
        true,
      );
    const [
      isModalOpen,
      setIsModalOpen,
    ] =
      useState(
        false,
      );
    const [
      error,
      setError,
    ] =
      useState(
        "",
      );

    const fetchDashboard =
      async () => {
        try {
          setIsLoading(
            true,
          );
          setError(
            "",
          );

          // 1. Correctly retrieve the token directly from localStorage
          const token =
            localStorage.getItem(
              "nippy_token",
            ) ||
            localStorage.getItem(
              "token",
            );

          if (
            !token
          ) {
            throw new Error(
              "Authentication missing. Please log in again.",
            );
          }

          // 2. Standardized to Axios
          const response =
            await axios.get(
              "/api/earnings/dashboard",
              {
                headers:
                  {
                    Authorization: `Bearer ${token}`,
                  },
              },
            );

          setDashboardData(
            response.data,
          );
        } catch (err) {
          console.error(
            "Dashboard Fetch Error:",
            err,
          );
          setError(
            err
              .response
              ?.data
              ?.message ||
              err.message ||
              "Failed to load treasury data.",
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      };

    useEffect(() => {
      fetchDashboard();
    }, []);

    const handleWithdrawalSuccess =
      () => {
        fetchDashboard();
        setIsModalOpen(
          false,
        );
      };

    if (
      isLoading
    ) {
      return (
        <div className="p-8 text-center text-slate-500 animate-pulse bg-slate-900 border border-slate-800 rounded-2xl">
          Decrypting
          Treasury
          Ledger...
        </div>
      );
    }

    if (
      error
    ) {
      return (
        <div className="p-6 text-center text-[#FF5757] bg-red-500/10 border border-red-500/20 rounded-2xl">
          {
            error
          }
        </div>
      );
    }

    const {
      wallet,
      withdrawals,
      recentSales,
    } =
      dashboardData;

    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">
            Earnings
            Dashboard
          </h2>
          <button
            onClick={() =>
              setIsModalOpen(
                true,
              )
            }
            className="px-6 py-2 bg-[#FF5757] text-white rounded-lg font-medium hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
          >
            Withdraw
            Funds
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm hover:border-slate-700 transition-colors">
            <h3 className="text-slate-400 text-sm font-medium mb-1">
              Available
              Balance
            </h3>
            <p className="text-4xl font-bold text-white font-mono">
              {wallet.balanceUSDT.toFixed(
                2,
              )}{" "}
              <span className="text-xl text-slate-500 font-normal font-sans">
                USDT
              </span>
            </p>
          </div>
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm hover:border-slate-700 transition-colors">
            <h3 className="text-slate-400 text-sm font-medium mb-1">
              Total
              Earned
              All-Time
            </h3>
            <p className="text-4xl font-bold text-white font-mono">
              {wallet.totalEarnedUSDT.toFixed(
                2,
              )}{" "}
              <span className="text-xl text-slate-500 font-normal font-sans">
                USDT
              </span>
            </p>
          </div>
        </div>

        {/* 3. Passing the exact correct props down to your WithdrawalModal */}
        <WithdrawalModal
          isOpen={
            isModalOpen
          }
          onClose={() =>
            setIsModalOpen(
              false,
            )
          }
          onWithdrawSuccess={
            handleWithdrawalSuccess
          }
          internalBalance={
            wallet.balanceUSDT
          }
          userAddress={
            userAddress
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950">
              <h3 className="font-semibold text-slate-300">
                Recent
                Sales
              </h3>
            </div>
            <ul className="divide-y divide-slate-800">
              {recentSales.length ===
              0 ? (
                <li className="p-4 text-sm text-slate-500 text-center py-8">
                  No
                  recent
                  sales.
                </li>
              ) : (
                recentSales.map(
                  (
                    sale,
                  ) => (
                    <li
                      key={
                        sale._id
                      }
                      className="p-4 flex justify-between items-center text-sm"
                    >
                      <span className="text-slate-400">
                        {sale
                          .content
                          ?.title ||
                          "Unknown Item"}
                      </span>
                      <span className="font-medium text-emerald-500 font-mono">
                        +
                        {
                          sale.amount
                        }{" "}
                        USDT
                      </span>
                    </li>
                  ),
                )
              )}
            </ul>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950">
              <h3 className="font-semibold text-slate-300">
                Withdrawal
                History
              </h3>
            </div>
            <ul className="divide-y divide-slate-800">
              {withdrawals.length ===
              0 ? (
                <li className="p-4 text-sm text-slate-500 text-center py-8">
                  No
                  withdrawal
                  history.
                </li>
              ) : (
                withdrawals.map(
                  (
                    w,
                  ) => (
                    <li
                      key={
                        w._id
                      }
                      className="p-4 flex justify-between items-center text-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-200 font-mono">
                          {
                            w.amount
                          }{" "}
                          USDT
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {w.payoutAddress.substring(
                            0,
                            6,
                          )}
                          ...
                          {w.payoutAddress.slice(
                            -4,
                          )}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wider ${
                          w.status ===
                          "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : w.status ===
                                "PENDING"
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              : "bg-red-500/10 text-red-500 border border-red-500/20"
                        }`}
                      >
                        {
                          w.status
                        }
                      </span>
                    </li>
                  ),
                )
              )}
            </ul>
          </div>
        </div>
      </div>
    );
  };

export default EarningsDashboard;
