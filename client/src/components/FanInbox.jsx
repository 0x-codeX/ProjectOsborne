import React, {
  useState,
} from "react";
import {
  Search,
  Lock,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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

    // MOCK DATA: We will replace this with your actual backend fetch later
    const [
      conversations,
    ] =
      useState(
        [
          {
            id: "1",
            creatorName:
              "Lagos Queen",
            handle:
              "@lagosqueen",
            avatar:
              "https://i.pravatar.cc/150?u=lagos",
            lastMessage:
              "Sent a locked video",
            isPPV: true,
            price:
              "5.00",
            unread: true,
            time: "2m ago",
            isVerified: true,
          },
          {
            id: "2",
            creatorName:
              "Tech Bro Chinedu",
            handle:
              "@chinedu_dev",
            avatar:
              "https://i.pravatar.cc/150?u=chinedu",
            lastMessage:
              "Thanks for subscribing! Here is the link...",
            isPPV: false,
            price:
              "0",
            unread: false,
            time: "1h ago",
            isVerified: false,
          },
        ],
      );

    const filteredChats =
      conversations.filter(
        (
          chat,
        ) =>
          chat.creatorName
            .toLowerCase()
            .includes(
              searchQuery.toLowerCase(),
            ) ||
          chat.handle
            .toLowerCase()
            .includes(
              searchQuery.toLowerCase(),
            ),
      );

    return (
      <div className="w-full max-w-3xl mx-auto flex flex-col h-full min-h-screen bg-nippy-onyx">
        {/* HEADER & SEARCH */}
        <div className="sticky top-0 z-40 bg-nippy-obsidian/95 backdrop-blur-md border-b border-gray-800 p-4 md:pt-6">
          <h1 className="text-2xl font-bold text-slate-200 mb-4">
            Messages
          </h1>

          <div className="relative w-full">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
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
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-nippy-coral transition-colors text-sm"
            />
          </div>
        </div>

        {/* INBOX LIST */}
        <div className="flex-grow overflow-y-auto pb-24 md:pb-6">
          {filteredChats.length ===
          0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <p>
                No
                messages
                found.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {filteredChats.map(
                (
                  chat,
                ) => (
                  <div
                    key={
                      chat.id
                    }
                    onClick={() =>
                      navigate(
                        `/messages/${chat.id}`,
                      )
                    }
                    className="flex items-center gap-4 p-4 hover:bg-gray-800/30 transition-colors cursor-pointer"
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={
                          chat.avatar
                        }
                        alt={
                          chat.creatorName
                        }
                        className="w-14 h-14 rounded-full object-cover border border-gray-700"
                      />
                      {chat.unread && (
                        <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-nippy-coral border-2 border-nippy-onyx rounded-full"></div>
                      )}
                    </div>

                    {/* Message Preview */}
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h2 className="text-base font-bold text-slate-200 truncate flex items-center gap-1">
                          {
                            chat.creatorName
                          }
                          {chat.isVerified && (
                            <CheckCircle2
                              size={
                                14
                              }
                              className="text-nippy-coral"
                            />
                          )}
                        </h2>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {
                            chat.time
                          }
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {chat.isPPV ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-md">
                            <Lock
                              size={
                                10
                              }
                            />{" "}
                            {
                              chat.price
                            }{" "}
                            USDT
                          </span>
                        ) : null}
                        <p
                          className={`text-sm truncate ${chat.unread ? "text-white font-medium" : "text-gray-500"}`}
                        >
                          {
                            chat.lastMessage
                          }
                        </p>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight
                      size={
                        20
                      }
                      className="text-gray-600 flex-shrink-0"
                    />
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
