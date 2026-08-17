// client/src/components/WithdrawalModal.jsx
import React, {
  useState,
} from "react";
import {
  Loader2,
  ArrowRight,
  Wallet,
  CheckCircle,
} from "lucide-react";
import api from "../utils/api"; // <-- Replaced raw axios with your ironclad api utility

const WithdrawalModal =
  ({
    isOpen,
    onClose,
    userAddress,
    internalBalance,
    onWithdrawSuccess,
  }) => {
    const [
      amount,
      setAmount,
    ] =
      useState(
        "",
      );
    const [
      status,
      setStatus,
    ] =
      useState(
        "idle",
      ); // idle, processing, success, error
    const [
      errorMessage,
      setErrorMessage,
    ] =
      useState(
        "",
      );

    if (
      !isOpen
    )
      return null;

    const handleWithdraw =
      async (
        e,
      ) => {
        e.preventDefault();
        const withdrawAmount =
          Number(
            amount,
          );

        if (
          withdrawAmount <=
            0 ||
          withdrawAmount >
            internalBalance
        ) {
          setErrorMessage(
            "Invalid amount or insufficient platform balance.",
          );
          return;
        }

        setStatus(
          "processing",
        );
        setErrorMessage(
          "",
        );

        try {
          // Hit the secure endpoint: no headers needed, no localhost, no localStorage lookups!
          await api.post(
            "/withdraw",
            {
              amount:
                withdrawAmount,
              destinationAddress:
                userAddress,
            },
          );

          setStatus(
            "success",
          );
          setTimeout(
            () => {
              onWithdrawSuccess(); // Refresh the parent component's balance
              onClose();
              setStatus(
                "idle",
              );
              setAmount(
                "",
              );
            },
            2000,
          );
        } catch (error) {
          console.error(
            error,
          );
          setStatus(
            "error",
          );
          setErrorMessage(
            error
              .response
              ?.data
              ?.error ||
              "Withdrawal failed.",
          );
        }
      };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
          <button
            onClick={
              onClose
            }
            className="absolute top-4 right-4 text-slate-500 hover:text-white"
          >
            ✕
          </button>

          <h2 className="text-2xl font-bold text-white mb-2">
            Withdraw
            Earnings
          </h2>
          <p className="text-slate-400 mb-6 text-sm">
            Transfer
            your
            platform
            earnings
            directly
            to
            your
            connected
            Web3
            wallet.
          </p>

          {status ===
          "success" ? (
            <div className="flex flex-col items-center py-8">
              <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
              <p className="text-white font-bold text-lg">
                Withdrawal
                Queued!
              </p>
              <p className="text-slate-400 text-sm text-center mt-2">
                Our
                automated
                treasury
                is
                processing
                your
                transaction
                on
                the
                blockchain.
              </p>
            </div>
          ) : (
            <form
              onSubmit={
                handleWithdraw
              }
              className="space-y-4"
            >
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">
                    Platform
                    Balance
                  </span>
                  <span className="text-[#FF5757] font-bold">
                    {
                      internalBalance
                    }{" "}
                    USDT
                  </span>
                </div>
                <div className="relative mt-2">
                  <input
                    type="number"
                    step="0.01"
                    max={
                      internalBalance
                    }
                    value={
                      amount
                    }
                    onChange={(
                      e,
                    ) =>
                      setAmount(
                        e
                          .target
                          .value,
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5757] text-xl font-mono"
                    placeholder="0.00"
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAmount(
                        internalBalance,
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center">
                <Wallet className="w-5 h-5 text-slate-400 mr-3" />
                <div className="overflow-hidden">
                  <p className="text-xs text-slate-500">
                    Destination
                    Address
                  </p>
                  <p className="text-sm font-mono text-slate-300 truncate">
                    {
                      userAddress
                    }
                  </p>
                </div>
              </div>

              {errorMessage && (
                <p className="text-red-400 text-sm text-center">
                  {
                    errorMessage
                  }
                </p>
              )}

              <button
                type="submit"
                disabled={
                  status ===
                  "processing"
                }
                className="w-full bg-[#FF5757] hover:bg-rose-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center mt-4 disabled:opacity-50"
              >
                {status ===
                "processing" ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    Confirm
                    Withdrawal{" "}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  };

export default WithdrawalModal;
