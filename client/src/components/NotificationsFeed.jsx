import React, {
  useState,
  useEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  PlaySquare,
  ShieldAlert,
  CreditCard,
  Sparkles,
  Radio,
  MessageCircleHeart,
  Unlock,
  Tag,
  X, // Added the X icon for dismissal
} from "lucide-react";
import api from "../utils/api";

const NotificationsFeed =
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
    const navigate =
      useNavigate();

    // Load dismissed live notifications from local memory
    const [
      dismissedLives,
      setDismissedLives,
    ] =
      useState(
        () => {
          return JSON.parse(
            localStorage.getItem(
              "nippy_dismissed_lives",
            ) ||
              "[]",
          );
        },
      );

    useEffect(() => {
      fetchNotifications();
    }, [
      dismissedLives,
    ]); // Re-sort if a notification is dismissed

    // THE STICKY ENGINE
    const isSticky =
      (
        notif,
      ) => {
        if (
          notif.type !==
          "GO_LIVE"
        )
          return false;
        if (
          dismissedLives.includes(
            notif._id,
          )
        )
          return false; // Unpin if dismissed or clicked

        // Failsafe: Streams rarely last over 12 hours. Auto-unpin old notifications so the feed doesn't break.
        const twelveHoursInMs =
          12 *
          60 *
          60 *
          1000;
        const isRecent =
          new Date() -
            new Date(
              notif.createdAt,
            ) <
          twelveHoursInMs;
        return isRecent;
      };

    const fetchNotifications =
      async () => {
        try {
          const response =
            await api.get(
              "/notifications",
            );
          const rawData =
            response
              .data
              .notifications ||
            response.data ||
            [];

          // Sort: Sticky GO_LIVE first, then chronological
          const sortedData =
            rawData.sort(
              (
                a,
                b,
              ) => {
                const aIsSticky =
                  isSticky(
                    a,
                  );
                const bIsSticky =
                  isSticky(
                    b,
                  );

                if (
                  aIsSticky &&
                  !bIsSticky
                )
                  return -1;
                if (
                  !aIsSticky &&
                  bIsSticky
                )
                  return 1;

                return (
                  new Date(
                    b.createdAt,
                  ) -
                  new Date(
                    a.createdAt,
                  )
                );
              },
            );

          setNotifications(
            sortedData,
          );

          if (
            sortedData.some(
              (
                n,
              ) =>
                !n.isRead &&
                !n.read,
            )
          ) {
            markAsRead();
          }
        } catch (error) {
          console.error(
            "Failed to load notifications",
            error,
          );
        } finally {
          setLoading(
            false,
          );
        }
      };

    const markAsRead =
      async () => {
        try {
          await api.put(
            "/notifications/mark-read",
          );
          window.dispatchEvent(
            new Event(
              "notificationsRead",
            ),
          );
        } catch (error) {
          console.error(
            "Failed to mark notifications as read",
            error,
          );
        }
      };

    const handleNotificationClick =
      (
        notif,
      ) => {
        // If they click a GO_LIVE notification to join, dismiss it so it unpins
        if (
          notif.type ===
          "GO_LIVE"
        ) {
          const updated =
            [
              ...dismissedLives,
              notif._id,
            ];
          setDismissedLives(
            updated,
          );
          localStorage.setItem(
            "nippy_dismissed_lives",
            JSON.stringify(
              updated,
            ),
          );
        }

        if (
          notif.actionUrl
        ) {
          navigate(
            notif.actionUrl,
          );
        }
      };

    const handleDismissLive =
      (
        e,
        notifId,
      ) => {
        e.stopPropagation(); // Stops the click from triggering handleNotificationClick (which would navigate)
        const updated =
          [
            ...dismissedLives,
            notifId,
          ];
        setDismissedLives(
          updated,
        );
        localStorage.setItem(
          "nippy_dismissed_lives",
          JSON.stringify(
            updated,
          ),
        );
      };

    const renderIcon =
      (
        notif,
      ) => {
        const sticky =
          isSticky(
            notif,
          );

        if (
          notif
            .sender
            ?.profileImage
        ) {
          return (
            <div className="relative shrink-0">
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
                className={`w-10 h-10 rounded-full object-cover border ${
                  sticky
                    ? "border-red-500 animate-pulse"
                    : "border-gray-700"
                }`}
              />
              {sticky && (
                <div className="absolute -bottom-2 -right-2 bg-red-500 rounded-full p-1 border border-black">
                  <Radio
                    size={
                      10
                    }
                    className="text-white"
                  />
                </div>
              )}
            </div>
          );
        }

        const iconProps =
          {
            size: 20,
            className:
              "text-gray-400",
          };
        let IconComponent =
          Bell;

        switch (
          notif.type
        ) {
          case "NEW_CONTENT":
            IconComponent =
              PlaySquare;
            iconProps.className =
              "text-blue-400";
            break;
          case "SYSTEM":
            IconComponent =
              ShieldAlert;
            iconProps.className =
              "text-red-500";
            break;
          case "SUBSCRIPTION_RENEWAL":
          case "PAYMENT_SUCCESS":
            IconComponent =
              CreditCard;
            iconProps.className =
              "text-emerald-400";
            break;
          case "RECOMMENDATION":
            IconComponent =
              Sparkles;
            iconProps.className =
              "text-purple-400";
            break;
          case "GO_LIVE":
            IconComponent =
              Radio;
            iconProps.className =
              sticky
                ? "text-red-500"
                : "text-gray-500";
            break;
          case "WELCOME_MESSAGE":
            IconComponent =
              MessageCircleHeart;
            iconProps.className =
              "text-pink-400";
            break;
          case "PPV_UNLOCK":
            IconComponent =
              Unlock;
            iconProps.className =
              "text-yellow-400";
            break;
          case "NIPPY_OFFER":
            IconComponent =
              Tag;
            iconProps.className =
              "text-emerald-400";
            break;
          default:
            break;
        }

        return (
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
              sticky
                ? "bg-red-500/10 border-red-500/50"
                : "bg-gray-900 border-gray-800"
            }`}
          >
            <IconComponent
              {...iconProps}
            />
          </div>
        );
      };

    if (
      loading
    ) {
      return (
        <div className="flex justify-center items-center h-64 text-emerald-500 animate-pulse font-bold">
          Decrypting
          alerts...
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-200">
            Notifications
          </h1>
        </div>

        {notifications.length ===
        0 ? (
          <div className="text-center text-gray-500 mt-20 flex flex-col items-center">
            <Bell
              size={
                48
              }
              className="mb-4 opacity-20"
            />
            <p>
              You're
              all
              caught
              up!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(
              (
                notif,
              ) => {
                const sticky =
                  isSticky(
                    notif,
                  );
                const isUnread =
                  notif.isRead ===
                    false ||
                  notif.read ===
                    false;

                return (
                  <div
                    key={
                      notif._id
                    }
                    onClick={() =>
                      handleNotificationClick(
                        notif,
                      )
                    }
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all relative overflow-hidden ${
                      notif.actionUrl
                        ? "cursor-pointer hover:bg-gray-800/80"
                        : ""
                    } ${
                      sticky
                        ? "bg-red-950/20 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                        : !isUnread
                          ? "bg-nippy-obsidian border-gray-800/50 opacity-75"
                          : "bg-gray-800/50 border-gray-700 shadow-lg shadow-black/20"
                    }`}
                  >
                    {/* Visual Flair for Active Streams */}
                    {sticky && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse"></div>
                    )}

                    {renderIcon(
                      notif,
                    )}

                    <div className="flex-1 pr-6">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-sm font-bold ${sticky ? "text-red-400" : !isUnread ? "text-gray-300" : "text-white"}`}
                        >
                          {
                            notif.title
                          }
                        </h3>
                        {sticky && (
                          <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm animate-pulse tracking-wider">
                            LIVE
                            NOW
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-400 mt-1 leading-snug whitespace-pre-wrap">
                        {
                          notif.message
                        }
                      </p>

                      <span className="text-xs text-gray-600 mt-2 block font-medium">
                        {new Date(
                          notif.createdAt,
                        ).toLocaleDateString()}{" "}
                        at{" "}
                        {new Date(
                          notif.createdAt,
                        ).toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute:
                              "2-digit",
                          },
                        )}
                      </span>
                    </div>

                    {/* THE DISMISS BUTTON (Only shows on Sticky Notifications) */}
                    {sticky && (
                      <button
                        onClick={(
                          e,
                        ) =>
                          handleDismissLive(
                            e,
                            notif._id,
                          )
                        }
                        className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors bg-black/40 rounded-full p-1"
                        title="Dismiss"
                      >
                        <X
                          size={
                            16
                          }
                        />
                      </button>
                    )}

                    {/* Standard Unread Dot */}
                    {isUnread &&
                      !sticky && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-2 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      )}
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>
    );
  };

export default NotificationsFeed;
