import React, {
  useState,
  useEffect,
} from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Lock,
  Image as ImageIcon,
} from "lucide-react";

const Inbox =
  () => {
    const [
      inbox,
      setInbox,
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
              ) ||
              localStorage.getItem(
                "token",
              );
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
            setInbox(
              res.data,
            );
          } catch (error) {
            console.error(
              "Failed to load inbox",
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

    if (
      isLoading
    ) {
      return (
        <div className="text-center p-8 text-slate-500 animate-pulse">
          Loading
          secure
          inbox...
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto mt-8">
        <h2 className="text-2xl font-bold text-white mb-6 px-4">
          Messages
        </h2>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {inbox.length ===
          0 ? (
            <div className="p-8 text-center text-slate-500">
              No
              messages
              yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-800/50">
              {inbox.map(
                (
                  chat,
                ) => (
                  <li
                    key={
                      chat._id
                    }
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <Link
                      to={`/messages/${chat._id}`}
                      className="flex items-center p-4"
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 mr-4">
                        {chat
                          .otherUser
                          .profileImage ? (
                          <img
                            src={
                              chat
                                .otherUser
                                .profileImage
                            }
                            alt="avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                            {chat.otherUser.username
                              .charAt(
                                0,
                              )
                              .toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Message Preview */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="text-slate-200 font-semibold truncate">
                            {
                              chat
                                .otherUser
                                .username
                            }
                          </h3>
                          <span className="text-xs text-slate-500">
                            {new Date(
                              chat.updatedAt,
                            ).toLocaleDateString(
                              undefined,
                              {
                                month:
                                  "short",
                                day: "numeric",
                              },
                            )}
                          </span>
                        </div>

                        <p className="text-sm text-slate-400 truncate flex items-center">
                          {chat
                            .lastMessage
                            ?.isLockedPPV && (
                            <Lock
                              size={
                                14
                              }
                              className="mr-1 text-[#FF5757]"
                            />
                          )}
                          {!chat
                            .lastMessage
                            ?.text &&
                          chat
                            .lastMessage
                            ?.isLockedPPV
                            ? "Locked Media"
                            : chat
                                .lastMessage
                                ?.text}
                        </p>
                      </div>
                    </Link>
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      </div>
    );
  };

export default Inbox;
