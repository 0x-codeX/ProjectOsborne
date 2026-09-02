import React, {
  useState,
  useEffect,
} from "react";
import {
  Search,
  Lock,
  CheckCircle2,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api"; // IRONCLAD FIX: Using global interceptor

const FanInbox =
  () => {
    const navigate =
      useNavigate();
    const [
      searchQuery,
      setSearchQuery,
    ] =
      useState(
        "",
      );
    const [
      conversations,
      setConversations,
    ] =
      useState(
        [],
      );
    const [
      isLoading,
      setIsLoading,
    ] =
      useState(
        true,
      );

    useEffect(() => {
      const fetchInbox =
        async () => {
          try {
            // IRONCLAD FIX: No token fetching, no headers, no manual error routing.
            // The API interceptor handles all network security implicitly.
            const res =
              await api.get(
                "/messages/inbox",
              );

            // Sort conversations so the most recent is always at the top
            const sortedChats =
              res.data.sort(
                (
                  a,
                  b,
                ) => {
                  const dateA =
                    new Date(
                      a
                        .lastMessage
                        ?.createdAt ||
                        0,
                    );
                  const dateB =
                    new Date(
                      b
                        .lastMessage
                        ?.createdAt ||
                        0,
                    );
                  return (
                    dateB -
                    dateA
                  );
                },
              );

            setConversations(
              sortedChats,
            );
          } catch (error) {
            console.error(
              "Failed to load inbox:",
              error,
            );
          } finally {
            setIsLoading(
              false,
            );
          }
        };
      fetchInbox();
    }, []);

    const filteredChats =
      conversations.filter(
        (
          chat,
        ) => {
          const creatorName =
            chat
              .creator
              ?.username ||
            "";
          return creatorName
            .toLowerCase()
            .includes(
              searchQuery.toLowerCase(),
            );
        },
      );

    // Helper function to format time like WhatsApp (e.g., "10:45 AM" or "Yesterday")
    const formatTime =
      (
        dateString,
      ) => {
        if (
          !dateString
        )
          return "";
        const date =
          new Date(
            dateString,
          );
        const today =
          new Date();
        const isToday =
          date.getDate() ===
            today.getDate() &&
          date.getMonth() ===
            today.getMonth() &&
          date.getFullYear() ===
            today.getFullYear();

        if (
          isToday
        ) {
          return date.toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute:
                "2-digit",
            },
          );
        }
        return date.toLocaleDateString();
      };

    return (
      <div className="w-full max-w-3xl mx-auto flex flex-col h-full min-h-screen bg-slate-950">
        <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-4 md:pt-6">
          
          <div className="relative w-full">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"
              size={
                18
              }
            />
            <input
              type="text"
              placeholder="Search creators..."
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
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
            />
          </div>
        </div>

        <div className="flex-grow overflow-y-auto pb-24 md:pb-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-emerald-500">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : filteredChats.length ===
            0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <p>
                No
                messages
                found.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {filteredChats.map(
                (
                  chat,
                ) => (
                  <div
                    key={
                      chat._id
                    }
                    onClick={() =>
                      navigate(
                        `/messages/${chat._id}`,
                      )
                    }
                    className="flex items-center gap-4 p-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={
                          chat
                            .creator
                            ?.profilePicture ||
                          `https://ui-avatars.com/api/?name=${chat.creator?.username}`
                        }
                        alt={
                          chat
                            .creator
                            ?.username
                        }
                        className="w-14 h-14 rounded-full object-cover border border-slate-700"
                      />
                    </div>

                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h2 className="text-base font-bold text-slate-200 truncate flex items-center gap-1">
                          {
                            chat
                              .creator
                              ?.username
                          }
                          <CheckCircle2
                            size={
                              14
                            }
                            className="text-emerald-500"
                          />
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        {chat
                          .lastMessage
                          ?.isLockedPPV && (
                          <span className="flex items-center gap-1 text-xs font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-md">
                            <Lock
                              size={
                                10
                              }
                            />{" "}
                            PPV
                          </span>
                        )}
                        <p
                          className={`text-sm truncate ${
                            chat.unreadCount >
                            0
                              ? "text-slate-200 font-semibold"
                              : "text-slate-500"
                          }`}
                        >
                          {chat
                            .lastMessage
                            ?.text ||
                            "Started a conversation"}
                        </p>
                      </div>
                    </div>

                    {/* IRONCLAD UI: WhatsApp style right-column for date and badges */}
                    <div className="flex flex-col items-end justify-center min-w-[50px] gap-1.5">
                      <span
                        className={`text-xs whitespace-nowrap ${
                          chat.unreadCount >
                          0
                            ? "text-emerald-500 font-bold"
                            : "text-slate-500"
                        }`}
                      >
                        {formatTime(
                          chat
                            .lastMessage
                            ?.createdAt,
                        )}
                      </span>
                      {chat.unreadCount >
                      0 ? (
                        <div className="bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-[20px] px-1.5 flex items-center justify-center rounded-full">
                          {
                            chat.unreadCount
                          }
                        </div>
                      ) : (
                        <ChevronRight
                          size={
                            18
                          }
                          className="text-slate-600 flex-shrink-0"
                        />
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

export default FanInbox;
