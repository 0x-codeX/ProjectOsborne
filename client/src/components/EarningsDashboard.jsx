import React, {
  useState,
  useEffect,
} from "react";
import { ethers } from "ethers"; // <-- ADDED: Required for Web3 transactions
import api from "../utils/api";
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

// THE FIX: Use Vite's import.meta.env instead of Node's process.env
const PAYOUT_CONTRACT_ADDRESS =
  import.meta
    .env
    .VITE_NIPPY_TREASURY_PAYOUT_ADDRESS;

const PAYOUT_ABI =
  [
    "function claimPayout(uint256 amount, bytes32 nonce, uint256 deadline, bytes calldata signature) external",
  ];

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
      liquidationQuote,
      setLiquidationQuote,
    ] =
      useState(
        null,
      );
    const [
      modalSuccess,
      setModalSuccess,
    ] =
      useState(
        "",
      );

    // --- WEB3 VOUCHER CLAIM STATE & LOGIC ---
    const [
      claimingId,
      setClaimingId,
    ] =
      useState(
        null,
      );

    const handleClaimPayout =
      async (
        withdrawal,
      ) => {
        try {
          setClaimingId(
            withdrawal._id,
          );
          setError(
            "",
          );

          if (
            !window.ethereum
          ) {
            alert(
              "MetaMask wallet is required to claim your payout.",
            );
            return;
          }

          // Multi-wallet extension resolver
          let targetProvider =
            window.ethereum;
          if (
            window
              .ethereum
              .providers
              ?.length
          ) {
            targetProvider =
              window.ethereum.providers.find(
                (
                  p,
                ) =>
                  p.isMetaMask,
              ) ||
              window
                .ethereum
                .providers[0];
          }

          const provider =
            new ethers.BrowserProvider(
              targetProvider,
            );
          const signer =
            await provider.getSigner();

          // Verify user is connected to Polygon Amoy (80002 / 0x13882) or Mainnet (137 / 0x89)
          const network =
            await provider.getNetwork();
          const expectedChainId =
            BigInt(
              process
                .env
                .REACT_APP_POLYGON_CHAIN_ID ||
                80002,
            );

          if (
            network.chainId !==
            expectedChainId
          ) {
            try {
              await targetProvider.request(
                {
                  method:
                    "wallet_switchEthereumChain",
                  params:
                    [
                      {
                        chainId: `0x${expectedChainId.toString(16)}`,
                      },
                    ],
                },
              );
            } catch (switchError) {
              alert(
                `Please switch your wallet network to Chain ID ${expectedChainId}.`,
              );
              return;
            }
          }

          // Extract cryptographic voucher parameters saved in Transaction metadata
          const metadata =
            withdrawal.metadata ||
            {};
          const {
            nonce,
            signature,
            deadline,
            amountInWei,
          } =
            metadata;

          if (
            !nonce ||
            !signature ||
            !deadline
          ) {
            alert(
              "Invalid or missing cryptographic voucher metadata. Please contact support.",
            );
            return;
          }

          const contract =
            new ethers.Contract(
              PAYOUT_CONTRACT_ADDRESS,
              PAYOUT_ABI,
              signer,
            );

          // Execute EIP-712 claim on-chain
          const tx =
            await contract.claimPayout(
              amountInWei ||
                ethers.parseUnits(
                  withdrawal.amount.toString(),
                  6,
                ),
              nonce,
              deadline,
              signature,
            );

          console.log(
            "Claim Tx Broadcasted:",
            tx.hash,
          );
          await tx.wait(); // Wait for block confirmation

          alert(
            "Payout claimed successfully on Polygon!",
          );
          fetchDashboardData(); // Refresh UI to update balances and statuses
        } catch (err) {
          console.error(
            "Claim Execution Error:",
            err,
          );
          if (
            err.code ===
            "ACTION_REJECTED"
          ) {
            alert(
              "Transaction signature was rejected in MetaMask.",
            );
          } else {
            alert(
              err.reason ||
                err.message ||
                "Failed to execute claim on-chain.",
            );
          }
        } finally {
          setClaimingId(
            null,
          );
        }
      };

    const [
      exchangeRates,
      setExchangeRates,
    ] =
      useState(
        {
          NGN: null,
        },
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

          // IRONCLAD FIX: Added a third request to fetch the live P2P preview rate.
          // The .catch() ensures the dashboard still loads even if this specific API fails.
          const [
            dashboardRes,
            settingsRes,
            rateRes,
          ] =
            await Promise.all(
              [
                api.get(
                  "/earnings/dashboard",
                ),
                api.get(
                  "/users/settings/monetization",
                ),
                api
                  .get(
                    "/earnings/p2p-rate",
                  )
                  .catch(
                    () => ({
                      data: {
                        NGN: 1500,
                      },
                    }),
                  ),
              ],
            );

          const targetCurrency =
            settingsRes
              .data
              ?.baseCurrency ||
            autoCurrency;

          // Store the fetched rate in state so the cards can display it
          setExchangeRates(
            {
              NGN:
                rateRes
                  .data
                  .NGN ||
                1500,
            },
          );

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

    // 1. Intercept the click and calculate the spread via Backend Quote
    const handleOpenLiquidateModal =
      async (
        currency,
        amount,
      ) => {
        try {
          setIsSubmitting(
            true,
          ); // Re-use submitting state for the loading spinner
          setModalError(
            "",
          );
          setModalSuccess(
            "",
          );

          const storedUser =
            JSON.parse(
              localStorage.getItem(
                "nippy_user",
              ) ||
                "{}",
            );
          const isBankPayout =
            storedUser.payoutMethod ===
            "bank";

          // Dynamically set the P2P direction
          const direction =
            isBankPayout
              ? "USDT_TO_NGN"
              : `${currency}_TO_USDT`;

          // Fetch the live, spread-adjusted quote from your new backend route
          const response =
            await api.post(
              "/earnings/quote",
              {
                amount,
                direction,
              },
            );
          const quoteData =
            response.data;

          setLiquidationQuote(
            quoteData,
          );
          setWithdrawalConfig(
            {
              isOpen: true,
              type: "LIQUIDATE",
              currency:
                currency,
              amount,
              direction,
            },
          );
        } catch (err) {
          console.error(
            "Quote error:",
            err,
          );
          alert(
            err
              .response
              ?.data
              ?.message ||
              "Failed to fetch live market rate.",
          );
        } finally {
          setIsSubmitting(
            false,
          );
        }
      };

    // 2. The actual API execution when they confirm the modal
    const executeLiquidation =
      async () => {
        try {
          setIsSubmitting(
            true,
          );
          setModalError(
            "",
          );

          // Hit the new dedicated liquidation route
          await api.post(
            "/earnings/liquidate",
            {
              amount:
                withdrawalConfig.amount,
              quote:
                liquidationQuote, // Pass the quoted math to enforce the agreed rate
            },
          );

          const successMsg =
            withdrawalConfig.direction ===
            "USDT_TO_NGN"
              ? "Liquidation successful! Funds moved to Floating NGN."
              : "Liquidation successful! Funds moved to Floating USDT.";

          setModalSuccess(
            successMsg,
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
            "Liquidation error:",
            err,
          );
          setModalError(
            err
              .response
              ?.data
              ?.message ||
              "Failed to liquidate. Try again.",
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

                    <div className="mt-6 pt-4 border-t border-slate-800/50 space-y-3">
                      {storedUser.payoutMethod ===
                      "bank" ? (
                        // --- BANK CREATOR LOGIC (USDT -> NGN) ---
                        currency ===
                        "USDT" ? (
                          <>
                            {/* The Estimate Preview */}
                            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                              <p className="text-[11px] text-slate-400 font-medium">
                                Est.
                                Payout
                                Rate
                                (incl.
                                spread)
                              </p>
                              <p className="text-xs font-bold text-amber-400 font-mono mt-0.5">
                                1
                                USDT
                                ≈
                                ₦
                                {(
                                  (exchangeRates?.NGN ||
                                    1500) *
                                  0.97
                                ).toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </p>
                              <p className="text-[9px] text-slate-500 mt-1 italic">
                                *Final
                                live
                                quote
                                generated
                                on
                                click.
                              </p>
                            </div>

                            <button
                              disabled={
                                withdrawableAmt <=
                                  0 ||
                                isSubmitting
                              }
                              onClick={() =>
                                handleOpenLiquidateModal(
                                  currency,
                                  withdrawableAmt,
                                )
                              }
                              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-slate-800 disabled:bg-slate-800 text-slate-950 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
                            >
                              Liquidate
                              to
                              NGN{" "}
                              <ArrowRight
                                size={
                                  16
                                }
                              />
                            </button>
                          </>
                        ) : (
                          <div className="w-full py-2.5 bg-slate-800/50 text-slate-500 font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                            <Clock
                              size={
                                16
                              }
                            />{" "}
                            Auto-Settles
                            Weekly
                          </div>
                        )
                      ) : // --- CRYPTO CREATOR LOGIC (FIAT -> USDT) ---
                      currency ===
                        "USDT" ? (
                        <div className="w-full py-2.5 bg-emerald-500/10 text-emerald-500 font-bold rounded-xl text-sm flex items-center justify-center gap-2 cursor-not-allowed border border-emerald-500/20">
                          <WalletIcon
                            size={
                              16
                            }
                          />{" "}
                          Instant
                          Web3
                          Settlement
                        </div>
                      ) : (
                        <>
                          {/* The Estimate Preview */}
                          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                            <p className="text-[11px] text-slate-400 font-medium">
                              Est.
                              Conversion
                              Rate
                              (incl.
                              spread)
                            </p>
                            <p className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                              1
                              USDT
                              ≈
                              ₦
                              {(
                                (exchangeRates?.NGN ||
                                  1500) *
                                1.03
                              ).toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </p>
                            <p className="text-[9px] text-slate-500 mt-1 italic">
                              *Final
                              live
                              quote
                              generated
                              on
                              click.
                            </p>
                          </div>

                          <button
                            disabled={
                              withdrawableAmt <=
                                0 ||
                              isSubmitting
                            }
                            onClick={() =>
                              handleOpenLiquidateModal(
                                currency,
                                withdrawableAmt,
                              )
                            }
                            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-slate-800 disabled:bg-slate-800 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                          >
                            Liquidate
                            to
                            USDT{" "}
                            <ArrowRight
                              size={
                                16
                              }
                            />
                          </button>
                        </>
                      )}
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

                      {/* DYNAMIC ACTION: CLAIM BUTTON vs STATUS BADGE */}
                      <div className="flex items-center gap-2">
                        {w.status ===
                        "PENDING_CLAIM" ? (
                          <button
                            onClick={() =>
                              handleClaimPayout(
                                w,
                              )
                            }
                            disabled={
                              claimingId ===
                              w._id
                            }
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                          >
                            <WalletIcon
                              size={
                                14
                              }
                            />
                            {claimingId ===
                            w._id
                              ? "Claiming..."
                              : "Claim USDT"}
                          </button>
                        ) : (
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
                        )}
                      </div>
                    </li>
                  ),
                )
              )}
            </ul>
          </div>
        </div>

        {/* LIQUIDATION DISCLAIMER MODAL */}
        {withdrawalConfig.isOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-md w-full p-8 shadow-2xl relative space-y-6 flex flex-col items-center">
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

              <div className="flex flex-col items-center gap-3 border-b border-slate-800 pb-4 w-full text-center">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-full mb-2 border border-amber-500/20">
                  <RefreshCw
                    size={
                      32
                    }
                  />
                </div>
                <h3 className="text-xl font-bold text-white">
                  {withdrawalConfig.direction ===
                  "USDT_TO_NGN"
                    ? "Liquidate to NGN"
                    : "Liquidate to USDT"}
                </h3>
                <p className="text-xs text-slate-400">
                  P2P
                  Treasury
                  Conversion
                </p>
              </div>

              {modalError && (
                <div className="p-3 w-full bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center gap-2 text-xs text-red-400">
                  <AlertCircle
                    size={
                      16
                    }
                    className="shrink-0"
                  />{" "}
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
                  />{" "}
                  {
                    modalSuccess
                  }
                </div>
              )}

              {liquidationQuote && (
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 w-full">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-medium">
                      Amount
                      to
                      Liquidate:
                    </span>
                    <span className="font-mono font-bold text-white">
                      {liquidationQuote.amount.toLocaleString()}{" "}
                      {
                        withdrawalConfig.currency
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-medium">
                      Live
                      Market
                      Rate:
                    </span>
                    <span className="font-mono text-slate-300">
                      ~₦
                      {liquidationQuote.liveMarketRate.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-slate-800/60 pb-4">
                    <span className="text-slate-400 font-medium">
                      Execution
                      Rate
                      (incl.{" "}
                      {
                        liquidationQuote.spreadApplied
                      }

                      %
                      spread):
                    </span>
                    <span className="font-mono text-amber-400 font-bold">
                      ₦
                      {liquidationQuote.executionRate.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-300 font-bold uppercase tracking-wider text-xs">
                      Total
                      Estimated
                      Payout:
                    </span>
                    <span className="font-mono font-black text-emerald-400 text-xl">
                      {withdrawalConfig.direction ===
                      "USDT_TO_NGN"
                        ? "₦"
                        : ""}
                      {liquidationQuote.estimatedPayout.toLocaleString()}
                      {withdrawalConfig.direction !==
                      "USDT_TO_NGN"
                        ? " USDT"
                        : ""}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl w-full">
                <p className="text-xs text-amber-500/90 leading-relaxed flex items-start gap-2">
                  <AlertCircle
                    size={
                      16
                    }
                    className="shrink-0 mt-0.5"
                  />
                  <span>
                    <strong className="text-amber-500 block mb-1">
                      Irreversible
                      Action
                    </strong>
                    By
                    confirming,
                    these
                    funds
                    will
                    be
                    traded
                    with
                    our
                    treasury.
                    The
                    output
                    will
                    be
                    moved
                    to
                    your{" "}
                    <strong>
                      Floating
                      Balance
                    </strong>{" "}
                    and
                    will
                    clear
                    for
                    payout
                    once
                    the
                    P2P
                    settlement
                    is
                    complete.
                  </span>
                </p>
              </div>

              <div className="flex gap-3 w-full pt-2">
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
                    !!modalSuccess
                  }
                  onClick={
                    executeLiquidation
                  }
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw
                        size={
                          16
                        }
                        className="animate-spin"
                      />{" "}
                      Executing...
                    </>
                  ) : (
                    "Confirm Sale"
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
