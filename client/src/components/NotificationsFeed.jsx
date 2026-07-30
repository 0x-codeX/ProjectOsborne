import React, {
  useState,
  useEffect,
} from "react";
import {
  Bell,
  PlaySquare,
  ShieldAlert,
  CreditCard,
  Sparkles,
  Check,
} from "lucide-react";

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

    useEffect(() => {
      fetchNotifications();
    }, []);

    const fetchNotifications =
      async () => {
        try {
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const response =
            await fetch(
              "http://localhost:5000/api/notifications",
              {
                headers:
                  {
                    Authorization: `Bearer ${token}`,
                  },
              },
            );
          if (
            response.ok
          ) {
            const data =
              await response.json();
            setNotifications(
              data,
            );

            // If there are unread notifications, mark them as read in the background
            if (
              data.some(
                (
                  n,
                ) =>
                  !n.isRead,
              )
            ) {
              markAsRead(
                token,
              );
            }
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
      async (
        token,
      ) => {
        await fetch(
          "http://localhost:5000/api/notifications/read",
          {
            method:
              "PUT",
            headers:
              {
                Authorization: `Bearer ${token}`,
              },
          },
        );
      };

    const getIconForType =
      (
        type,
      ) => {
        switch (
          type
        ) {
          case "NEW_CONTENT":
            return (
              <PlaySquare
                size={
                  20
                }
                className="text-blue-400"
              />
            );
          case "SYSTEM":
            return (
              <ShieldAlert
                size={
                  20
                }
                className="text-nippy-coral"
              />
            );
          case "SUBSCRIPTION_RENEWAL":
            return (
              <CreditCard
                size={
                  20
                }
                className="text-green-400"
              />
            );
          case "RECOMMENDATION":
            return (
              <Sparkles
                size={
                  20
                }
                className="text-purple-400"
              />
            );
          default:
            return (
              <Bell
                size={
                  20
                }
                className="text-gray-400"
              />
            );
        }
      };

    if (
      loading
    ) {
      return (
        <div className="flex justify-center items-center h-64 text-nippy-coral animate-pulse">
          Loading
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
              ) => (
                <div
                  key={
                    notif._id
                  }
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                    notif.isRead
                      ? "bg-nippy-obsidian border-gray-800/50 opacity-75"
                      : "bg-gray-800/50 border-gray-700 shadow-lg shadow-black/20"
                  }`}
                >
                  {/* Icon Container */}
                  <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center shrink-0 border border-gray-800">
                    {getIconForType(
                      notif.type,
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3
                      className={`text-sm font-bold ${notif.isRead ? "text-gray-300" : "text-white"}`}
                    >
                      {
                        notif.title
                      }
                    </h3>
                    <p className="text-sm text-gray-400 mt-1 leading-snug">
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

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-nippy-coral shrink-0 mt-2" />
                  )}
                </div>
              ),
            )}
          </div>
        )}
      </div>
    );
  };

export default NotificationsFeed;
