import React, {
  useState,
  useRef,
  useEffect,
} from "react";
import {
  useParams,
  useNavigate,
} from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Lock,
  Unlock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import axios from "axios";
import { useWeb3Transfer } from "../hooks/useWeb3Transfer";
import { io } from "socket.io-client";

const FanChatWindow =
  () => {
    const {
      id: conversationId,
    } =
      useParams();
    const navigate =
      useNavigate();
    const messagesEndRef =
      useRef(
        null,
      );
    const {
      transferUSDT,
    } =
      useWeb3Transfer();

    const [
      inputText,
      setInputText,
    ] =
      useState(
        "",
      );
    const [
      messages,
      setMessages,
    ] =
      useState(
        [],
      );
    const [
      chatInfo,
      setChatInfo,
    ] =
      useState(
        null,
      );

    // NEW: Bubble and Bundle Management
    const [
      bubblesLeft,
      setBubblesLeft,
    ] =
      useState(
        0,
      );
    const [
      requiresBundle,
      setRequiresBundle,
    ] =
      useState(
        false,
      );
    const [
      isPurchasingBundle,
      setIsPurchasingBundle,
    ] =
      useState(
        false,
      );
    const [
      bundlePrice,
      setBundlePrice,
    ] =
      useState(
        5,
      ); // Fallback price

    const currentUser =
      JSON.parse(
        localStorage.getItem(
          "nippy_user",
        ) ||
          "{}",
      );

    useEffect(() => {
      fetchMessages();

      // 1. Connect to your backend socket
      const socket =
        io(
          "http://localhost:5000",
        ); // Ensure this is your backend port

      // 2. Tell the server which conversation room to join
      if (
        conversationId
      ) {
        socket.emit(
          "join_chat",
          conversationId,
        );
      }

      // 3. Listen for incoming messages
      socket.on(
        "receive_message",
        (
          newMessage,
        ) => {
          setMessages(
            (
              prev,
            ) => {
              // Ironclad Check: Prevent duplicate messages from rendering
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

      // 4. Clean up the pipeline when they leave the page
      return () => {
        socket.disconnect();
      };
    }, [
      conversationId,
    ]);

    const fetchMessages =
      async () => {
        try {
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          // Assuming GET /api/messages/:id returns { conversation, messages }
          const res =
            await axios.get(
              `/api/messages/${conversationId}`,
              {
                headers:
                  {
                    Authorization: `Bearer ${token}`,
                  },
              },
            );

          setMessages(
            res
              .data
              .messages ||
              res.data,
          );
          if (
            res
              .data
              .conversation
          ) {
            setChatInfo(
              res
                .data
                .conversation
                .creator,
            );
            setBubblesLeft(
              res
                .data
                .conversation
                .bubblesLeft,
            );
            setBundlePrice(
              res
                .data
                .conversation
                .creator
                ?.monetizationSettings
                ?.messageBundlePrice ||
                5,
            );
            if (
              res
                .data
                .conversation
                .bubblesLeft <=
              0
            )
              setRequiresBundle(
                true,
              );
          }
          scrollToBottom();
        } catch (error) {
          console.error(
            "Failed to fetch messages:",
            error,
          );
        }
      };

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

    const handleSendMessage =
      async (
        e,
      ) => {
        e.preventDefault();
        if (
          !inputText.trim()
        )
          return;

        try {
          const token =
            localStorage.getItem(
              "nippy_token",
            );

          // IRONCLAD RECEIVER ID LOGIC
          // 1. Try to get it from chatInfo (if backend populated it correctly)
          // 2. Fallback to extracting it from chatInfo if it's just a raw string ID
          // 3. Fallback to previous messages if they exist
          let receiverId =
            chatInfo?._id ||
            (typeof chatInfo ===
            "string"
              ? chatInfo
              : null);

          if (
            !receiverId &&
            messages.length >
              0
          ) {
            const firstMsg =
              messages[0];
            const myId =
              currentUser._id ||
              currentUser.id;
            receiverId =
              firstMsg.sender ===
              myId
                ? firstMsg.receiver
                : firstMsg.sender;
          }

          if (
            !receiverId
          ) {
            alert(
              "System error: Cannot identify the creator. Please refresh.",
            );
            return;
          }

          const res =
            await axios.post(
              "/api/messages/send",
              {
                conversationId,
                receiverId,
                text: inputText,
              },
              {
                headers:
                  {
                    Authorization: `Bearer ${token}`,
                  },
              },
            );

          setMessages(
            [
              ...messages,
              res
                .data
                .data,
            ],
          );
          setInputText(
            "",
          );
          setBubblesLeft(
            res
              .data
              .bubblesLeft,
          );
          scrollToBottom();
        } catch (err) {
          if (
            err
              .response
              ?.status ===
            402
          ) {
            setRequiresBundle(
              true,
            );
          } else {
            alert(
              err
                .response
                ?.data
                ?.message ||
                "Failed to send message.",
            );
          }
        }
      };

    const handleBuyBundle =
      async () => {
        setIsPurchasingBundle(
          true,
        );
        try {
          if (
            !chatInfo?.walletAddress
          )
            throw new Error(
              "Creator wallet not found.",
            );

          // 1. Web3 Payment
          const txHash =
            await transferUSDT(
              chatInfo.walletAddress,
              bundlePrice,
            );

          // 2. Verify with backend
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const res =
            await axios.post(
              "/api/messages/buy-bundle",
              {
                creatorId:
                  chatInfo._id,
                txHash,
                amountPaid:
                  bundlePrice,
              },
              {
                headers:
                  {
                    Authorization: `Bearer ${token}`,
                  },
              },
            );

          setBubblesLeft(
            res
              .data
              .bubblesLeft,
          );
          setRequiresBundle(
            false,
          );
          alert(
            "Bundle purchased successfully! You can chat again.",
          );
        } catch (error) {
          console.error(
            "Bundle purchase failed:",
            error,
          );
          alert(
            error.message ||
              "Transaction failed.",
          );
        } finally {
          setIsPurchasingBundle(
            false,
          );
        }
      };

    return (
      <div className="fixed inset-0 z-50 flex justify-center bg-black/95 md:py-6 font-sans">
        <div className="w-full h-full md:h-[90vh] md:max-w-2xl bg-nippy-onyx md:rounded-3xl md:border md:border-gray-800 md:shadow-2xl flex flex-col relative overflow-hidden">
          {/* HEADER */}
          <div className="flex items-center justify-between p-4 bg-nippy-obsidian/95 backdrop-blur-md border-b border-gray-800 z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  navigate(
                    -1,
                  )
                }
                className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors rounded-full"
              >
                <ArrowLeft
                  size={
                    24
                  }
                />
              </button>
              {chatInfo && (
                <div className="flex items-center gap-3 cursor-pointer">
                  <img
                    src={
                      chatInfo.profilePicture ||
                      `https://ui-avatars.com/api/?name=${chatInfo.username}`
                    }
                    alt="Creator"
                    className="w-10 h-10 rounded-full object-cover border border-gray-700"
                  />
                  <div className="flex flex-col">
                    <h2 className="text-sm font-bold text-slate-200 flex items-center gap-1">
                      {
                        chatInfo.username
                      }{" "}
                      <CheckCircle2
                        size={
                          14
                        }
                        className="text-emerald-500"
                      />
                    </h2>
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <MessageSquare
                        size={
                          12
                        }
                      />{" "}
                      {
                        bubblesLeft
                      }{" "}
                      Bubbles
                      Left
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MESSAGES */}
          <div className="flex-grow overflow-y-auto p-4 space-y-6">
            {messages.map(
              (
                msg,
              ) => {
                const isMe =
                  msg.sender ===
                  (currentUser._id ||
                    currentUser.id);
                return (
                  <div
                    key={
                      msg._id
                    }
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[70%] px-4 py-2.5 shadow-sm relative ${
                        isMe
                          ? "bg-emerald-500 text-white rounded-2xl rounded-tr-sm"
                          : "bg-[#262626] text-slate-200 rounded-2xl rounded-tl-sm border border-gray-800"
                      }`}
                    >
                      {msg.text && (
                        <p className="text-[15px] leading-relaxed break-words">
                          {
                            msg.text
                          }
                        </p>
                      )}

                      {/* Handle Locked PPV Display logic here as you originally had it... */}
                      {msg.priceInUSDT >
                        0 &&
                        msg.sender !==
                          currentUser._id && (
                          <div className="mt-2 w-64 p-4 bg-black rounded-xl border border-yellow-500/30 flex flex-col items-center">
                            <Lock
                              size={
                                24
                              }
                              className="text-yellow-500 mb-2"
                            />
                            <span className="text-xs font-bold text-yellow-500 mb-2">
                              PPV
                              Content
                            </span>
                            <button className="bg-yellow-500 text-black text-xs font-bold py-2 px-4 rounded-full">
                              Unlock
                              for{" "}
                              {
                                msg.priceInUSDT
                              }{" "}
                              USDT
                            </button>
                          </div>
                        )}

                      <div
                        className={`text-[10px] mt-1 flex items-center gap-1 ${isMe ? "text-white/70 justify-end" : "text-gray-500"}`}
                      >
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
                      </div>
                    </div>
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

          {/* BUNDLE BUYER OR CHAT INPUT */}
          <div className="bg-nippy-obsidian/95 border-t border-gray-800 p-3 pb-safe z-10">
            {requiresBundle ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                <AlertCircle
                  size={
                    24
                  }
                  className="text-emerald-500 mx-auto mb-2"
                />
                <p className="text-sm text-slate-300 mb-3">
                  You
                  are
                  out
                  of
                  Message
                  Bubbles!
                </p>
                <button
                  onClick={
                    handleBuyBundle
                  }
                  disabled={
                    isPurchasingBundle
                  }
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isPurchasingBundle ? (
                    <>
                      <Loader2
                        size={
                          18
                        }
                        className="animate-spin"
                      />{" "}
                      Processing...
                    </>
                  ) : (
                    `Buy Message Bundle (${bundlePrice} USDT)`
                  )}
                </button>
              </div>
            ) : (
              <form
                onSubmit={
                  handleSendMessage
                }
                className="flex items-center gap-2"
              >
                <div className="flex-grow relative">
                  <input
                    type="text"
                    maxLength={
                      200
                    } // IRONCLAD RULE: 200 chars max for fans
                    value={
                      inputText
                    }
                    onChange={(
                      e,
                    ) =>
                      setInputText(
                        e
                          .target
                          .value,
                      )
                    }
                    placeholder="Message (max 200 characters)..."
                    className="w-full bg-[#262626] border border-gray-700 text-white rounded-full py-3 pl-4 pr-10 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                  />
                  <span
                    className={`absolute right-4 top-3 text-xs ${inputText.length >= 200 ? "text-red-400" : "text-gray-500"}`}
                  >
                    {
                      inputText.length
                    }
                    /200
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={
                    !inputText.trim()
                  }
                  className="p-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors disabled:opacity-40"
                >
                  <Send
                    size={
                      18
                    }
                    className="ml-0.5"
                  />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  };

export default FanChatWindow;
