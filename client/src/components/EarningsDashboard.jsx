import React, {
  useState,
  useEffect,
} from "react";
import axios from "axios";
import {
  Users,
  Video,
  DollarSign,
  Wallet as WalletIcon,
  ExternalLink,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

const COUNTRY_TO_CURRENCY =
  {
    Nigeria:
      "NGN",
    "United States":
      "USD",
    "United Kingdom":
      "GBP",
    Kenya:
      "KES",
    Ghana:
      "GHS",
    default:
      "USD",
  };

const EarningsDashboard =
  () => {
    const [
      dashboardData,
      setDashboardData,
    ] =
      useState(
        {
          wallet:
            {
              fiatBalances:
                {
                  withdrawable:
                    {},
                  floating:
                    {},
                },
              fiatTotalEarned:
                {},
              lifetimeWeb3EarnedUSDT: 0,
            },
          withdrawals:
            [],
          recentSales:
            [],
          activeSubscribers: 0,
          ppvSalesCount: 0,
          baseCurrency:
            "USD",
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
      error,
      setError,
    ] =
      useState(
        "",
      );

    // Modal State for Withdrawals
    const [
      withdrawalConfig,
      setWithdrawalConfig,
    ] =
      useState(
        {
          isOpen: false,
          currency:
            null,
          amount: 0,
        },
      );
    const [
      isSubmitting,
      setIsSubmitting,
    ] =
      useState(
        false,
      );
    const [
      modalError,
      setModalError,
    ] =
      useState(
        "",
      );
    const [
      modalSuccess,
      setModalSuccess,
    ] =
      useState(
        "",
      );

    const fetchDashboardData =
      async () => {
        try {
          setIsLoading(
            true,
          );
          setError(
            "",
          );

          const token =
            localStorage.getItem(
              "nippy_token",
            ) ||
            localStorage.getItem(
              "token",
            );
          if (
            !token
          )
            throw new Error(
              "Authentication missing. Please log in again.",
            );

          const storedUser =
            JSON.parse(
              localStorage.getItem(
                "nippy_user",
              ) ||
                "{}",
            );
          const userCountry =
            storedUser.country ||
            "United States";
          const autoCurrency =
            COUNTRY_TO_CURRENCY[
              userCountry
            ] ||
            COUNTRY_TO_CURRENCY.default;

          const [
            dashboardRes,
            settingsRes,
          ] =
            await Promise.all(
              [
                axios.get(
                  "/api/earnings/dashboard",
                  {
                    headers:
                      {
                        Authorization: `Bearer ${token}`,
                      },
                  },
                ),
                axios.get(
                  "/api/users/settings/monetization",
                  {
                    headers:
                      {
                        Authorization: `Bearer ${token}`,
                      },
                  },
                ),
              ],
            );

          const targetCurrency =
            settingsRes
              .data
              ?.baseCurrency ||
            autoCurrency;

          setDashboardData(
            {
              wallet:
                dashboardRes
                  .data
                  .wallet || {
                  fiatBalances:
                    {
                      withdrawable:
                        {},
                      floating:
                        {},
                    },
                  fiatTotalEarned:
                    {},
                  lifetimeWeb3EarnedUSDT: 0,
                },
              withdrawals:
                dashboardRes
                  .data
                  .withdrawals ||
                [],
              recentSales:
                dashboardRes
                  .data
                  .recentSales ||
                dashboardRes
                  .data
                  .recentTransactions ||
                [],
              activeSubscribers:
                dashboardRes
                  .data
                  .activeSubscribers ||
                0,
              ppvSalesCount:
                dashboardRes
                  .data
                  .ppvSalesCount ||
                0,
              baseCurrency:
                targetCurrency,
            },
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
      fetchDashboardData();
    }, []);

    const handleOpenWithdrawModal =
      (
        currency,
        amount,
      ) => {
        setModalError(
          "",
        );
        setModalSuccess(
          "",
        );
        setWithdrawalConfig(
          {
            isOpen: true,
            currency,
            amount,
          },
        );
      };

    const handleCloseModal =
      () => {
        setWithdrawalConfig(
          {
            isOpen: false,
            currency:
              null,
            amount: 0,
          },
        );
        setModalError(
          "",
        );
        setModalSuccess(
          "",
        );
      };

    const handleConfirmWithdrawal =
      async () => {
        try {
          setIsSubmitting(
            true,
          );
          setModalError(
            "",
          );

          const token =
            localStorage.getItem(
              "nippy_token",
            ) ||
            localStorage.getItem(
              "token",
            );
          const storedUser =
            JSON.parse(
              localStorage.getItem(
                "nippy_user",
              ) ||
                "{}",
            );

          await axios.post(
            "/api/earnings/withdraw",
            {
              currency:
                withdrawalConfig.currency,
              amount:
                withdrawalConfig.amount,
              payoutAddress:
                storedUser.payoutAddress ||
                storedUser.walletAddress ||
                "",
            },
            {
              headers:
                {
                  Authorization: `Bearer ${token}`,
                },
            },
          );

          setModalSuccess(
            "Withdrawal request submitted successfully!",
          );
          setTimeout(
            () => {
              handleCloseModal();
              fetchDashboardData();
            },
            2000,
          );
        } catch (err) {
          console.error(
            "Withdrawal error:",
            err,
          );
          setModalError(
            err
              .response
              ?.data
              ?.message ||
              "Failed to request withdrawal. Please try again.",
          );
        } finally {
          setIsSubmitting(
            false,
          );
        }
      };

    if (
      isLoading
    ) {
      return (
        <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl min-h-[400px]">
          <RefreshCw className="w-8 h-8 animate-spin text-[#FF5757]" />
          <p className="animate-pulse">
            Decrypting
            Fiat
            Ledger
            &
            Web3
            Analytics...
          </p>
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
      activeSubscribers,
      ppvSalesCount,
      baseCurrency,
    } =
      dashboardData;
    const storedUser =
      JSON.parse(
        localStorage.getItem(
          "nippy_user",
        ) ||
          "{}",
      );
    const targetAddress =
      storedUser.payoutAddress ||
      storedUser.walletAddress ||
      "Not Configured";

    const rawFiatBalances =
      wallet.fiatBalances ||
      {};
    const safeWithdrawable =
      rawFiatBalances.withdrawable ||
      (typeof rawFiatBalances ===
        "object" &&
      !rawFiatBalances.withdrawable
        ? rawFiatBalances
        : {});
    const safeFloating =
      rawFiatBalances.floating ||
      {};
    const safeFiatTotal =
      wallet.fiatTotalEarned ||
      {};

    const activeBalances =
      new Set(
        [
          baseCurrency,
          ...Object.keys(
            safeWithdrawable,
          ),
          ...Object.keys(
            safeFloating,
          ),
        ],
      );
    const fiatCardsToRender =
      Array.from(
        activeBalances,
      ).filter(
        (
          currency,
        ) =>
          currency ===
            baseCurrency ||
          (safeWithdrawable[
            currency
          ] ||
            0) >
            0 ||
          (safeFloating[
            currency
          ] ||
            0) >
            0,
      );

    return (
      <div className="space-y-10">
        {/* HEADER SECTION ALIGNED TO CENTER */}
        <div className="flex flex-col items-center justify-center border-b border-slate-800 pb-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-2">
            Earnings
            Dashboard
          </h2>
          <p className="text-sm text-slate-400 flex items-center justify-center gap-2 max-w-md">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            Showing
            your
            80%
            Creator
            Cut.
            Multi-currency
            conversions
            handled
            at
            checkout.
          </p>
        </div>

        {/* TOP ROW: MULTI-CURRENCY FIAT LEDGER */}
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">
            Web2
            Fiat
            Balances
            (Paystack
            Clearing)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fiatCardsToRender.map(
              (
                currency,
              ) => {
                const withdrawableAmt =
                  safeWithdrawable[
                    currency
                  ] ||
                  0;
                const floatingAmt =
                  safeFloating[
                    currency
                  ] ||
                  0;
                const totalEarnedAmt =
                  safeFiatTotal[
                    currency
                  ] ||
                  0;
                const isBase =
                  currency ===
                  baseCurrency;

                return (
                  <div
                    key={
                      currency
                    }
                    className={`bg-slate-900 p-6 rounded-2xl border ${
                      isBase
                        ? "border-blue-500/30 shadow-blue-500/10"
                        : "border-slate-800"
                    } shadow-sm relative overflow-hidden flex flex-col justify-between h-full`}
                  >
                    {isBase && (
                      <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                        Active
                        Pricing
                      </div>
                    )}

                    <div className="space-y-4 text-center">
                      <div>
                        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
                          Withdrawable{" "}
                          {
                            currency
                          }
                        </h3>
                        <p className="text-3xl font-bold text-emerald-400 font-mono">
                          {withdrawableAmt.toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                        </p>
                      </div>

                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2 flex flex-col items-center">
                        <div className="flex flex-col items-center justify-center text-xs w-full">
                          <span className="text-slate-400 flex items-center justify-center gap-1 mb-1">
                            <Clock
                              size={
                                12
                              }
                              className="text-amber-500"
                            />{" "}
                            Floating
                            (Clearing)
                          </span>
                          <span className="font-mono font-medium text-amber-400">
                            {floatingAmt.toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}{" "}
                            {
                              currency
                            }
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight text-center">
                          Awaiting
                          Paystack
                          settlement
                          to
                          corporate
                          bank
                          account.
                        </p>
                      </div>

                      <p className="text-xs text-slate-500 font-mono pt-1 text-center">
                        All-Time
                        Earned:{" "}
                        {totalEarnedAmt.toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}{" "}
                        {
                          currency
                        }
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/50">
                      <button
                        disabled={
                          withdrawableAmt <=
                          0
                        }
                        onClick={() =>
                          handleOpenWithdrawModal(
                            currency,
                            withdrawableAmt,
                          )
                        }
                        className="w-full py-2.5 bg-[#FF5757] hover:bg-rose-600 disabled:opacity-40 disabled:hover:bg-slate-800 disabled:bg-slate-800 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/10"
                      >
                        Withdraw{" "}
                        {
                          currency
                        }{" "}
                        <ArrowRight
                          size={
                            16
                          }
                        />
                      </button>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>

        {/* MIDDLE ROW: WEB3 READ-ONLY METRICS */}
        <div className="flex flex-col items-center">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">
            Web3
            Instant
            Settlements
            (Polygon)
          </h3>
          <div className="bg-slate-900 p-8 rounded-2xl border border-emerald-500/20 shadow-sm relative overflow-hidden w-full max-w-2xl flex flex-col items-center text-center">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="mb-4 p-4 bg-emerald-500/10 text-emerald-500 rounded-full shadow-inner">
              <WalletIcon
                size={
                  36
                }
              />
            </div>

            <h3 className="text-emerald-500 text-sm font-medium mb-2 flex items-center justify-center gap-2">
              <ExternalLink
                size={
                  14
                }
              />{" "}
              Lifetime
              Web3
              Direct
              Earnings
            </h3>
            <p className="text-4xl font-bold text-white font-mono mb-3">
              {wallet.lifetimeWeb3EarnedUSDT?.toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                },
              ) ||
                "0.00"}{" "}
              <span className="text-xl text-emerald-500 font-sans">
                USDT
              </span>
            </p>
            <p className="text-xs text-slate-400 max-w-sm text-center">
              Crypto-to-crypto
              sales
              routed
              instantly
              to
              your
              Web3
              wallet
              via
              smart
              contract.
              Nippy
              holds
              zero
              custody
              of
              these
              funds.
            </p>
          </div>
        </div>

        {/* BOTTOM ROW: PLATFORM METRICS */}
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">
            Platform
            Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-full mb-3">
                <Users
                  size={
                    28
                  }
                />
              </div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">
                Active
                Subscribers
              </h3>
              <p className="text-3xl font-bold text-white">
                {
                  activeSubscribers
                }
              </p>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col items-center text-center">
              <div className="p-3 bg-purple-500/10 text-purple-500 rounded-full mb-3">
                <Video
                  size={
                    28
                  }
                />
              </div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">
                Total
                PPV
                Unlocks
              </h3>
              <p className="text-3xl font-bold text-white">
                {
                  ppvSalesCount
                }
              </p>
            </div>
          </div>
        </div>

        {/* LEDGER TABLES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 bg-slate-950 text-center">
              <h3 className="font-semibold text-slate-300">
                Recent
                Sales
              </h3>
            </div>
            <ul className="divide-y divide-slate-800 flex-grow">
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
                      <span className="text-slate-400 truncate max-w-[180px]">
                        {sale
                          .content
                          ?.title ||
                          (sale.purchaseType ===
                          "SUBSCRIPTION"
                            ? "Subscription"
                            : "Unknown Item")}
                      </span>
                      <span className="font-medium text-emerald-500 font-mono whitespace-nowrap">
                        +
                        {Number(
                          sale.amountPaid ||
                            sale.amount,
                        ).toFixed(
                          2,
                        )}{" "}
                        {sale.paymentMethod ===
                        "CRYPTO"
                          ? "USDT"
                          : sale.currency ||
                            baseCurrency}
                      </span>
                    </li>
                  ),
                )
              )}
            </ul>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 bg-slate-950 text-center">
              <h3 className="font-semibold text-slate-300">
                Withdrawal
                History
              </h3>
            </div>
            <ul className="divide-y divide-slate-800 flex-grow">
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
                          {w.currency ||
                            baseCurrency}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {w.payoutAddress
                            ? `${w.payoutAddress.substring(0, 6)}...${w.payoutAddress.slice(-4)}`
                            : "Bank Account"}
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

        {/* WITHDRAWAL DISCLAIMER MODAL */}
        {withdrawalConfig.isOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-8 shadow-2xl relative space-y-6 flex flex-col items-center text-center">
              <button
                onClick={
                  handleCloseModal
                }
                className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
              >
                <X
                  size={
                    20
                  }
                />
              </button>

              <div className="flex flex-col items-center gap-3 border-b border-slate-800 pb-4 w-full">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full mb-2">
                  <ShieldCheck
                    size={
                      32
                    }
                  />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Confirm{" "}
                  {
                    withdrawalConfig.currency
                  }{" "}
                  Payout
                  Request
                </h3>
                <p className="text-xs text-slate-400">
                  Web3
                  Crypto
                  Payout
                  Conversion
                  Notice
                </p>
              </div>

              {modalError && (
                <div className="p-3 w-full bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center gap-2 text-xs text-red-400">
                  <AlertCircle
                    size={
                      16
                    }
                    className="shrink-0"
                  />
                  {
                    modalError
                  }
                </div>
              )}

              {modalSuccess && (
                <div className="p-3 w-full bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2
                    size={
                      16
                    }
                    className="shrink-0"
                  />
                  {
                    modalSuccess
                  }
                </div>
              )}

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 w-full">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">
                    Amount
                    Requested:
                  </span>
                  <span className="font-mono font-bold text-white text-lg">
                    {withdrawalConfig.amount.toLocaleString()}{" "}
                    {
                      withdrawalConfig.currency
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-slate-800/60 pt-2">
                  <span className="text-slate-400">
                    Destination
                    Address:
                  </span>
                  <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                    {targetAddress !==
                    "Not Configured"
                      ? `${targetAddress.substring(0, 6)}...${targetAddress.slice(-4)}`
                      : "Web3 Address Missing"}
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-400 bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl w-full text-left">
                <h4 className="font-bold text-blue-400 text-sm flex items-center justify-center gap-1.5 mb-2">
                  <Clock
                    size={
                      14
                    }
                  />{" "}
                  Settlement
                  Terms
                  &
                  Disclaimers
                </h4>
                <ul className="space-y-2 list-disc list-inside text-slate-300">
                  <li>
                    <strong className="text-white">
                      Payout
                      Token:
                    </strong>{" "}
                    Disbursed
                    as
                    USDT
                    directly
                    on
                    Polygon.
                  </li>
                  <li>
                    <strong className="text-white">
                      Processing
                      Window:
                    </strong>{" "}
                    Completed
                    within{" "}
                    <strong>
                      48
                      business
                      hours
                    </strong>{" "}
                    after
                    verification.
                  </li>
                  <li>
                    <strong className="text-white">
                      Rate
                      Lock:
                    </strong>{" "}
                    Converted
                    at
                    the
                    prevailing
                    market
                    exchange
                    rate
                    at
                    the
                    exact
                    time
                    of
                    transfer
                    execution.
                  </li>
                </ul>
              </div>

              <div className="flex gap-3 pt-2 w-full">
                <button
                  type="button"
                  onClick={
                    handleCloseModal
                  }
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    isSubmitting ||
                    !!modalSuccess ||
                    targetAddress ===
                      "Not Configured"
                  }
                  onClick={
                    handleConfirmWithdrawal
                  }
                  className="flex-1 py-3 bg-[#FF5757] hover:bg-rose-600 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw
                        size={
                          16
                        }
                        className="animate-spin"
                      />{" "}
                      Processing...
                    </>
                  ) : (
                    "Confirm & Disburse"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

export default EarningsDashboard;
