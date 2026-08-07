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
import axios from "axios";

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
            const token =
              localStorage.getItem(
                "nippy_token",
              );
            // Assuming your getInbox controller returns a list of conversations populated with creator info
            const res =
              await axios.get(
                "/api/messages/inbox",
                {
                  headers:
                    {
                      Authorization: `Bearer ${token}`,
                    },
                },
              );
            setConversations(
              res.data,
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

    return (
      <div className="w-full max-w-3xl mx-auto flex flex-col h-full min-h-screen bg-nippy-onyx">
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
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
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
                      chat._id
                    }
                    onClick={() =>
                      navigate(
                        `/messages/${chat._id}`,
                      )
                    }
                    className="flex items-center gap-4 p-4 hover:bg-gray-800/30 transition-colors cursor-pointer"
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
                        className="w-14 h-14 rounded-full object-cover border border-gray-700"
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
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {new Date(
                            chat
                              .lastMessage
                              ?.createdAt,
                          ).toLocaleDateString()}
                        </span>
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
                        <p className="text-sm truncate text-gray-500">
                          {chat
                            .lastMessage
                            ?.text ||
                            "Started a conversation"}
                        </p>
                      </div>
                    </div>

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
