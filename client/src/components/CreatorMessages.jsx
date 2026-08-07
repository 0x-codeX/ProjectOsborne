import React, {
  useState,
  useEffect,
  useRef,
} from "react";
import axios from "axios";
import {
  Search,
  Filter,
  Star,
  Send,
  Mic,
  Lock,
  Megaphone,
  MoreVertical,
  ChevronLeft,
  MessageSquare,
  X,
  Check,
  Video,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { io } from "socket.io-client";

// KEEPING MOCK VAULT UNTIL WE BUILD YOUR CLOUDFLARE R2 MEDIA UPLOADER
const MOCK_VAULT =
  [
    {
      id: "v1",
      title:
        "Smart Contract Audit Walkthrough",
      type: "video",
      thumbnail:
        "https://images.unsplash.com/photo-1639762681485-074b7f4facce?w=150&q=80",
      fileKey:
        "mock-video-123.mp4",
    },
    {
      id: "v2",
      title:
        "Logistics Vendor List 2026",
      type: "image",
      thumbnail:
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=150&q=80",
      fileKey:
        "mock-image-456.jpg",
    },
  ];

const CreatorMessages =
  () => {
    const currentUser =
      JSON.parse(
        localStorage.getItem(
          "nippy_user",
        ) ||
          "{}",
      );
    const messagesEndRef =
      useRef(
        null,
      );

    // --- STATE ---
    const [
      inbox,
      setInbox,
    ] =
      useState(
        [],
      );
    const [
      chatHistory,
      setChatHistory,
    ] =
      useState(
        [],
      );
    const [
      activeTab,
      setActiveTab,
    ] =
      useState(
        "all",
      );
    const [
      selectedChat,
      setSelectedChat,
    ] =
      useState(
        null,
      );
    const [
      messageInput,
      setMessageInput,
    ] =
      useState(
        "",
      );
    const [
      searchQuery,
      setSearchQuery,
    ] =
      useState(
        "",
      );
    const [
      isLoadingInbox,
      setIsLoadingInbox,
    ] =
      useState(
        true,
      );
    const [
      isSending,
      setIsSending,
    ] =
      useState(
        false,
      );

    // --- VAULT DRAWER STATE ---
    const [
      showVaultDrawer,
      setShowVaultDrawer,
    ] =
      useState(
        false,
      );
    const [
      selectedVaultItem,
      setSelectedVaultItem,
    ] =
      useState(
        null,
      );
    const [
      customPrice,
      setCustomPrice,
    ] =
      useState(
        "20.00",
      );
    const [
      pendingAttachment,
      setPendingAttachment,
    ] =
      useState(
        null,
      );

    // 1. Fetch Inbox on Mount
    useEffect(() => {
      const fetchInbox =
        async () => {
          try {
            const token =
              localStorage.getItem(
                "nippy_token",
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
              "Failed to fetch inbox:",
              error,
            );
          } finally {
            setIsLoadingInbox(
              false,
            );
          }
        };
      fetchInbox();
    }, []);

    // 2. Fetch Chat History when a conversation is selected
    useEffect(() => {
      if (
        !selectedChat
      )
        return;

      const fetchMessages =
        async () => {
          try {
            const token =
              localStorage.getItem(
                "nippy_token",
              );
            const res =
              await axios.get(
                `/api/messages/${selectedChat._id}`,
                {
                  headers:
                    {
                      Authorization: `Bearer ${token}`,
                    },
                },
              );
            setChatHistory(
              res
                .data
                .messages ||
                res.data,
            );
            scrollToBottom();
          } catch (error) {
            console.error(
              "Failed to fetch messages:",
              error,
            );
          }
        };

      fetchMessages();

      // 1. Connect to socket
      const socket =
        io(
          "http://localhost:5000",
        );

      // 2. Join the room
      socket.emit(
        "join_chat",
        selectedChat._id,
      );

      // 3. Listen for new messages
      socket.on(
        "receive_message",
        (
          newMessage,
        ) => {
          setChatHistory(
            (
              prev,
            ) => {
              if (
                prev.some(
                  (
                    msg,
                  ) =>
                    msg._id ===
                    newMessage._id,
                )
              )
                return prev;
              return [
                ...prev,
                newMessage,
              ];
            },
          );
          scrollToBottom();
        },
      );

      return () => {
        socket.disconnect();
      };
    }, [
      selectedChat,
    ]);

    const scrollToBottom =
      () => {
        setTimeout(
          () => {
            messagesEndRef.current?.scrollIntoView(
              {
                behavior:
                  "smooth",
              },
            );
          },
          100,
        );
      };

    // 3. Handle Sending Message
    const handleSend =
      async (
        e,
      ) => {
        if (
          e
        )
          e.preventDefault();
        if (
          !messageInput.trim() &&
          !pendingAttachment
        )
          return;

        setIsSending(
          true,
        );
        try {
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const payload =
            {
              receiverId:
                selectedChat
                  .otherUser
                  ._id,
              conversationId:
                selectedChat._id,
              text: messageInput.trim(),
            };

          if (
            pendingAttachment
          ) {
            payload.fileKey =
              pendingAttachment.fileKey;
            payload.fileType =
              pendingAttachment.type ===
              "video"
                ? "video/mp4"
                : "image/jpeg";
            payload.priceInUSDT =
              Number(
                customPrice,
              );
          }

          const res =
            await axios.post(
              "/api/messages/send",
              payload,
              {
                headers:
                  {
                    Authorization: `Bearer ${token}`,
                  },
              },
            );

          setChatHistory(
            [
              ...chatHistory,
              res
                .data
                .data,
            ],
          );
          setMessageInput(
            "",
          );
          setPendingAttachment(
            null,
          );
          scrollToBottom();
        } catch (error) {
          alert(
            error
              .response
              ?.data
              ?.message ||
              "Failed to send message",
          );
        } finally {
          setIsSending(
            false,
          );
        }
      };

    // Filter Logic
    const filteredInbox =
      inbox
        .filter(
          (
            chat,
          ) => {
            if (
              activeTab ===
              "priority"
            )
              return (
                chat.lifetimeValue >
                100
              ); // Define Priority as LTV > 100
            return true;
          },
        )
        .filter(
          (
            chat,
          ) =>
            chat.otherUser?.username
              ?.toLowerCase()
              .includes(
                searchQuery.toLowerCase(),
              ),
        );

    return (
      <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-73px)] flex bg-transparent text-slate-200 relative">
        {/* ================= LEFT PANEL ================= */}
        <div
          className={`w-full md:w-[350px] lg:w-[400px] flex flex-col border-r border-slate-800 bg-slate-950/80 backdrop-blur-md ${selectedChat ? "hidden md:flex" : "flex"}`}
        >
          <div className="p-4 border-b border-slate-800">
            <h1 className="text-2xl font-bold text-white mb-4">
              CRM
              Inbox
            </h1>
            <div className="relative mb-4">
              <Search
                className="absolute left-3 top-2.5 text-slate-500"
                size={
                  18
                }
              />
              <input
                type="text"
                placeholder="Search fans..."
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
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#FF5757]"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setActiveTab(
                    "all",
                  )
                }
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "all" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-900"}`}
              >
                All
              </button>
              <button
                onClick={() =>
                  setActiveTab(
                    "priority",
                  )
                }
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${activeTab === "priority" ? "bg-[#FF5757]/10 text-[#FF5757] border border-[#FF5757]/20" : "text-slate-500 hover:bg-slate-900"}`}
              >
                <Star
                  size={
                    12
                  }
                />{" "}
                VIPs
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {isLoadingInbox ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-[#FF5757]" />
              </div>
            ) : (
              filteredInbox.map(
                (
                  chat,
                ) => (
                  <div
                    key={
                      chat._id
                    }
                    onClick={() =>
                      setSelectedChat(
                        chat,
                      )
                    }
                    className={`p-4 border-b border-slate-800/50 cursor-pointer flex items-center gap-3 ${selectedChat?._id === chat._id ? "bg-slate-800/50" : "hover:bg-slate-900/50"}`}
                  >
                    <div className="relative">
                      <img
                        src={
                          chat
                            .otherUser
                            ?.profileImage ||
                          `https://ui-avatars.com/api/?name=${chat.otherUser?.username}`
                        }
                        alt="avatar"
                        className="w-12 h-12 rounded-full border border-slate-700"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-slate-200 text-sm truncate">
                          {chat
                            .otherUser
                            ?.username ||
                            "Unknown Fan"}
                        </h3>
                        <span className="text-xs text-slate-500">
                          {chat.updatedAt
                            ? new Date(
                                chat.updatedAt,
                              ).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute:
                                    "2-digit",
                                },
                              )
                            : ""}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-slate-500 truncate max-w-[70%] flex items-center gap-1">
                          {chat
                            .lastMessage
                            ?.isLockedPPV && (
                            <Lock
                              size={
                                10
                              }
                              className="text-[#FF5757]"
                            />
                          )}
                          {chat
                            .lastMessage
                            ?.text ||
                            "Started a conversation"}
                        </p>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${chat.bubblesLeft > 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}
                        >
                          {chat.bubblesLeft ||
                            0}{" "}
                          💬
                        </span>
                      </div>
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        </div>

        {/* ================= RIGHT PANEL (CHAT) ================= */}
        {selectedChat ? (
          <div
            className={`flex-1 flex flex-col bg-slate-900/90 backdrop-blur-md ${!selectedChat ? "hidden md:flex" : "flex"}`}
          >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <div className="flex items-center gap-3">
                <button
                  className="md:hidden text-slate-400"
                  onClick={() =>
                    setSelectedChat(
                      null,
                    )
                  }
                >
                  <ChevronLeft
                    size={
                      24
                    }
                  />
                </button>
                <img
                  src={
                    selectedChat
                      .otherUser
                      ?.profileImage ||
                    `https://ui-avatars.com/api/?name=${selectedChat.otherUser?.username}`
                  }
                  alt="avatar"
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h2 className="font-bold text-white text-base">
                    {selectedChat
                      .otherUser
                      ?.username ||
                      "Unknown Fan"}
                  </h2>
                  <div className="flex gap-2 text-xs font-mono">
                    <span className="text-emerald-400 font-bold">
                      LTV:
                      $
                      {selectedChat.lifetimeValue ||
                        0}
                    </span>
                    <span
                      className={
                        selectedChat.bubblesLeft >
                        0
                          ? "text-blue-400"
                          : "text-red-400 font-bold"
                      }
                    >
                      {selectedChat.bubblesLeft ||
                        0}{" "}
                      Bubbles
                      Left
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.map(
                (
                  msg,
                ) => {
                  const isCreator =
                    msg.sender ===
                    (currentUser._id ||
                      currentUser.id);
                  return (
                    <div
                      key={
                        msg._id
                      }
                      className={`flex flex-col ${isCreator ? "items-end" : "items-start"}`}
                    >
                      {msg.priceInUSDT >
                      0 ? (
                        <div className="max-w-[75%] bg-slate-800 border border-[#FF5757]/30 rounded-2xl rounded-tr-sm p-4 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-[#FF5757]/10 rounded-bl-full blur-xl"></div>
                          <div className="flex items-center gap-2 mb-2 text-[#FF5757]">
                            <Lock
                              size={
                                14
                              }
                            />
                            <span className="text-xs font-bold uppercase tracking-wider">
                              Locked
                              Media
                            </span>
                            <span className="ml-auto bg-[#FF5757]/20 px-2 py-0.5 rounded text-xs font-mono font-bold">
                              $
                              {
                                msg.priceInUSDT
                              }
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 italic">
                            {msg.text ||
                              "[Media Attachment]"}
                          </p>
                        </div>
                      ) : (
                        <div
                          className={`max-w-[75%] p-3 rounded-2xl text-sm ${isCreator ? "bg-[#FF5757] text-white rounded-tr-sm" : "bg-slate-800 text-slate-200 rounded-tl-sm"}`}
                        >
                          {
                            msg.text
                          }
                        </div>
                      )}
                      <span className="text-[10px] text-slate-500 mt-1 mx-1">
                        {new Date(
                          msg.createdAt,
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
                  );
                },
              )}
              <div
                ref={
                  messagesEndRef
                }
              />
            </div>

            {/* INPUT AREA */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 pb-safe flex flex-col">
              {pendingAttachment && (
                <div className="mb-3 flex items-center justify-between bg-[#FF5757]/10 border border-[#FF5757]/30 rounded-lg p-2 px-3 self-start">
                  <div className="flex items-center gap-2 text-[#FF5757] text-sm font-bold">
                    <Lock
                      size={
                        14
                      }
                    />
                    <span className="truncate max-w-[200px]">
                      {
                        pendingAttachment.title
                      }
                    </span>
                    <span className="bg-[#FF5757] text-white px-1.5 py-0.5 rounded text-[10px] font-mono ml-2">
                      $
                      {
                        customPrice
                      }
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setPendingAttachment(
                        null,
                      )
                    }
                    className="text-slate-400 hover:text-white ml-4"
                  >
                    <X
                      size={
                        16
                      }
                    />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2 bg-slate-900 border border-slate-800 p-2 rounded-2xl focus-within:border-[#FF5757] transition-colors">
                <div className="flex gap-1 pb-1 pl-1">
                  <button
                    onClick={() =>
                      setShowVaultDrawer(
                        true,
                      )
                    }
                    className="p-2 text-slate-400 hover:text-[#FF5757] transition-colors rounded-full"
                  >
                    <Lock
                      size={
                        20
                      }
                    />
                  </button>
                </div>

                <textarea
                  rows="1"
                  placeholder={
                    pendingAttachment
                      ? "Add a description for this locked media..."
                      : "Type a message..."
                  }
                  value={
                    messageInput
                  }
                  onChange={(
                    e,
                  ) =>
                    setMessageInput(
                      e
                        .target
                        .value,
                    )
                  }
                  onKeyDown={(
                    e,
                  ) => {
                    if (
                      e.key ===
                        "Enter" &&
                      !e.shiftKey
                    ) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-white resize-none max-h-32 py-2.5 px-2"
                />

                <button
                  onClick={
                    handleSend
                  }
                  disabled={
                    (!messageInput.trim() &&
                      !pendingAttachment) ||
                    isSending
                  }
                  className={`p-2.5 rounded-xl transition-all mb-0.5 ${messageInput.trim() || pendingAttachment ? "bg-[#FF5757] text-white shadow-lg" : "bg-slate-800 text-slate-500"}`}
                >
                  {isSending ? (
                    <Loader2
                      size={
                        18
                      }
                      className="animate-spin"
                    />
                  ) : (
                    <Send
                      size={
                        18
                      }
                      className={
                        messageInput.trim() ||
                        pendingAttachment
                          ? "ml-0.5"
                          : ""
                      }
                    />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-slate-900/50 backdrop-blur-sm text-slate-500">
            Select
            a
            chat
            to
            begin
          </div>
        )}

        {/* ================= VAULT DRAWER OVERLAY ================= */}
        {showVaultDrawer && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-950 w-full md:w-[500px] md:rounded-3xl border-t md:border border-slate-800 shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 md:rounded-t-3xl">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Lock
                      size={
                        18
                      }
                      className="text-[#FF5757]"
                    />{" "}
                    Attach
                    Vault
                    Media
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select
                    content
                    to
                    lock
                    behind
                    a
                    paywall
                    in
                    this
                    chat.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setShowVaultDrawer(
                      false,
                    )
                  }
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition-colors"
                >
                  <X
                    size={
                      18
                    }
                  />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3">
                {MOCK_VAULT.map(
                  (
                    item,
                  ) => {
                    const isSelected =
                      selectedVaultItem?.id ===
                      item.id;
                    return (
                      <div
                        key={
                          item.id
                        }
                        onClick={() =>
                          setSelectedVaultItem(
                            item,
                          )
                        }
                        className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${isSelected ? "border-[#FF5757]" : "border-slate-800 hover:border-slate-600"}`}
                      >
                        <div className="aspect-square bg-slate-900 relative">
                          <img
                            src={
                              item.thumbnail
                            }
                            alt={
                              item.title
                            }
                            className="w-full h-full object-cover opacity-70"
                          />
                          <div className="absolute top-2 left-2 bg-slate-900/80 p-1.5 rounded-md text-white backdrop-blur-md">
                            {item.type ===
                            "video" ? (
                              <Video
                                size={
                                  14
                                }
                              />
                            ) : (
                              <ImageIcon
                                size={
                                  14
                                }
                              />
                            )}
                          </div>
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#FF5757]/20 flex items-center justify-center">
                              <div className="bg-[#FF5757] text-white p-2 rounded-full shadow-lg">
                                <Check
                                  size={
                                    20
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-2 bg-slate-900">
                          <p className="text-xs font-bold text-slate-200 truncate">
                            {
                              item.title
                            }
                          </p>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>

              {selectedVaultItem && (
                <div className="p-4 border-t border-slate-800 bg-slate-900 md:rounded-b-3xl">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                        Unlock
                        Price
                        (USDT)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-500 font-bold">
                          $
                        </span>
                        <input
                          type="number"
                          value={
                            customPrice
                          }
                          onChange={(
                            e,
                          ) =>
                            setCustomPrice(
                              e
                                .target
                                .value,
                            )
                          }
                          className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg py-2 pl-7 pr-3 focus:outline-none focus:border-[#FF5757] font-mono font-bold"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setPendingAttachment(
                          selectedVaultItem,
                        );
                        setShowVaultDrawer(
                          false,
                        );
                        setSelectedVaultItem(
                          null,
                        );
                      }}
                      className="flex-1 bg-[#FF5757] hover:bg-rose-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mt-5"
                    >
                      <Lock
                        size={
                          16
                        }
                      />{" "}
                      Attach
                      Media
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <style
          dangerouslySetInnerHTML={{
            __html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`,
          }}
        />
      </div>
    );
  };

export default CreatorMessages;
