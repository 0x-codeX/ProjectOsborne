import React, {
  useState,
  useEffect,
} from "react";
import axios from "axios";
import {
  Search,
  User as UserIcon,
  FileVideo,
  CreditCard,
  MessageSquare,
  ArrowLeft,
  ShieldAlert,
  Wallet,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Unlock,
  Eye,
  Flag,
  Trash2,
  Bitcoin,
  Package,
  Clock,
  Key,
  UserPlus,
  Check,
  XCircle,
} from "lucide-react";

const User360 =
  () => {
    const [
      searchQuery,
      setSearchQuery,
    ] =
      useState(
        "",
      );
    const [
      searchResults,
      setSearchResults,
    ] =
      useState(
        {
          users:
            [],
          items:
            [],
        },
      );
    const [
      isSearching,
      setIsSearching,
    ] =
      useState(
        false,
      );

    // View State Management: 'search', 'user', 'item', 'approvals'
    const [
      viewMode,
      setViewMode,
    ] =
      useState(
        "search",
      );

    // User State
    const [
      selectedUser,
      setSelectedUser,
    ] =
      useState(
        null,
      );
    const [
      userData,
      setUserData,
    ] =
      useState(
        null,
      );

    // Item State
    const [
      itemData,
      setItemData,
    ] =
      useState(
        null,
      );
    const [
      fanSearchQuery,
      setFanSearchQuery,
    ] =
      useState(
        "",
      );

    const [
      isLoading360,
      setIsLoading360,
    ] =
      useState(
        false,
      );
    const [
      activeTab,
      setActiveTab,
    ] =
      useState(
        "overview",
      );

    // Approval Queue State
    const [
      pendingApprovals,
      setPendingApprovals,
    ] =
      useState(
        [],
      );
    const [
      isLoadingApprovals,
      setIsLoadingApprovals,
    ] =
      useState(
        false,
      );

    // Modal & Action States
    const [
      showSuspendModal,
      setShowSuspendModal,
    ] =
      useState(
        false,
      );
    const [
      showGrantAccessModal,
      setShowGrantAccessModal,
    ] =
      useState(
        false,
      );
    const [
      isActionLoading,
      setIsActionLoading,
    ] =
      useState(
        false,
      );
    const [
      isResetLoading,
      setIsResetLoading,
    ] =
      useState(
        false,
      );

    // Updated Grant Data to include justification
    const [
      grantAccessData,
      setGrantAccessData,
    ] =
      useState(
        {
          targetUser:
            "",
          accessType:
            "PPV",
          justification:
            "",
        },
      );

    const [
      viewingMedia,
      setViewingMedia,
    ] =
      useState(
        null,
      );
    const [
      error,
      setError,
    ] =
      useState(
        "",
      );
    const [
      successMsg,
      setSuccessMsg,
    ] =
      useState(
        "",
      );

    const token =
      localStorage.getItem(
        "nippy_admin_token",
      );
    const adminUser =
      JSON.parse(
        localStorage.getItem(
          "nippy_admin_user",
        ) ||
          "{}",
      );

    // Granular Role Definitions
    const isGodAdmin =
      adminUser.role ===
      "GOD_ADMIN";
    const isSuperAdmin =
      adminUser.role ===
      "SUPER_ADMIN";
    const isHighLevelAdmin =
      isGodAdmin ||
      isSuperAdmin;
    const isModerateAdmin =
      adminUser.role ===
      "MODERATE_ADMIN";

    const axiosConfig =
      {
        headers:
          {
            Authorization: `Bearer ${token}`,
          },
      };

    // --- NEW: Load Pending Approvals for Super Admins ---
    useEffect(() => {
      if (
        isHighLevelAdmin
      ) {
        fetchPendingApprovals();
      }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchPendingApprovals =
      async () => {
        try {
          setIsLoadingApprovals(
            true,
          );
          const res =
            await axios.get(
              "http://localhost:5000/api/admin/approvals/pending",
              axiosConfig,
            );
          const approvals =
            res
              .data
              .approvals ||
            [];
          setPendingApprovals(
            approvals,
          );

          // Force to approvals view if they have pending tasks
          if (
            approvals.length >
            0
          ) {
            setViewMode(
              "approvals",
            );
          }
        } catch (err) {
          console.error(
            "Failed to load approvals",
            err,
          );
        } finally {
          setIsLoadingApprovals(
            false,
          );
        }
      };

    // 1. Handle Universal Search
    const handleSearch =
      async (
        e,
      ) => {
        e.preventDefault();
        if (
          !searchQuery.trim()
        )
          return;

        setIsSearching(
          true,
        );
        setError(
          "",
        );
        setSuccessMsg(
          "",
        );
        setViewMode(
          "search",
        );
        setSelectedUser(
          null,
        );
        setItemData(
          null,
        );

        try {
          const res =
            await axios.get(
              `http://localhost:5000/api/admin/users/search?query=${searchQuery}`,
              axiosConfig,
            );
          setSearchResults(
            {
              users:
                res
                  .data
                  .users ||
                [],
              items:
                res
                  .data
                  .items ||
                [],
            },
          );

          if (
            (
              res
                .data
                .users ||
              []
            )
              .length ===
              0 &&
            (
              res
                .data
                .items ||
              []
            )
              .length ===
              0
          ) {
            setError(
              "No users or items found matching that criteria.",
            );
          }
        } catch (err) {
          console.error(
            err,
          );
          setError(
            "Search failed. Check server connection.",
          );
        } finally {
          setIsSearching(
            false,
          );
        }
      };

    // 2. Fetch User 360 Data
    const loadUser360 =
      async (
        userId,
      ) => {
        setIsLoading360(
          true,
        );
        setError(
          "",
        );
        setSuccessMsg(
          "",
        );
        try {
          const res =
            await axios.get(
              `http://localhost:5000/api/admin/users/360/${userId}`,
              axiosConfig,
            );
          setSelectedUser(
            res
              .data
              .user,
          );
          setUserData(
            res.data,
          );
          setActiveTab(
            "overview",
          );
          setViewMode(
            "user",
          );
        } catch (err) {
          console.error(
            err,
          );
          setError(
            "Failed to load full user profile.",
          );
        } finally {
          setIsLoading360(
            false,
          );
        }
      };

    // 3. Fetch Item 360 Data
    const loadItem360 =
      async (
        itemId,
      ) => {
        setIsLoading360(
          true,
        );
        setError(
          "",
        );
        setFanSearchQuery(
          "",
        );
        try {
          const res =
            await axios.get(
              `http://localhost:5000/api/admin/item/360/${itemId}`,
              axiosConfig,
            );
          setItemData(
            res.data,
          );
          setViewMode(
            "item",
          );
        } catch (err) {
          console.error(
            err,
          );
          setError(
            "Failed to load item forensics.",
          );
        } finally {
          setIsLoading360(
            false,
          );
        }
      };

    // 4. Toggle User Account Status
    const handleToggleUserStatus =
      async () => {
        if (
          !selectedUser
        )
          return;
        setIsActionLoading(
          true,
        );
        setError(
          "",
        );

        const newStatus =
          selectedUser.isSuspended
            ? "active"
            : "suspended";

        try {
          await axios.post(
            `http://localhost:5000/api/admin/users/${selectedUser._id}/status`,
            {
              status:
                newStatus,
            },
            axiosConfig,
          );
          setSelectedUser(
            (
              prev,
            ) => ({
              ...prev,
              isSuspended:
                !prev.isSuspended,
            }),
          );
          setSuccessMsg(
            `User status updated to ${newStatus.toUpperCase()}`,
          );
          setShowSuspendModal(
            false,
          );
        } catch (err) {
          console.error(
            err,
          );
          setError(
            err
              .response
              ?.data
              ?.message ||
              "Failed to update user status.",
          );
        } finally {
          setIsActionLoading(
            false,
          );
        }
      };

    // 5. Send Password Reset Email (Available to Moderate Admin)
    const handleSendPasswordReset =
      async () => {
        if (
          !selectedUser
        )
          return;
        setIsResetLoading(
          true,
        );
        setError(
          "",
        );

        try {
          await axios.post(
            `http://localhost:5000/api/admin/users/${selectedUser._id}/send-reset`,
            {},
            axiosConfig,
          );
          setSuccessMsg(
            `Password reset link sent to ${selectedUser.email}`,
          );
        } catch (err) {
          console.error(
            err,
          );
          setError(
            err
              .response
              ?.data
              ?.message ||
              "Failed to send reset link.",
          );
        } finally {
          setIsResetLoading(
            false,
          );
        }
      };

    // 6. --- NEW: Request Access (Moderate Admin) ---
    const handleRequestAccess =
      async (
        e,
      ) => {
        e.preventDefault();
        if (
          !grantAccessData.targetUser.trim()
        )
          return;

        setIsActionLoading(
          true,
        );
        setError(
          "",
        );

        try {
          await axios.post(
            `http://localhost:5000/api/admin/item/${itemData.item._id}/request-manual-unlock`,
            {
              userIdOrEmail:
                grantAccessData.targetUser,
              type: grantAccessData.accessType,
              justification:
                grantAccessData.justification,
            },
            axiosConfig,
          );
          setSuccessMsg(
            "Unlock request sent to Super Admins for approval.",
          );
          setShowGrantAccessModal(
            false,
          );
          setGrantAccessData(
            {
              targetUser:
                "",
              accessType:
                "PPV",
              justification:
                "",
            },
          );
        } catch (err) {
          console.error(
            err,
          );
          setError(
            err
              .response
              ?.data
              ?.message ||
              "Failed to submit request. Check User details.",
          );
        } finally {
          setIsActionLoading(
            false,
          );
        }
      };

    // --- NEW: Process Approval (Super Admin) ---
    const handleProcessApproval =
      async (
        approvalId,
        action,
      ) => {
        try {
          await axios.post(
            `http://localhost:5000/api/admin/approvals/${approvalId}/process`,
            {
              action,
            }, // 'APPROVE' or 'REJECT'
            axiosConfig,
          );
          setSuccessMsg(
            `Request ${action.toLowerCase()}d successfully.`,
          );

          // Remove from UI list
          setPendingApprovals(
            (
              prev,
            ) =>
              prev.filter(
                (
                  p,
                ) =>
                  p._id !==
                  approvalId,
              ),
          );
          if (
            pendingApprovals.length <=
            1
          )
            setViewMode(
              "search",
            ); // go back if empty
        } catch (err) {
          console.error(
            err,
          );
          setError(
            `Failed to ${action.toLowerCase()} request.`,
          );
        }
      };

    // Content Moderation Handlers
    const handleFlagContent =
      (
        contentId,
      ) => {
        alert(
          `Content ${contentId} flagged for Super Admin review.`,
        );
      };

    const handleDeleteContent =
      (
        contentId,
      ) => {
        if (
          window.confirm(
            "Are you sure you want to permanently delete this content?",
          )
        ) {
          alert(
            `Content ${contentId} permanently deleted.`,
          );
        }
      };

    // Helper for filtering fans in Item View
    const filteredFans =
      itemData?.purchases?.filter(
        (
          p,
        ) => {
          if (
            !fanSearchQuery
          )
            return true;
          const search =
            fanSearchQuery.toLowerCase();
          return (
            (
              p.user?.username?.toLowerCase() ||
              ""
            ).includes(
              search,
            ) ||
            (
              p.user?.email?.toLowerCase() ||
              ""
            ).includes(
              search,
            )
          );
        },
      ) ||
      [];

    return (
      <div className="flex flex-col h-full space-y-6 relative">
        {/* Super Admin Top Navigation Alert */}
        {isHighLevelAdmin &&
          pendingApprovals.length >
            0 &&
          viewMode !==
            "approvals" && (
            <div
              onClick={() =>
                setViewMode(
                  "approvals",
                )
              }
              className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-amber-500/20 transition-all shadow-sm"
            >
              <div className="flex items-center gap-3">
                <AlertCircle
                  size={
                    18
                  }
                />
                <span className="text-sm font-bold">
                  You
                  have{" "}
                  {
                    pendingApprovals.length
                  }{" "}
                  manual
                  access
                  request(s)
                  waiting
                  for
                  your
                  approval.
                </span>
              </div>
              <span className="text-xs bg-amber-500/20 px-3 py-1 rounded-lg">
                Review
                Now
              </span>
            </div>
          )}

        {/* SEARCH BAR */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <form
            onSubmit={
              handleSearch
            }
            className="flex-1 max-w-2xl relative"
          >
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={
                20
              }
            />
            <input
              type="text"
              placeholder="Search username, email, user ID, phone, or paste an Item ID..."
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
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-28 focus:outline-none focus:border-[#FF5757] transition-colors"
            />
            <button
              type="submit"
              disabled={
                isSearching
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#FF5757] hover:bg-rose-600 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
            >
              {isSearching
                ? "Searching..."
                : "Search"}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle
              size={
                16
              }
            />{" "}
            {
              error
            }
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle2
              size={
                16
              }
            />{" "}
            {
              successMsg
            }
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 0: APPROVALS QUEUE (SUPER ADMIN ONLY)                */}
        {/* ========================================================= */}
        {viewMode ===
          "approvals" && (
          <div className="flex-1 overflow-auto space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldAlert className="text-amber-500" />{" "}
                Pending
                Access
                Approvals
              </h2>
              <button
                onClick={() =>
                  setViewMode(
                    "search",
                  )
                }
                className="text-slate-400 hover:text-white text-sm flex items-center gap-2 transition-colors"
              >
                <ArrowLeft
                  size={
                    16
                  }
                />{" "}
                Back
                to
                Search
              </button>
            </div>

            {pendingApprovals.map(
              (
                req,
              ) => (
                <div
                  key={
                    req._id
                  }
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-white font-bold mb-1">
                        Manual
                        Access
                        Override
                      </h3>
                      <p className="text-xs text-slate-400">
                        Requested
                        by
                        Moderate
                        Admin:{" "}
                        <span className="text-blue-400">
                          {
                            req
                              .requestedBy
                              .username
                          }
                        </span>
                      </p>
                    </div>
                    <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded text-xs font-bold uppercase">
                      Pending
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4">
                    <div>
                      <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">
                        Target
                        Fan
                      </p>
                      <p className="text-sm text-slate-200">
                        {
                          req
                            .targetUser
                            .email
                        }{" "}
                        <span className="text-slate-500 text-xs">
                          (
                          {
                            req
                              .targetUser
                              ._id
                          }

                          )
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">
                        Target
                        Content
                      </p>
                      <p
                        className="text-sm text-slate-200 font-mono cursor-pointer hover:text-blue-400 transition-colors"
                        onClick={() =>
                          loadItem360(
                            req
                              .item
                              ._id,
                          )
                        }
                      >
                        {
                          req
                            .item
                            .title
                        }{" "}
                        <span className="text-slate-500 text-xs">
                          (
                          {
                            req
                              .item
                              ._id
                          }

                          )
                        </span>
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">
                        Justification
                      </p>
                      <p className="text-sm text-amber-100 bg-amber-500/5 p-3 rounded border border-amber-500/10 italic">
                        "
                        {
                          req.justification
                        }

                        "
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() =>
                        handleProcessApproval(
                          req._id,
                          "REJECT",
                        )
                      }
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 border border-red-500/20 font-bold rounded-xl text-sm flex items-center gap-2 transition-all"
                    >
                      <XCircle
                        size={
                          16
                        }
                      />{" "}
                      Reject
                    </button>
                    <button
                      onClick={() =>
                        handleProcessApproval(
                          req._id,
                          "APPROVE",
                        )
                      }
                      className="px-5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold rounded-xl text-sm flex items-center gap-2 transition-all"
                    >
                      <Check
                        size={
                          16
                        }
                      />{" "}
                      Approve
                      &
                      Unlock
                    </button>
                  </div>
                </div>
              ),
            )}
            {pendingApprovals.length ===
              0 && (
              <div className="text-center py-10 text-slate-500">
                <CheckCircle2
                  className="mx-auto mb-4 opacity-50"
                  size={
                    48
                  }
                />
                <p>
                  No
                  pending
                  approvals.
                  You're
                  all
                  caught
                  up!
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 1: SEARCH RESULTS DUAL-ENGINE                          */}
        {/* ========================================================= */}
        {viewMode ===
          "search" &&
          (searchResults
            .users
            .length >
            0 ||
            searchResults
              .items
              .length >
              0) && (
            <div className="flex-1 overflow-auto space-y-6">
              {/* USER MATCHES */}
              {searchResults
                .users
                .length >
                0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-800 pb-2">
                    User
                    Matches
                    (
                    {
                      searchResults
                        .users
                        .length
                    }

                    )
                  </h3>
                  <div className="grid gap-3">
                    {searchResults.users.map(
                      (
                        u,
                      ) => (
                        <div
                          key={
                            u._id
                          }
                          onClick={() =>
                            loadUser360(
                              u._id,
                            )
                          }
                          className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 hover:border-[#FF5757]/50 rounded-xl cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 overflow-hidden">
                              {u.profileImage ? (
                                <img
                                  src={
                                    u.profileImage
                                  }
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <UserIcon
                                  size={
                                    22
                                  }
                                />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-200 group-hover:text-white">
                                  {u.username ||
                                    "Unknown User"}
                                </p>
                                {u.isSuspended && (
                                  <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold">
                                    SUSPENDED
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">
                                {
                                  u.email
                                }{" "}
                                •{" "}
                                {u.phone ||
                                  "No phone"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-md font-mono font-bold uppercase ${
                                u.role ===
                                "creator"
                                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              }`}
                            >
                              {
                                u.role
                              }
                            </span>
                            <span className="text-xs text-slate-500 hidden sm:block">
                              Joined{" "}
                              {new Date(
                                u.createdAt,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* ITEM MATCHES */}
              {searchResults
                .items
                .length >
                0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-800 pb-2">
                    Content/Message
                    Matches
                    (
                    {
                      searchResults
                        .items
                        .length
                    }

                    )
                  </h3>
                  <div className="grid gap-3">
                    {searchResults.items.map(
                      (
                        item,
                      ) => (
                        <div
                          key={
                            item._id
                          }
                          onClick={() =>
                            loadItem360(
                              item._id,
                            )
                          }
                          className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 hover:border-blue-500/50 rounded-xl cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                              {item.searchType ===
                              "MESSAGE" ? (
                                <MessageSquare
                                  size={
                                    22
                                  }
                                />
                              ) : (
                                <FileVideo
                                  size={
                                    22
                                  }
                                />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-200 group-hover:text-white">
                                {item.title ||
                                  "Untitled Item"}
                              </p>
                              <p className="text-xs text-slate-500">
                                By{" "}
                                {item
                                  .creator
                                  ?.username ||
                                  "Unknown"}{" "}
                                •
                                ID:{" "}
                                {
                                  item._id
                                }
                              </p>
                            </div>
                          </div>
                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-2.5 py-1 rounded-md font-mono font-bold uppercase">
                            {
                              item.searchType
                            }
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* LOADING STATE */}
        {isLoading360 && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 font-mono gap-3">
            <div className="w-8 h-8 border-2 border-[#FF5757] border-t-transparent rounded-full animate-spin"></div>
            Compiling
            Forensics...
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: ITEM 360 FORENSICS                                */}
        {/* ========================================================= */}
        {viewMode ===
          "item" &&
          itemData &&
          !isLoading360 && (
            <div className="flex flex-col gap-6 flex-1 overflow-auto">
              <div className="flex items-center justify-between">
                <button
                  onClick={() =>
                    setViewMode(
                      "search",
                    )
                  }
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                >
                  <ArrowLeft
                    size={
                      16
                    }
                  />{" "}
                  Back
                  to
                  Search
                  Results
                </button>
              </div>

              {/* ITEM & CREATOR HEADER CARD */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Package
                    size={
                      150
                    }
                  />
                </div>

                {/* CREATOR DETAILS */}
                <div className="border-b md:border-b-0 md:border-r border-slate-800 pb-6 md:pb-0 md:pr-6 flex flex-col justify-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                    Uploader
                    /
                    Owner
                  </p>
                  <div
                    className="flex items-center gap-4 cursor-pointer group"
                    onClick={() =>
                      loadUser360(
                        itemData
                          .item
                          .creator
                          ?._id,
                      )
                    }
                  >
                    <div className="w-16 h-16 bg-slate-800 rounded-full border border-slate-700 overflow-hidden">
                      {itemData
                        .item
                        .creator
                        ?.profileImage ? (
                        <img
                          src={
                            itemData
                              .item
                              .creator
                              .profileImage
                          }
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                          <UserIcon
                            size={
                              24
                            }
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-[#FF5757] transition-colors mb-1">
                        {itemData
                          .item
                          .creator
                          ?.username ||
                          "Unknown"}
                      </h3>
                      <p className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 w-max">
                        ID:{" "}
                        {
                          itemData
                            .item
                            .creator
                            ?._id
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* ITEM DETAILS */}
                <div className="flex flex-col justify-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                    Content
                    Metadata
                  </p>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {itemData
                      .item
                      .title ||
                      "Untitled"}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-2 py-0.5 rounded font-mono font-bold uppercase">
                      {
                        itemData.itemType
                      }
                    </span>
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2 py-0.5 rounded font-mono font-bold">
                      ₦
                      {itemData
                        .item
                        .price ||
                        itemData
                          .item
                          .priceInUSDT ||
                        0}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>
                      <span className="text-slate-500">
                        Item
                        ID:
                      </span>{" "}
                      <span className="font-mono text-slate-300">
                        {
                          itemData
                            .item
                            ._id
                        }
                      </span>
                    </p>
                    <p className="flex items-center gap-1">
                      <Clock
                        size={
                          12
                        }
                        className="text-slate-500"
                      />{" "}
                      Created:{" "}
                      {new Date(
                        itemData
                          .item
                          .createdAt,
                      ).toLocaleString()}
                    </p>
                  </div>

                  {/* CLOUDFLARE SAVER: EXPLICIT MEDIA LOAD */}
                  <div className="mt-5 border-t border-slate-800/50 pt-4">
                    <button
                      onClick={() =>
                        setViewingMedia(
                          itemData.item,
                        )
                      }
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 w-max shadow-sm"
                    >
                      <Eye
                        size={
                          16
                        }
                        className="text-blue-400"
                      />{" "}
                      Load
                      Media
                      Content
                    </button>
                    <p className="text-[10px] text-slate-500 mt-2">
                      Content
                      hidden
                      by
                      default
                      to
                      conserve
                      Cloudflare
                      bandwidth.
                    </p>
                  </div>
                </div>
              </div>

              {/* FANS ACCESS LEDGER */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col flex-1 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Access
                      Ledger
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Showing{" "}
                      {
                        filteredFans.length
                      }{" "}
                      successful
                      transactions
                      for
                      this
                      item.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    {/* ROLE-BASED ACCESS BUTTON */}
                    {isHighLevelAdmin ? (
                      <button
                        onClick={() =>
                          setViewMode(
                            "approvals",
                          )
                        }
                        className="w-full sm:w-auto bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shadow-sm"
                      >
                        <ShieldAlert
                          size={
                            16
                          }
                        />
                        Review
                        Approvals{" "}
                        {pendingApprovals.length >
                        0
                          ? `(${pendingApprovals.length})`
                          : ""}
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setShowGrantAccessModal(
                            true,
                          )
                        }
                        className="w-full sm:w-auto bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shadow-sm"
                      >
                        <UserPlus
                          size={
                            16
                          }
                        />{" "}
                        Request
                        Manual
                        Access
                      </button>
                    )}

                    <div className="relative w-full sm:w-64">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                        size={
                          16
                        }
                      />
                      <input
                        type="text"
                        placeholder="Filter fans by name..."
                        value={
                          fanSearchQuery
                        }
                        onChange={(
                          e,
                        ) =>
                          setFanSearchQuery(
                            e
                              .target
                              .value,
                          )
                        }
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg py-2 pl-9 pr-3 focus:outline-none focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto p-0">
                  {filteredFans.length >
                  0 ? (
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-900/50 border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-4">
                            Fan
                            Details
                          </th>
                          <th className="px-6 py-4">
                            Purchase
                            Date
                          </th>
                          <th className="px-6 py-4">
                            Type
                          </th>
                          <th className="px-6 py-4">
                            Method
                          </th>
                          <th className="px-6 py-4 font-mono text-right">
                            Amount
                            (₦)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFans.map(
                          (
                            txn,
                            idx,
                          ) => (
                            <tr
                              key={
                                idx
                              }
                              className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div
                                  className="flex items-center gap-3 cursor-pointer group"
                                  onClick={() =>
                                    loadUser360(
                                      txn
                                        .user
                                        ?._id,
                                    )
                                  }
                                >
                                  <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex-shrink-0">
                                    {txn
                                      .user
                                      ?.profileImage ? (
                                      <img
                                        src={
                                          txn
                                            .user
                                            .profileImage
                                        }
                                        className="w-full h-full object-cover"
                                        alt=""
                                      />
                                    ) : (
                                      <UserIcon
                                        size={
                                          16
                                        }
                                        className="m-2 text-slate-500"
                                      />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-bold text-white group-hover:text-[#FF5757] transition-colors">
                                      {txn
                                        .user
                                        ?.username ||
                                        "Unknown User"}
                                    </p>
                                    <p className="text-[10px] font-mono text-slate-500">
                                      ID:{" "}
                                      {
                                        txn
                                          .user
                                          ?._id
                                      }
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-xs whitespace-nowrap">
                                {new Date(
                                  txn.createdAt,
                                ).toLocaleString()}
                              </td>
                              <td className="px-6 py-4">
                                <span className="bg-slate-800/50 text-slate-300 border border-slate-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">
                                  {txn.type ||
                                    "PPV"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {txn.paymentMethod ===
                                "MANUAL" ? (
                                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded text-[10px] font-bold flex items-center w-max gap-1">
                                    <ShieldAlert
                                      size={
                                        12
                                      }
                                    />{" "}
                                    SUPPORT
                                  </span>
                                ) : txn.paymentMethod ===
                                  "CRYPTO" ? (
                                  <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded text-[10px] font-bold flex items-center w-max gap-1">
                                    <Bitcoin
                                      size={
                                        12
                                      }
                                    />{" "}
                                    CRYPTO
                                  </span>
                                ) : (
                                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded text-[10px] font-bold flex items-center w-max gap-1">
                                    <CreditCard
                                      size={
                                        12
                                      }
                                    />{" "}
                                    FIAT
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400">
                                {(
                                  txn.amountPaid ||
                                  txn.amount ||
                                  0
                                ).toLocaleString()}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-slate-500">
                      <Package
                        size={
                          48
                        }
                        className="mx-auto mb-4 opacity-20"
                      />
                      <p>
                        No
                        fans
                        have
                        purchased
                        or
                        unlocked
                        this
                        item
                        yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* ========================================================= */}
        {/* VIEW 3: USER 360 MAIN DASHBOARD                           */}
        {/* ========================================================= */}
        {viewMode ===
          "user" &&
          selectedUser &&
          userData &&
          !isLoading360 && (
            <div className="flex flex-col gap-6 flex-1 overflow-auto">
              {/* Back Button & Top Actions Header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() =>
                    setViewMode(
                      "search",
                    )
                  }
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                >
                  <ArrowLeft
                    size={
                      16
                    }
                  />{" "}
                  Back
                  to
                  Search
                  Results
                </button>
                <div className="flex gap-2">
                  {/* PASSWORD RESET BUTTON - MODERATE ADMIN ACCESSIBLE */}
                  <button
                    onClick={
                      handleSendPasswordReset
                    }
                    disabled={
                      isResetLoading
                    }
                    className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 disabled:opacity-50"
                  >
                    <Key
                      size={
                        16
                      }
                    />{" "}
                    {isResetLoading
                      ? "Sending Link..."
                      : "Reset Password"}
                  </button>

                  {isHighLevelAdmin && (
                    <button
                      onClick={() =>
                        setShowSuspendModal(
                          true,
                        )
                      }
                      className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                        selectedUser.isSuspended
                          ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
                      }`}
                    >
                      {selectedUser.isSuspended ? (
                        <>
                          <Unlock
                            size={
                              16
                            }
                          />{" "}
                          Re-Activate
                          Account
                        </>
                      ) : (
                        <>
                          <Lock
                            size={
                              16
                            }
                          />{" "}
                          Suspend
                          Account
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Profile Overview Banner */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between shadow-xl">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 bg-slate-800 rounded-2xl flex-shrink-0 flex items-center justify-center border border-slate-700 overflow-hidden">
                    {selectedUser.profileImage ? (
                      <img
                        src={
                          selectedUser.profileImage
                        }
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon
                        size={
                          36
                        }
                        className="text-slate-500"
                      />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-2xl font-bold text-white">
                        {
                          selectedUser.username
                        }
                      </h2>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold ${
                          selectedUser.role ===
                          "creator"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {selectedUser.role.toUpperCase()}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded font-mono font-bold ${
                          selectedUser.isSuspended
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {selectedUser.isSuspended
                          ? "SUSPENDED"
                          : "ACTIVE"}
                      </span>
                    </div>
                    <div className="text-slate-400 text-xs flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      <p>
                        <span className="text-slate-500">
                          ID:
                        </span>{" "}
                        <span className="font-mono text-slate-300">
                          {
                            selectedUser._id
                          }
                        </span>
                      </p>
                      <p>
                        <span className="text-slate-500">
                          Email:
                        </span>{" "}
                        <span className="text-slate-300">
                          {
                            selectedUser.email
                          }
                        </span>
                      </p>
                      <p>
                        <span className="text-slate-500">
                          Phone:
                        </span>{" "}
                        <span className="text-slate-300">
                          {selectedUser.phone ||
                            "N/A"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* INTERACTIVE KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() =>
                    setActiveTab(
                      "transactions",
                    )
                  }
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:border-[#FF5757]/50 hover:bg-slate-800/30 transition-all text-left"
                >
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      {selectedUser.role ===
                      "creator"
                        ? "Total Revenue"
                        : "Total Spent"}
                    </p>
                    <p className="text-2xl font-mono font-bold text-white mt-1">
                      ₦
                      {(
                        userData
                          .activitySummary
                          ?.totalFinancialVolume ||
                        0
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                    <Wallet
                      size={
                        24
                      }
                    />
                  </div>
                </button>

                <button
                  onClick={() =>
                    setActiveTab(
                      "overview",
                    )
                  }
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:border-[#FF5757]/50 hover:bg-slate-800/30 transition-all text-left"
                >
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Total
                      Uploads
                    </p>
                    <p className="text-2xl font-mono font-bold text-white mt-1">
                      {userData
                        .activitySummary
                        ?.totalUploads ||
                        0}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                    <FileVideo
                      size={
                        24
                      }
                    />
                  </div>
                </button>

                <button
                  onClick={() =>
                    setActiveTab(
                      "transactions",
                    )
                  }
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:border-[#FF5757]/50 hover:bg-slate-800/30 transition-all text-left"
                >
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Purchases
                      Made
                    </p>
                    <p className="text-2xl font-mono font-bold text-white mt-1">
                      {userData
                        .activitySummary
                        ?.totalPurchases ||
                        0}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                    <CreditCard
                      size={
                        24
                      }
                    />
                  </div>
                </button>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Messages
                      Sent
                    </p>
                    <p className="text-2xl font-mono font-bold text-white mt-1">
                      {userData
                        .activitySummary
                        ?.totalMessagesSent ||
                        0}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-500/10 text-orange-400 rounded-xl">
                    <MessageSquare
                      size={
                        24
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-800 gap-6">
                <button
                  onClick={() =>
                    setActiveTab(
                      "overview",
                    )
                  }
                  className={`pb-3 text-sm font-bold transition-colors border-b-2 ${
                    activeTab ===
                    "overview"
                      ? "border-[#FF5757] text-white"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Uploads
                  &
                  Content
                  (
                  {userData
                    .uploads
                    ?.length ||
                    0}

                  )
                </button>
                <button
                  onClick={() =>
                    setActiveTab(
                      "transactions",
                    )
                  }
                  className={`pb-3 text-sm font-bold transition-colors border-b-2 ${
                    activeTab ===
                    "transactions"
                      ? "border-[#FF5757] text-white"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Purchases
                  &
                  Ledger
                  (
                  {userData
                    .purchases
                    ?.length ||
                    0}

                  )
                </button>
                <button
                  onClick={() =>
                    setActiveTab(
                      "security",
                    )
                  }
                  className={`pb-3 text-sm font-bold transition-colors border-b-2 ${
                    activeTab ===
                    "security"
                      ? "border-[#FF5757] text-white"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  KYC
                  &
                  Account
                  Metadata
                </button>
              </div>

              {/* TAB 1: UPLOADS & CONTENT */}
              {activeTab ===
                "overview" && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  {userData
                    .uploads
                    ?.length >
                  0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {userData.uploads.map(
                        (
                          post,
                        ) => (
                          <div
                            key={
                              post._id
                            }
                            className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:border-slate-700"
                          >
                            <div>
                              <p className="text-sm font-bold text-white flex items-center gap-2">
                                {post.title ||
                                  "Untitled Content"}
                                <span
                                  className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-500 font-mono cursor-pointer hover:text-white transition-colors"
                                  onClick={() =>
                                    loadItem360(
                                      post._id,
                                    )
                                  }
                                  title="Click to view Item Forensics"
                                >
                                  ID:{" "}
                                  {
                                    post._id
                                  }
                                </span>
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                Posted:{" "}
                                {new Date(
                                  post.createdAt,
                                ).toLocaleString()}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs font-mono font-bold text-emerald-400">
                                  ₦
                                  {(
                                    post.price ||
                                    0
                                  ).toLocaleString()}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                                  {post.mediaType ||
                                    "Media"}
                                </span>
                              </div>
                            </div>

                            {/* STRICT ROLE-BASED ACTION BUTTONS */}
                            <div className="flex items-center gap-2 sm:self-end">
                              <button
                                onClick={() =>
                                  setViewingMedia(
                                    post,
                                  )
                                }
                                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                              >
                                <Eye
                                  size={
                                    14
                                  }
                                />{" "}
                                View
                              </button>

                              {isGodAdmin ? (
                                <button
                                  onClick={() =>
                                    handleDeleteContent(
                                      post._id,
                                    )
                                  }
                                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                                >
                                  <Trash2
                                    size={
                                      14
                                    }
                                  />{" "}
                                  Delete
                                </button>
                              ) : isSuperAdmin ? (
                                post.isFlagged ? (
                                  <button
                                    onClick={() =>
                                      handleDeleteContent(
                                        post._id,
                                      )
                                    }
                                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                                  >
                                    <Trash2
                                      size={
                                        14
                                      }
                                    />{" "}
                                    Delete
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    title="Requires Moderate Admin Flag to Delete"
                                    className="px-3 py-1.5 bg-slate-800 text-slate-500 rounded-lg text-xs font-bold flex items-center gap-1.5 opacity-50 cursor-not-allowed"
                                  >
                                    <Trash2
                                      size={
                                        14
                                      }
                                    />{" "}
                                    Locked
                                  </button>
                                )
                              ) : (
                                <button
                                  onClick={() =>
                                    handleFlagContent(
                                      post._id,
                                    )
                                  }
                                  disabled={
                                    post.isFlagged
                                  }
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                                    post.isFlagged
                                      ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                                      : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500"
                                  }`}
                                >
                                  <Flag
                                    size={
                                      14
                                    }
                                  />{" "}
                                  {post.isFlagged
                                    ? "Flagged"
                                    : "Request Deletion"}
                                </button>
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm text-center py-8">
                      No
                      content
                      uploaded
                      by
                      this
                      account.
                    </p>
                  )}
                </div>
              )}

              {/* TAB 2: DETAILED TRANSACTIONS LEDGER */}
              {activeTab ===
                "transactions" && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  {userData
                    .purchases
                    ?.length >
                  0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-300">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-950 border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-3 rounded-tl-lg">
                              Date
                              /
                              Time
                            </th>
                            <th className="px-4 py-3">
                              Type
                            </th>
                            <th className="px-4 py-3">
                              Method
                            </th>
                            <th className="px-4 py-3">
                              Recipient
                              /
                              Creator
                            </th>
                            <th className="px-4 py-3">
                              Item
                              ID
                            </th>
                            <th className="px-4 py-3 text-right rounded-tr-lg">
                              Amount
                              (₦)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {userData.purchases.map(
                            (
                              txn,
                              idx,
                            ) => (
                              <tr
                                key={
                                  idx
                                }
                                className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                              >
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {new Date(
                                    txn.createdAt ||
                                      txn.timestamp,
                                  ).toLocaleString()}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="bg-slate-800/50 text-slate-300 border border-slate-700 px-2 py-1 rounded text-xs font-bold tracking-wide uppercase">
                                    {txn.type ||
                                      "UNLOCK"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {txn.paymentMethod ===
                                  "MANUAL" ? (
                                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded text-[10px] font-bold tracking-wide flex items-center w-max gap-1.5">
                                      <ShieldAlert
                                        size={
                                          12
                                        }
                                      />{" "}
                                      SUPPORT
                                    </span>
                                  ) : txn.paymentMethod ===
                                    "CRYPTO" ? (
                                    <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded text-[10px] font-bold tracking-wide flex items-center w-max gap-1.5">
                                      <Bitcoin
                                        size={
                                          12
                                        }
                                      />{" "}
                                      CRYPTO
                                    </span>
                                  ) : (
                                    <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded text-[10px] font-bold tracking-wide flex items-center w-max gap-1.5">
                                      <CreditCard
                                        size={
                                          12
                                        }
                                      />{" "}
                                      FIAT
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-medium text-white">
                                  {txn.recipientName ||
                                    "Unknown"}
                                </td>
                                <td
                                  className="px-4 py-3 font-mono text-[11px] text-slate-500 hover:text-blue-400 cursor-pointer transition-colors"
                                  onClick={() =>
                                    loadItem360(
                                      txn.contentId ||
                                        txn._id,
                                    )
                                  }
                                >
                                  {txn.contentId ||
                                    txn._id}
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                                  {(
                                    txn.amount ||
                                    txn.displayPrice ||
                                    0
                                  ).toLocaleString()}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm text-center py-8">
                      No
                      purchase
                      or
                      billing
                      records
                      found.
                    </p>
                  )}
                </div>
              )}

              {/* TAB 3: KYC & METADATA */}
              {activeTab ===
                "security" && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 max-w-xl">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                    <span className="text-sm text-slate-400">
                      KYC
                      Verification
                      Status
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded font-mono font-bold border ${
                        selectedUser.kycStatus ===
                        "approved"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {selectedUser.kycStatus ||
                        "UNVERIFIED"}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                    <span className="text-sm text-slate-400">
                      Account
                      Registration
                      Date
                    </span>
                    <span className="text-sm font-mono text-white">
                      {new Date(
                        selectedUser.createdAt,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

        {/* MEDIA VIEWER MODAL */}
        {viewingMedia && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full flex flex-col shadow-2xl max-h-[90vh]">
              <div className="flex justify-between items-center p-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {viewingMedia.title ||
                      "Content Preview"}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    ID:{" "}
                    {
                      viewingMedia._id
                    }
                  </p>
                </div>
                <button
                  onClick={() =>
                    setViewingMedia(
                      null,
                    )
                  }
                  className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-xl transition-colors"
                >
                  <X
                    size={
                      20
                    }
                  />
                </button>
              </div>
              <div className="p-6 flex-1 overflow-auto flex items-center justify-center bg-black/50">
                {viewingMedia.mediaUrl?.match(
                  /\.(mp4|webm|ogg)$/i,
                ) ||
                viewingMedia.mediaType ===
                  "video" ? (
                  <video
                    src={
                      viewingMedia.mediaUrl
                    }
                    controls
                    autoPlay
                    className="max-w-full max-h-[60vh] rounded-lg shadow-xl"
                  />
                ) : (
                  <img
                    src={
                      viewingMedia.mediaUrl ||
                      "https://via.placeholder.com/600x400?text=No+Media+Found"
                    }
                    alt="Content"
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-xl"
                  />
                )}
              </div>
              <div className="p-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() =>
                    setViewingMedia(
                      null,
                    )
                  }
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition-colors"
                >
                  Close
                  Viewer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUSPENSION CONFIRMATION MODAL */}
        {showSuspendModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert
                    className="text-[#FF5757]"
                    size={
                      20
                    }
                  />{" "}
                  Confirm
                  Action
                </h3>
                <button
                  onClick={() =>
                    setShowSuspendModal(
                      false,
                    )
                  }
                  className="text-slate-500 hover:text-white"
                >
                  <X
                    size={
                      20
                    }
                  />
                </button>
              </div>
              <p className="text-slate-300 text-sm">
                Are
                you
                sure
                you
                want
                to{" "}
                <strong className="text-white">
                  {selectedUser?.isSuspended
                    ? "re-activate"
                    : "suspend"}
                </strong>{" "}
                the
                account
                for{" "}
                <span className="text-[#FF5757] font-bold">
                  {
                    selectedUser?.username
                  }
                </span>

                ?
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() =>
                    setShowSuspendModal(
                      false,
                    )
                  }
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={
                    handleToggleUserStatus
                  }
                  disabled={
                    isActionLoading
                  }
                  className="px-5 py-2 bg-[#FF5757] hover:bg-rose-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-[#FF5757]/20 disabled:opacity-50"
                >
                  {isActionLoading
                    ? "Updating..."
                    : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODIFIED REQUEST MANUAL ACCESS MODAL (NEW WORKFLOW) */}
        {showGrantAccessModal && (
          <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldAlert
                    className="text-amber-400"
                    size={
                      20
                    }
                  />{" "}
                  Request
                  Manual
                  Access
                </h3>
                <button
                  onClick={() =>
                    setShowGrantAccessModal(
                      false,
                    )
                  }
                  className="text-slate-500 hover:text-white"
                >
                  <X
                    size={
                      20
                    }
                  />
                </button>
              </div>
              <form
                onSubmit={
                  handleRequestAccess
                }
                className="space-y-4 pt-2"
              >
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-2">
                  <p className="text-amber-400 text-xs font-medium leading-relaxed">
                    As
                    a
                    Moderate
                    Admin,
                    you
                    cannot
                    grant
                    access
                    directly.
                    This
                    form
                    will
                    submit
                    an
                    unlock
                    request
                    to
                    the
                    Super
                    Admin
                    queue
                    for
                    review.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Fan
                    User
                    ID
                    or
                    Email
                  </label>
                  <input
                    type="text"
                    required
                    value={
                      grantAccessData.targetUser
                    }
                    onChange={(
                      e,
                    ) =>
                      setGrantAccessData(
                        {
                          ...grantAccessData,
                          targetUser:
                            e
                              .target
                              .value,
                        },
                      )
                    }
                    placeholder="e.g., user@example.com"
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-2 px-3 focus:outline-none focus:border-amber-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Access
                    Type
                  </label>
                  <select
                    value={
                      grantAccessData.accessType
                    }
                    onChange={(
                      e,
                    ) =>
                      setGrantAccessData(
                        {
                          ...grantAccessData,
                          accessType:
                            e
                              .target
                              .value,
                        },
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-2 px-3 focus:outline-none focus:border-amber-500 text-sm"
                  >
                    <option value="PPV">
                      PPV
                      (Pay-Per-View)
                    </option>
                    <option value="SUB">
                      SUB
                      (Subscription
                      Unlock)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Justification
                    (Required
                    for
                    Super
                    Admin)
                  </label>
                  <textarea
                    required
                    value={
                      grantAccessData.justification
                    }
                    onChange={(
                      e,
                    ) =>
                      setGrantAccessData(
                        {
                          ...grantAccessData,
                          justification:
                            e
                              .target
                              .value,
                        },
                      )
                    }
                    placeholder="e.g. User provided Paystack receipt #12345, server timed out during webhook."
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-2 px-3 focus:outline-none focus:border-amber-500 text-sm h-20 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setShowGrantAccessModal(
                        false,
                      )
                    }
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isActionLoading ||
                      !grantAccessData.targetUser.trim() ||
                      !grantAccessData.justification.trim()
                    }
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-colors"
                  >
                    {isActionLoading
                      ? "Submitting..."
                      : "Submit for Approval"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

export default User360;
