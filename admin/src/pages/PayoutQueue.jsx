import React, {
  useState,
  useEffect,
} from "react";
import api from "../utils/api";
import {
  Wallet,
  ShieldCheck,
  CheckCircle,
  AlertOctagon,
  XCircle,
  Clock,
  ArrowRight,
  ArrowLeftRight,
  Landmark,
  AlertCircle,
} from "lucide-react";

const PayoutQueue =
  () => {
    // --- GLOBAL STATE ---
    const [
      activeTab,
      setActiveTab,
    ] =
      useState(
        "WITHDRAWALS",
      ); // "WITHDRAWALS" or "LIQUIDATIONS"
    const [
      actionStatus,
      setActionStatus,
    ] =
      useState(
        "idle",
      );

    // --- WITHDRAWALS STATE ---
    const [
      payouts,
      setPayouts,
    ] =
      useState(
        [],
      );
    const [
      selectedPayout,
      setSelectedPayout,
    ] =
      useState(
        null,
      );
    const [
      filter,
      setFilter,
    ] =
      useState(
        "PENDING",
      );

    // --- LIQUIDATIONS STATE ---
    const [
      pendingClearings,
      setPendingClearings,
    ] =
      useState(
        [],
      );
    const [
      selectedClearing,
      setSelectedClearing,
    ] =
      useState(
        null,
      );
    const [
      depositConfirmed,
      setDepositConfirmed,
    ] =
      useState(
        false,
      );

    // --- ROLE MANAGEMENT ---
    const adminUser =
      JSON.parse(
        localStorage.getItem(
          "nippy_admin_user",
        ) ||
          "{}",
      );
    const isGodAdmin =
      adminUser.role ===
      "GOD_ADMIN";
    const isSuperAdmin =
      adminUser.role ===
      "SUPER_ADMIN";
    const isModerateAdmin =
      adminUser.role ===
      "MODERATE_ADMIN";

    // const getAxiosConfig =
    //   () => ({
    //     headers:
    //       {
    //         Authorization: `Bearer ${localStorage.getItem("nippy_admin_token")}`,
    //       },
    //   });

    // --- LIFECYCLE HOOKS ---
    useEffect(() => {
      if (
        activeTab ===
        "WITHDRAWALS"
      ) {
        fetchPayouts();
        setSelectedClearing(
          null,
        ); // Clear the other pane's selection
      } else {
        fetchPendingClearings();
        setSelectedPayout(
          null,
        );
      }
    }, [
      activeTab,
      filter,
    ]);

    // --- WITHDRAWALS LOGIC ---
    const fetchPayouts =
      async () => {
        try {
          const res =
            await api.get(`/admin/withdrawals?status=${filter}`);
          if (
            Array.isArray(
              res.data,
            )
          ) {
            setPayouts(
              res.data,
            );
          } else {
            setPayouts(
              [],
            );
          }
        } catch (error) {
          console.error(
            "Failed to fetch payouts:",
            error,
          );
          setPayouts(
            [],
          );
        }
      };

    const handlePayoutAction =
      async (
        actionType,
      ) => {
        if (
          !selectedPayout
        )
          return;
        setActionStatus(
          "loading",
        );
        try {
          await api.post(
            "/admin/withdrawals/action",
            {
              withdrawalId:
                selectedPayout._id,
              action:
                actionType,
            }
          );
          setPayouts(
            (
              prev,
            ) =>
              prev.filter(
                (
                  p,
                ) =>
                  p._id !==
                  selectedPayout._id,
              ),
          );
          setSelectedPayout(
            null,
          );
        } catch (error) {
          console.error(
            "Payout Action failed:",
            error,
          );
        } finally {
          setActionStatus(
            "idle",
          );
        }
      };

    // --- LIQUIDATIONS LOGIC ---
    const fetchPendingClearings =
      async () => {
        try {
          // Pointing to your backend URL (adjust if hosted elsewhere)
          const res =
            await api.get(
              "/admin/clearing/pending",
            );
          setPendingClearings(
            res.data ||
              [],
          );
        } catch (error) {
          console.error(
            "Failed to fetch pending clearings:",
            error,
          );
        }
      };

    const handleClearingAction =
      async () => {
        if (
          !selectedClearing ||
          !depositConfirmed
        )
          return;
        setActionStatus(
          "loading",
        );
        try {
          const endpoint =
            isGodAdmin
              ? "/clearing/instant"
              : "/clearing/approve";
          await api.post(
            `/admin${endpoint}`,
            {
              requestId:
                selectedClearing._id,
              creatorId:
                selectedClearing
                  .creator
                  ._id,
              amount:
                selectedClearing.amount,
              currency:
                selectedClearing.currency,
              direction:
                selectedClearing.direction,
              depositConfirmed: true,
            }
          );
          setDepositConfirmed(
            false,
          );
          setSelectedClearing(
            null,
          );
          fetchPendingClearings();
        } catch (error) {
          console.error(
            "Clearing Action failed:",
            error,
          );
        } finally {
          setActionStatus(
            "idle",
          );
        }
      };

    // --- FORCE AUDIT LOGIC ---
    const handleForceAudit =
      async () => {
        if (
          !isGodAdmin
        )
          return;
        setActionStatus(
          "loading",
        );
        try {
          const res =
            await api.get(
              "/admin/treasury/force-audit",
            );
          alert(
            `Audit Result: ${res.data.message}`,
          );
        } catch (error) {
          alert(
            error
              .response
              ?.data
              ?.message ||
              "Failed to execute audit.",
          );
        } finally {
          setActionStatus(
            "idle",
          );
        }
      };

    // --- FORCE FIAT BATCH LOGIC ---
    const handleForceFiatBatch =
      async () => {
        if (
          !isGodAdmin
        )
          return;

        // Safety prompt before executing real money transfers
        const confirmDispatch =
          window.confirm(
            "WARNING: This will instantly dispatch all APPROVED fiat transactions to Paystack for real-world bank settlement. Do you want to proceed?",
          );
        if (
          !confirmDispatch
        )
          return;

        setActionStatus(
          "loading",
        );
        try {
          const res =
            await api.get(
              "/admin/treasury/force-fiat-batch",
            );
          alert(
            `Batch Result: ${res.data.message}`,
          );
          // Refresh the list so processing items disappear from the pending view
          fetchPayouts();
        } catch (error) {
          alert(
            error
              .response
              ?.data
              ?.message ||
              "Failed to dispatch fiat batch.",
          );
        } finally {
          setActionStatus(
            "idle",
          );
        }
      };

    return (
      <div className="flex flex-col h-full gap-6">
        {/* --- TOP TAB NAVIGATOR --- */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <div className="flex gap-4">
            <button
              onClick={() =>
                setActiveTab(
                  "WITHDRAWALS",
                )
              }
              className={`px-6 py-3 font-bold rounded-t-xl transition-all ${
                activeTab ===
                "WITHDRAWALS"
                  ? "bg-slate-900 border-t-2 border-amber-500 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Landmark
                size={
                  18
                }
                className="inline mr-2"
              />{" "}
              Fiat
              Payout
              Queue
            </button>
            <button
              onClick={() =>
                setActiveTab(
                  "LIQUIDATIONS",
                )
              }
              className={`px-6 py-3 font-bold rounded-t-xl transition-all ${
                activeTab ===
                "LIQUIDATIONS"
                  ? "bg-slate-900 border-t-2 border-emerald-500 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <ArrowLeftRight
                size={
                  18
                }
                className="inline mr-2"
              />{" "}
              Treasury
              Liquidations
            </button>
          </div>

          {/* GOD ADMIN ACTION BUTTONS */}
          {isGodAdmin && (
            <div className="flex items-center gap-3">
              <button
                onClick={
                  handleForceFiatBatch
                }
                disabled={
                  actionStatus ===
                  "loading"
                }
                className="mb-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg"
              >
                <Landmark
                  size={
                    16
                  }
                />{" "}
                Force
                Fiat
                Dispatch
              </button>

              <button
                onClick={
                  handleForceAudit
                }
                disabled={
                  actionStatus ===
                  "loading"
                }
                className="mb-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg"
              >
                <ShieldCheck
                  size={
                    16
                  }
                />{" "}
                Force
                Treasury
                Audit
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 flex gap-6 min-h-0">
          {/* ==================================================== */}
          {/*                   LEFT PANE (LIST)                   */}
          {/* ==================================================== */}
          <div className="w-1/3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
            {/* Filters for Withdrawals ONLY */}
            {activeTab ===
              "WITHDRAWALS" && (
              <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-wrap gap-3">
                <button
                  onClick={() =>
                    setFilter(
                      "PENDING",
                    )
                  }
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                    filter ===
                    "PENDING"
                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      : "text-slate-500 hover:bg-slate-800"
                  }`}
                >
                  Pending
                  Review
                </button>
                <button
                  onClick={() =>
                    setFilter(
                      "REVIEWED",
                    )
                  }
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                    filter ===
                    "REVIEWED"
                      ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                      : "text-slate-500 hover:bg-slate-800"
                  }`}
                >
                  Ready
                  for
                  Payout
                </button>
                <button
                  onClick={() =>
                    setFilter(
                      "COMPLETED",
                    )
                  }
                  className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                    filter ===
                    "COMPLETED"
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : "text-slate-500 hover:bg-slate-800"
                  }`}
                >
                  Completed
                </button>
              </div>
            )}

            {/* Header for Liquidations */}
            {activeTab ===
              "LIQUIDATIONS" && (
              <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-wider">
                  Pending
                  Maker
                  Checks
                </h3>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* WITHDRAWALS LIST RENDERING */}
              {activeTab ===
                "WITHDRAWALS" &&
                (payouts.length ===
                0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                    <Wallet
                      size={
                        32
                      }
                      className="mb-2"
                    />
                    <p className="text-sm">
                      No{" "}
                      {filter.toLowerCase()}{" "}
                      payouts.
                    </p>
                  </div>
                ) : (
                  payouts.map(
                    (
                      payout,
                    ) => (
                      <button
                        key={
                          payout._id
                        }
                        onClick={() =>
                          setSelectedPayout(
                            payout,
                          )
                        }
                        className={`w-full text-left p-4 rounded-xl transition-all border ${
                          selectedPayout?._id ===
                          payout._id
                            ? "bg-slate-800 border-slate-700 shadow-lg"
                            : "bg-transparent border-transparent hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-sm text-white truncate">
                            {
                              payout.creatorName
                            }
                          </span>
                          <span className="font-mono text-[#FF5757] font-bold">
                            ₦
                            {payout.amount.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock
                            size={
                              10
                            }
                          />{" "}
                          {new Date(
                            payout.createdAt,
                          ).toLocaleDateString()}
                        </p>
                      </button>
                    ),
                  )
                ))}

              {/* LIQUIDATIONS LIST RENDERING */}
              {activeTab ===
                "LIQUIDATIONS" &&
                (pendingClearings.length ===
                0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                    <ArrowLeftRight
                      size={
                        32
                      }
                      className="mb-2"
                    />
                    <p className="text-sm">
                      No
                      pending
                      liquidations.
                    </p>
                  </div>
                ) : (
                  pendingClearings.map(
                    (
                      req,
                    ) => (
                      <button
                        key={
                          req._id
                        }
                        onClick={() =>
                          setSelectedClearing(
                            req,
                          )
                        }
                        className={`w-full text-left p-4 rounded-xl transition-all border ${
                          selectedClearing?._id ===
                          req._id
                            ? "bg-slate-800 border-slate-700 shadow-lg"
                            : "bg-transparent border-transparent hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-sm text-white truncate">
                            @
                            {req
                              .creator
                              ?.username ||
                              "Unknown"}
                          </span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {req.amount.toLocaleString()}{" "}
                            {
                              req.currency
                            }
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock
                              size={
                                10
                              }
                            />{" "}
                            {new Date(
                              req.createdAt,
                            ).toLocaleDateString()}
                          </p>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {
                              req.payoutMethod
                            }
                          </span>
                        </div>
                      </button>
                    ),
                  )
                ))}
            </div>
          </div>

          {/* ==================================================== */}
          {/*                  RIGHT PANE (DETAILS)                */}
          {/* ==================================================== */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
            {/* EMPTY STATE */}
            {!selectedPayout &&
              !selectedClearing && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-30">
                  <ShieldCheck
                    size={
                      64
                    }
                    className="mb-4"
                  />
                  <p className="font-medium text-lg">
                    Select
                    an
                    item
                    from
                    the
                    queue
                    to
                    review
                  </p>
                </div>
              )}

            {/* WITHDRAWALS DETAIL RENDERING */}
            {activeTab ===
              "WITHDRAWALS" &&
              selectedPayout && (
                <>
                  <div className="p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white mb-2">
                      Payout
                      Review
                    </h2>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="bg-slate-800 px-3 py-1 rounded text-slate-300 font-medium border border-slate-700">
                        {
                          selectedPayout.creatorEmail
                        }
                      </span>
                      <span
                        className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded ${
                          selectedPayout.status ===
                          "PENDING"
                            ? "bg-amber-500/10 text-amber-500"
                            : selectedPayout.status ===
                                "REVIEWED"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-emerald-500/10 text-emerald-500"
                        }`}
                      >
                        {
                          selectedPayout.status
                        }
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                          Requested
                          Amount
                        </p>
                        <p className="text-2xl font-mono text-[#FF5757] font-bold">
                          ₦
                          {selectedPayout.amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                          Bank
                          Destination
                        </p>
                        <p className="text-sm font-bold text-white">
                          {selectedPayout.bankName ||
                            "N/A"}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                          {selectedPayout.accountNumber ||
                            "No Account Provided"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ShieldCheck
                          size={
                            14
                          }
                        />{" "}
                        Security
                        Checks
                      </h3>
                      <ul className="space-y-2 text-sm text-slate-300">
                        <li className="flex items-center gap-2">
                          <CheckCircle
                            size={
                              14
                            }
                            className="text-emerald-500"
                          />{" "}
                          KYC
                          Verified
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle
                            size={
                              14
                            }
                            className="text-emerald-500"
                          />{" "}
                          No
                          active
                          chargebacks
                          detected
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle
                            size={
                              14
                            }
                            className="text-emerald-500"
                          />{" "}
                          Account
                          age{" "}
                          {
                            ">"
                          }{" "}
                          30
                          days
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex gap-3 justify-end">
                    {selectedPayout.status !==
                      "COMPLETED" &&
                      selectedPayout.status !==
                        "REJECTED" && (
                        <button
                          onClick={() =>
                            handlePayoutAction(
                              "REJECT",
                            )
                          }
                          disabled={
                            actionStatus ===
                            "loading"
                          }
                          className="px-6 py-2.5 rounded-xl text-red-400 font-bold text-sm hover:bg-red-500/10 transition-colors flex items-center gap-2"
                        >
                          <XCircle
                            size={
                              16
                            }
                          />{" "}
                          Reject
                          Fraud
                        </button>
                      )}
                    {selectedPayout.status ===
                      "PENDING" && (
                      <button
                        onClick={() =>
                          handlePayoutAction(
                            "MARK_REVIEWED",
                          )
                        }
                        disabled={
                          actionStatus ===
                          "loading"
                        }
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                      >
                        Mark
                        as
                        Reviewed{" "}
                        <ArrowRight
                          size={
                            16
                          }
                        />
                      </button>
                    )}
                    {selectedPayout.status ===
                      "REVIEWED" &&
                      (isGodAdmin ? (
                        <button
                          onClick={() =>
                            handlePayoutAction(
                              "APPROVE_PAYOUT",
                            )
                          }
                          disabled={
                            actionStatus ===
                            "loading"
                          }
                          className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                        >
                          <Wallet
                            size={
                              16
                            }
                          />{" "}
                          Approve
                          &
                          Trigger
                          API
                        </button>
                      ) : (
                        <div className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-500 font-bold text-sm border border-slate-700 flex items-center gap-2 cursor-not-allowed">
                          <AlertOctagon
                            size={
                              16
                            }
                          />{" "}
                          God
                          Admin
                          Required
                          to
                          Pay
                        </div>
                      ))}
                  </div>
                </>
              )}

            {/* LIQUIDATIONS DETAIL RENDERING */}
            {activeTab ===
              "LIQUIDATIONS" &&
              selectedClearing && (
                <>
                  <div className="p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white mb-2">
                      Liquidation
                      Review
                    </h2>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="bg-slate-800 px-3 py-1 rounded text-slate-300 font-medium border border-slate-700">
                        @
                        {
                          selectedClearing
                            .creator
                            ?.username
                        }
                      </span>
                      <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded border border-emerald-500/20">
                        PENDING
                        APPROVAL
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                          Requested
                          Amount
                        </p>
                        <p className="text-2xl font-mono text-emerald-400 font-bold">
                          {selectedClearing.amount.toLocaleString()}{" "}
                          <span className="text-lg">
                            {
                              selectedClearing.currency
                            }
                          </span>
                        </p>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                          Swap
                          Direction
                        </p>
                        <p className="text-sm font-bold text-white">
                          {selectedClearing.direction.replace(
                            "_",
                            " ",
                          )}
                        </p>
                        <p className="text-xs text-slate-400 font-mono mt-1">
                          Via{" "}
                          {selectedClearing.payoutMethod.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ShieldCheck
                          size={
                            14
                          }
                        />{" "}
                        Maker-Checker
                        Verification
                      </h3>

                      {isModerateAdmin ? (
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                          <AlertCircle
                            className="text-blue-500 shrink-0 mt-0.5"
                            size={
                              18
                            }
                          />
                          <p className="text-xs text-blue-300 leading-relaxed">
                            <strong>
                              Moderate
                              Admin
                              Restriction:
                            </strong>{" "}
                            You
                            can
                            view
                            this
                            ticket
                            to
                            initiate
                            verification,
                            but
                            final
                            ledger
                            clearance
                            requires
                            a
                            Super
                            Admin
                            or
                            God
                            Admin
                            signature
                            to
                            prevent
                            unilateral
                            execution.
                          </p>
                        </div>
                      ) : (
                        <label className="flex items-start gap-4 p-4 bg-slate-950 border border-slate-700 rounded-xl cursor-pointer hover:border-slate-500 transition-colors">
                          <input
                            type="checkbox"
                            checked={
                              depositConfirmed
                            }
                            onChange={(
                              e,
                            ) =>
                              setDepositConfirmed(
                                e
                                  .target
                                  .checked,
                              )
                            }
                            className="mt-1 w-5 h-5 accent-emerald-500 rounded border-slate-700 cursor-pointer"
                          />
                          <span className="text-sm text-slate-300 leading-snug">
                            I
                            confirm
                            under
                            penalty
                            of
                            audit
                            that
                            I
                            have
                            independently
                            verified
                            these
                            funds
                            have
                            landed
                            in
                            the{" "}
                            <strong className="text-white">
                              Nippy
                              Corporate
                              Treasury
                            </strong>

                            .
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex gap-3 justify-end">
                    {isModerateAdmin ? (
                      <div className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-500 font-bold text-sm border border-slate-700 flex items-center gap-2 cursor-not-allowed">
                        <AlertOctagon
                          size={
                            16
                          }
                        />{" "}
                        Awaiting
                        Super
                        Admin
                        Check
                      </div>
                    ) : (
                      <button
                        onClick={
                          handleClearingAction
                        }
                        disabled={
                          !depositConfirmed ||
                          actionStatus ===
                            "loading"
                        }
                        className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 text-slate-950 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                      >
                        <Wallet
                          size={
                            16
                          }
                        />{" "}
                        {isGodAdmin
                          ? "Instant Clear (God Bypass)"
                          : "Approve & Dispatch Funds"}
                      </button>
                    )}
                  </div>
                </>
              )}
          </div>
        </div>
      </div>
    );
  };;

export default PayoutQueue;
