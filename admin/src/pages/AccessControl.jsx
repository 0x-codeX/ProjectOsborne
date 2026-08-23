import React, {
  useState,
  useEffect,
} from "react";
import axios from "axios";
import {
  Shield,
  Search,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  ArrowDownCircle,
  CheckCircle2,
  Wallet,
  X,
} from "lucide-react";

const AccessControl =
  () => {
    const [
      searchQuery,
      setSearchQuery,
    ] =
      useState(
        "",
      );
    const [
      user,
      setUser,
    ] =
      useState(
        null,
      );
    const [
      status,
      setStatus,
    ] =
      useState(
        "",
      );
    const [
      admins,
      setAdmins,
    ] =
      useState(
        [],
      );

    // --- TREASURY STATE ---
    const [
      activeTab,
      setActiveTab,
    ] =
      useState(
        "ROLES",
      ); // "ROLES" or "TREASURY"
    const [
      pendingClearings,
      setPendingClearings,
    ] =
      useState(
        [],
      );
    const [
      selectedRequest,
      setSelectedRequest,
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
    const [
      isSubmitting,
      setIsSubmitting,
    ] =
      useState(
        false,
      );

    const token =
      localStorage.getItem(
        "nippy_admin_token",
      );
    const axiosConfig =
      {
        headers:
          {
            Authorization: `Bearer ${token}`,
          },
      };

    // 1. Fetch Live Ledger on Load
    useEffect(() => {
      fetchAdmins();
    }, []);

    const fetchAdmins =
      async () => {
        try {
          const res =
            await axios.get(
              "http://localhost:5000/api/admin/admins",
              axiosConfig,
            );
          setAdmins(
            res.data ||
              [],
          );
        } catch (error) {
          console.error(
            "Failed to fetch active staff list.",
          );
        }
      };

    const currentAdmin =
      JSON.parse(
        localStorage.getItem(
          "nippy_admin_user",
        ) ||
          "{}",
      );

    // --- NEW TREASURY FUNCTIONS ---
    const fetchPendingClearings =
      async () => {
        try {
          const res =
            await axios.get(
              "http://localhost:5000/api/admin/clearing/pending",
              axiosConfig,
            );
          setPendingClearings(
            res.data ||
              [],
          );
        } catch (error) {
          console.error(
            "Failed to fetch pending clearings.",
          );
        }
      };

    // Fetch clearings when tab changes to TREASURY
    useEffect(() => {
      if (
        activeTab ===
        "TREASURY"
      ) {
        fetchPendingClearings();
      }
    }, [
      activeTab,
    ]);

    const handleExecuteClearing =
      async () => {
        if (
          !selectedRequest ||
          !depositConfirmed
        )
          return;
        setIsSubmitting(
          true,
        );
        setStatus(
          "Processing clearing...",
        );

        try {
          // Route dynamically based on the admin's role
          const endpoint =
            currentAdmin.role ===
            "GOD_ADMIN"
              ? "/clearing/instant"
              : "/clearing/approve";

          const res =
            await axios.post(
              `http://localhost:5000/api/admin${endpoint}`,
              {
                requestId:
                  selectedRequest._id,
                creatorId:
                  selectedRequest
                    .creator
                    ._id, // Needed for God bypass
                amount:
                  selectedRequest.amount,
                currency:
                  selectedRequest.currency,
                direction:
                  selectedRequest.direction,
                depositConfirmed: true,
              },
              axiosConfig,
            );

          setStatus(
            res
              .data
              .message,
          );
          setSelectedRequest(
            null,
          );
          setDepositConfirmed(
            false,
          );
          fetchPendingClearings(); // Refresh the list
        } catch (err) {
          setStatus(
            err
              .response
              ?.data
              ?.message ||
              "Failed to execute clearing.",
          );
        } finally {
          setIsSubmitting(
            false,
          );
        }
      };

    // 2. Search for a specific user to promote/demote
    const handleSearch =
      async (
        e,
      ) => {
        e.preventDefault();
        try {
          const res =
            await axios.get(
              `http://localhost:5000/api/admin/users/search?query=${searchQuery}`,
              axiosConfig,
            );
          setUser(
            res
              .data
              .users[0] ||
              null,
          ); // Grab first result for exact match
          setStatus(
            res
              .data
              .users
              .length
              ? ""
              : "User not found.",
          );
        } catch (err) {
          setStatus(
            "Search failed. Check connection.",
          );
        }
      };

    // 3. Execute the Role Change
    const handleRoleChange =
      async (
        newRole,
        targetUserId = user?._id,
      ) => {
        if (
          !targetUserId
        )
          return;
        setStatus(
          "Processing transaction...",
        );

        try {
          const endpoint =
            newRole ===
            "GOD_ADMIN"
              ? "/role/promote-god"
              : "/role/assign-staff";

          const res =
            await axios.post(
              `http://localhost:5000/api/admin${endpoint}`,
              {
                targetUserId:
                  targetUserId,
                newRole,
              },
              axiosConfig,
            );

          setStatus(
            res
              .data
              .message,
          );

          // Update the searched user card if they are currently on screen
          if (
            user &&
            user._id ===
              targetUserId
          ) {
            setUser(
              {
                ...user,
                role: newRole,
              },
            );
          }

          // Instantly refresh the live staff ledger
          fetchAdmins();
        } catch (err) {
          setStatus(
            err
              .response
              ?.data
              ?.message ||
              "Security clearance update failed.",
          );
        }
      };

    return (
      <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto">
        {/* --- TAB SWITCHER --- */}
        <div className="flex gap-4 border-b border-slate-800 pb-4">
          <button
            onClick={() =>
              setActiveTab(
                "ROLES",
              )
            }
            className={`px-6 py-2.5 font-bold rounded-xl transition-all ${
              activeTab ===
              "ROLES"
                ? "bg-slate-800 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Shield
              size={
                16
              }
              className="inline mr-2"
            />{" "}
            Role
            Management
          </button>
          <button
            onClick={() =>
              setActiveTab(
                "TREASURY",
              )
            }
            className={`px-6 py-2.5 font-bold rounded-xl transition-all ${
              activeTab ===
              "TREASURY"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Wallet
              size={
                16
              }
              className="inline mr-2"
            />{" "}
            Treasury
            Clearing
            Desk
          </button>
        </div>

        {/* ========================================== */}
        {/*              ROLES UI TAB                  */}
        {/* ========================================== */}
        {activeTab ===
          "ROLES" && (
          <>
            {/* WARNING HEADER */}
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-start gap-4 shadow-lg">
              <AlertTriangle
                className="text-red-500 flex-shrink-0 mt-1"
                size={
                  32
                }
              />
              <div>
                <h2 className="text-xl font-black text-red-500 mb-1">
                  Restricted
                  Zone:
                  God
                  Mode
                  Operations
                </h2>
                <p className="text-slate-300 text-sm">
                  You
                  are
                  altering
                  core
                  system
                  access.
                  Only
                  promote
                  trusted
                  personnel.
                  Actions
                  taken
                  here
                  immediately
                  alter
                  database
                  read/write
                  permissions.
                  There
                  should
                  never
                  be
                  more
                  than
                  two
                  God
                  Admins
                  active.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
              {/* LEFT PANE: SEARCH & ASSIGN */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col shadow-xl h-fit">
                <h3 className="font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
                  <UserCheck
                    size={
                      18
                    }
                    className="text-emerald-500"
                  />{" "}
                  Search
                  &
                  Assign
                </h3>

                <form
                  onSubmit={
                    handleSearch
                  }
                  className="flex gap-4 mb-6"
                >
                  <input
                    type="text"
                    placeholder="Enter exact email or username..."
                    value={
                      searchQuery
                    }
                    onChange={(
                      e,
                    ) =>
                      setSearchQuery(
                        e
                          .target
                          .value,
                      )
                    }
                    className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl py-3 px-4 focus:outline-none focus:border-[#FF5757]"
                  />
                  <button
                    type="submit"
                    className="bg-slate-800 hover:bg-slate-700 text-white px-6 rounded-xl font-bold transition-colors"
                  >
                    Find
                    User
                  </button>
                </form>

                {status && (
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm mb-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <CheckCircle2
                      size={
                        16
                      }
                    />{" "}
                    {
                      status
                    }
                  </div>
                )}

                {user && (
                  <div className="border border-slate-800 rounded-xl p-6 bg-slate-950 flex flex-col items-center sm:items-start justify-between gap-6">
                    <div className="w-full text-center sm:text-left">
                      <h3 className="text-2xl font-black text-white">
                        {
                          user.username
                        }
                      </h3>
                      <p className="text-slate-400 text-sm">
                        {
                          user.email
                        }
                      </p>
                      <div className="mt-3 inline-block px-3 py-1 bg-slate-800 rounded border border-slate-700 text-xs font-mono font-bold text-slate-300">
                        CURRENT
                        ROLE:{" "}
                        {user.role.toUpperCase()}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full border-t border-slate-800 pt-4">
                      <button
                        onClick={() =>
                          handleRoleChange(
                            "MODERATE_ADMIN",
                          )
                        }
                        className="flex-1 px-4 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 rounded-lg text-xs font-bold transition-colors uppercase tracking-wider"
                      >
                        Make
                        Moderate
                      </button>
                      <button
                        onClick={() =>
                          handleRoleChange(
                            "SUPER_ADMIN",
                          )
                        }
                        className="flex-1 px-4 py-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 rounded-lg text-xs font-bold transition-colors uppercase tracking-wider"
                      >
                        Make
                        Super
                      </button>
                      <button
                        onClick={() =>
                          handleRoleChange(
                            "GOD_ADMIN",
                          )
                        }
                        className="flex-1 px-4 py-2.5 bg-[#FF5757] text-white hover:bg-rose-600 rounded-lg text-xs font-bold transition-colors uppercase tracking-wider shadow-lg shadow-[#FF5757]/20"
                      >
                        Elevate
                        to
                        GOD
                      </button>
                      <button
                        onClick={() =>
                          handleRoleChange(
                            "fan",
                          )
                        }
                        className="w-full px-4 py-2.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-colors mt-2 uppercase tracking-wider"
                      >
                        Revoke
                        All
                        Access
                        (Demote
                        to
                        Fan)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT PANE: LIVE ADMIN LEDGER */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-800 bg-slate-900/50">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <ShieldAlert
                      size={
                        18
                      }
                      className="text-blue-500"
                    />{" "}
                    Active
                    System
                    Administrators
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {admins.length ===
                  0 ? (
                    <p className="text-slate-500 text-sm text-center mt-10">
                      No
                      admin
                      staff
                      found.
                    </p>
                  ) : (
                    admins.map(
                      (
                        admin,
                      ) => {
                        const isSelf =
                          admin._id ===
                            currentAdmin._id ||
                          admin.email ===
                            currentAdmin.email;

                        return (
                          <div
                            key={
                              admin._id
                            }
                            className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between group"
                          >
                            <div>
                              <p className="font-bold text-white text-sm">
                                {
                                  admin.username
                                }{" "}
                                {isSelf && (
                                  <span className="text-xs text-slate-500">
                                    (You)
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500">
                                {
                                  admin.email
                                }
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span
                                className={`text-[10px] uppercase font-black px-3 py-1 rounded-full border ${
                                  admin.role ===
                                  "GOD_ADMIN"
                                    ? "bg-[#FF5757]/10 text-[#FF5757] border-[#FF5757]/30"
                                    : admin.role ===
                                        "SUPER_ADMIN"
                                      ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                                      : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                }`}
                              >
                                {admin.role.replace(
                                  "_",
                                  " ",
                                )}
                              </span>

                              {!isSelf ? (
                                <button
                                  onClick={() =>
                                    handleRoleChange(
                                      "fan",
                                      admin._id,
                                    )
                                  }
                                  className="text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Quick Revoke Access"
                                >
                                  <ArrowDownCircle
                                    size={
                                      18
                                    }
                                  />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-600 font-mono italic">
                                  Protected
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      },
                    )
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ========================================== */}
        {/*            TREASURY DESK UI TAB            */}
        {/* ========================================== */}
        {activeTab ===
          "TREASURY" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Wallet
                  size={
                    18
                  }
                  className="text-emerald-500"
                />{" "}
                Pending
                Liquidation
                Clearings
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {pendingClearings.length ===
              0 ? (
                <p className="text-slate-500 text-sm text-center mt-10">
                  No
                  pending
                  clearings
                  awaiting
                  approval.
                </p>
              ) : (
                pendingClearings.map(
                  (
                    req,
                  ) => (
                    <div
                      key={
                        req._id
                      }
                      className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-white text-sm">
                          {req.amount.toLocaleString()}{" "}
                          {
                            req.currency
                          }{" "}
                          <span className="text-slate-500 font-normal">
                            from{" "}
                            {
                              req
                                .creator
                                .username
                            }
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Direction:{" "}
                          {req.direction.replace(
                            "_",
                            " ",
                          )}{" "}
                          |
                          Payout:{" "}
                          {req.payoutMethod.toUpperCase()}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setSelectedRequest(
                            req,
                          )
                        }
                        className="px-4 py-2 text-xs font-bold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400"
                      >
                        Review
                        &
                        Clear
                      </button>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/*         TREASURY CONFIRMATION MODAL        */}
        {/* ========================================== */}
        {selectedRequest && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-amber-500/30 p-6 rounded-3xl max-w-md w-full relative">
              <button
                onClick={() =>
                  setSelectedRequest(
                    null,
                  )
                }
                className="absolute top-5 right-5 text-slate-400 hover:text-white"
              >
                <X
                  size={
                    20
                  }
                />
              </button>

              <h3 className="text-xl font-bold text-white mb-2">
                Confirm
                Deposit
                Settlement
              </h3>
              <p className="text-sm text-slate-400 mb-6 border-b border-slate-800 pb-4">
                Authorizing
                clearing
                of{" "}
                <span className="text-emerald-400 font-bold font-mono">
                  {
                    selectedRequest.amount
                  }{" "}
                  {
                    selectedRequest.currency
                  }
                </span>{" "}
                for
                creator{" "}
                <strong className="text-white">
                  {
                    selectedRequest
                      .creator
                      .username
                  }
                </strong>
                .
              </p>

              <label className="flex items-start gap-3 p-4 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer mb-6">
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
                  className="mt-1 w-5 h-5 accent-amber-500 rounded border-slate-700"
                />
                <span className="text-sm text-slate-300 leading-snug">
                  I
                  confirm
                  under
                  audit
                  penalty
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
                  the
                  Nippy
                  Corporate
                  Treasury.
                </span>
              </label>

              <button
                disabled={
                  !depositConfirmed ||
                  isSubmitting
                }
                onClick={
                  handleExecuteClearing
                }
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-slate-950 text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/10 flex justify-center items-center"
              >
                {isSubmitting
                  ? "Executing..."
                  : currentAdmin.role ===
                      "GOD_ADMIN"
                    ? "Instant Clear (God Bypass)"
                    : "Approve & Dispatch"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

export default AccessControl;
