import React, {
  useState,
  useEffect,
} from "react";
import api from "../utils/api";
import {
  Bell,
  Gift,
  BadgeDollarSign,
  LockOpen,
  Info,
  CheckCheck,
  PlayCircle,
  UserPlus,
  Loader2,
} from "lucide-react";

const CreatorNotifications =
  () => {
    const [
      notifications,
      setNotifications,
    ] =
      useState(
        [],
      );
    const [
      loading,
      setLoading,
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

    useEffect(() => {
      fetchNotifications();
    }, []);

    const fetchNotifications =
      async () => {
        try {
          const res =
            await api.get(
              "/notifications",
            );
          setNotifications(
            res.data,
          );
        } catch (err) {
          setError(
            "Failed to load alerts.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      };

    const handleMarkAllRead =
      async () => {
        try {
          await api.put(
            "/notifications/read",
          );
          // Update local state instantly so UI feels fast
          setNotifications(
            (
              prev,
            ) =>
              prev.map(
                (
                  notif,
                ) => ({
                  ...notif,
                  isRead: true,
                }),
              ),
          );
        } catch (err) {
          console.error(
            "Failed to mark read",
            err,
          );
        }
      };

    // Dynamic UI generator based on Notification Type
    const getNotificationStyle =
      (
        type,
      ) => {
        switch (
          type
        ) {
          case "GIFT_SENT":
          case "LIVE_GIFT":
            return {
              icon: Gift,
              color:
                "text-purple-500",
              bg: "bg-purple-500/10",
              border:
                "border-purple-500/30",
            };
          case "PAYMENT_SUCCESS":
          case "SUBSCRIPTION_RENEWAL":
            return {
              icon: BadgeDollarSign,
              color:
                "text-emerald-500",
              bg: "bg-emerald-500/10",
              border:
                "border-emerald-500/30",
            };
          case "PPV_UNLOCK":
            return {
              icon: LockOpen,
              color:
                "text-blue-500",
              bg: "bg-blue-500/10",
              border:
                "border-blue-500/30",
            };
          case "GO_LIVE":
          case "NEW_CONTENT":
            return {
              icon: PlayCircle,
              color:
                "text-[#FF5757]",
              bg: "bg-[#FF5757]/10",
              border:
                "border-[#FF5757]/30",
            };
          case "FOLLOW":
            return {
              icon: UserPlus,
              color:
                "text-rose-400",
              bg: "bg-rose-400/10",
              border:
                "border-rose-400/30",
            };
          default:
            return {
              icon: Info,
              color:
                "text-slate-400",
              bg: "bg-slate-800",
              border:
                "border-slate-700",
            };
        }
      };

    if (
      loading
    ) {
      return (
        <div className="flex justify-center items-center h-64 text-[#FF5757]">
          <Loader2
            className="animate-spin"
            size={
              40
            }
          />
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto py-8 px-4 md:px-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Bell className="text-[#FF5757]" />{" "}
              Alerts
              &
              Activity
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Keep
              track
              of
              your
              earnings
              and
              fans.
            </p>
          </div>

          {notifications.some(
            (
              n,
            ) =>
              !n.isRead,
          ) && (
            <button
              onClick={
                handleMarkAllRead
              }
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-slate-700"
            >
              <CheckCheck
                size={
                  16
                }
                className="text-emerald-500"
              />
              Mark
              all
              as
              read
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-500 p-4 rounded-xl border border-red-500/20 mb-6">
            {
              error
            }
          </div>
        )}

        {notifications.length ===
        0 ? (
          <div className="text-center bg-slate-900/50 border border-slate-800 rounded-3xl p-12">
            <Bell
              className="mx-auto text-slate-600 mb-4"
              size={
                48
              }
            />
            <h3 className="text-xl font-bold text-white mb-2">
              It's
              quiet
              in
              here
            </h3>
            <p className="text-slate-400">
              When
              fans
              subscribe
              or
              send
              gifts,
              you'll
              see
              it
              here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map(
              (
                notif,
              ) => {
                const style =
                  getNotificationStyle(
                    notif.type,
                  );
                const Icon =
                  style.icon;

                return (
                  <div
                    key={
                      notif._id
                    }
                    className={`flex gap-4 p-4 md:p-5 rounded-2xl border transition-all ${
                      notif.isRead
                        ? "bg-slate-900/50 border-slate-800 opacity-70"
                        : `bg-slate-900 border-l-4 border-t-slate-800 border-r-slate-800 border-b-slate-800 shadow-lg ${style.border.replace("border-", "border-l-")}`
                    }`}
                  >
                    {/* Left Side: Avatar or Icon */}
                    <div className="shrink-0 relative">
                      {notif
                        .sender
                        ?.profileImage ? (
                        <img
                          src={
                            notif
                              .sender
                              .profileImage
                          }
                          alt={
                            notif
                              .sender
                              .username
                          }
                          className="w-12 h-12 rounded-full object-cover border border-slate-700"
                        />
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${style.bg}`}
                        >
                          <Icon
                            className={
                              style.color
                            }
                            size={
                              24
                            }
                          />
                        </div>
                      )}

                      {/* Tiny badge over avatar if it's a user action */}
                      {notif.sender && (
                        <div
                          className={`absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-950 border border-slate-800`}
                        >
                          <Icon
                            className={
                              style.color
                            }
                            size={
                              10
                            }
                          />
                        </div>
                      )}
                    </div>

                    {/* Right Side: Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h4
                          className={`text-base font-bold truncate ${notif.isRead ? "text-slate-300" : "text-white"}`}
                        >
                          {
                            notif.title
                          }
                        </h4>
                        <span className="text-xs text-slate-500 whitespace-nowrap mt-1 font-mono">
                          {new Date(
                            notif.createdAt,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {
                          notif.message
                        }
                      </p>

                      {notif.actionUrl && (
                        <a
                          href={
                            notif.actionUrl
                          }
                          className={`inline-block mt-3 text-xs font-bold px-3 py-1.5 rounded-lg ${style.bg} ${style.color} hover:opacity-80 transition-opacity`}
                        >
                          View
                          Details
                        </a>
                      )}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>
    );
  };

export default CreatorNotifications;
