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
  Wallet,
  CreditCard,
  X,
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

    // --- NEW: PPV CHAT MODAL STATES ---
    const [
      paymentModalMsg,
      setPaymentModalMsg,
    ] =
      useState(
        null,
      );
    const [
      paymentMethod,
      setPaymentMethod,
    ] =
      useState(
        null,
      ); // 'CRYPTO' | 'CARD'
    const [
      processingId,
      setProcessingId,
    ] =
      useState(
        null,
      );
    const [
      unlockingMsgId,
      setUnlockingMsgId,
    ] =
      useState(
        null,
      );

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

    const executePayment =
      async () => {
        if (
          !paymentModalMsg ||
          !paymentMethod
        )
          return;

        if (
          paymentMethod ===
          "CARD"
        ) {
          alert(
            "Paystack integration pending. Please use Web3 Crypto for now.",
          );
          return;
        }

        try {
          setProcessingId(
            paymentModalMsg._id,
          );
          if (
            !chatInfo?.walletAddress
          ) {
            throw new Error(
              "This creator has not set up their Web3 wallet address yet!",
            );
          }

          // 1. Web3 Payment Execution on Polygon Amoy
          const txHash =
            await transferUSDT(
              chatInfo.walletAddress,
              paymentModalMsg.priceInUSDT,
              paymentModalMsg._id,
            );

          // 2. THE IRONCLAD FIX: Send the transaction hash to the backend to be cryptographically verified
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          await axios.post(
            "/api/purchases/verify",
            {
              messageId:
                paymentModalMsg._id,
              creatorId:
                chatInfo._id,
              txHash,
              purchaseType:
                "DM_UNLOCK",
            },
            {
              headers:
                {
                  Authorization: `Bearer ${token}`,
                },
            },
          );

          // 3. Fetch updated messages only AFTER backend confirms the database is updated
          await fetchMessages();
          setPaymentModalMsg(
            null,
          );
        } catch (error) {
          console.error(
            "Unlock Error Trace:",
            error,
          );
          alert(
            error
              .response
              ?.data
              ?.message ||
              error.message ||
              "Transaction failed.",
          );
        } finally {
          setProcessingId(
            null,
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
                const myId =
                  currentUser._id ||
                  currentUser.id;
                const isMe =
                  msg.sender ===
                  myId;

                // Bulletproof check: Look at fileType, OR if the fileKey contains our voice-note path
                const isVoiceNote =
                  msg.fileType?.includes(
                    "audio",
                  ) ||
                  (msg.fileKey &&
                    msg.fileKey.includes(
                      "voice-notes",
                    ));

                // Check if the fan's wallet is in the message's unlockedFor array, OR if the backend flagged it as unlocked
                const fanWallet =
                  currentUser.walletAddress?.toLowerCase();
                const isUnlockedByMe =
                  msg.unlockedFor?.some(
                    (
                      w,
                    ) =>
                      w.toLowerCase() ===
                      fanWallet,
                  ) ||
                  msg.hasAccess;

                // Only lock it if it has a price, it isn't yours, it isn't a voice note, AND you haven't bought it
                const isLockedPPV =
                  msg.priceInUSDT >
                    0 &&
                  !isMe &&
                  !isVoiceNote &&
                  !isUnlockedByMe;

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
                      {/* --- FREE VOICE NOTE RENDERING --- */}
                      {isVoiceNote && (
                        <div className="flex flex-col gap-1 mt-1 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 flex items-center gap-1">
                            <CheckCircle2
                              size={
                                12
                              }
                              className={
                                isMe
                                  ? "text-white"
                                  : "text-emerald-400"
                              }
                            />
                            {isMe
                              ? "Your Voice Note"
                              : "Creator Voice Note"}
                          </span>

                          {/* IRONCLAD CHECK: Only render audio if URL actually exists */}
                          {msg.fileUrl ? (
                            <audio
                              src={
                                msg.fileUrl
                              }
                              controls
                              className="h-10 w-[200px] md:w-[250px] rounded bg-transparent"
                            />
                          ) : (
                            <div className="text-[10px] text-red-300 italic p-2 bg-black/20 rounded border border-red-500/30">
                              Audio
                              link
                              missing
                              from
                              database.
                            </div>
                          )}
                        </div>
                      )}

                      {/* --- LOCKED PPV RENDERING --- */}
                      {isLockedPPV ? (
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
                          {/* --- IRONCLAD: Added onClick to open modal --- */}
                          <button
                            onClick={() => {
                              setPaymentModalMsg(
                                msg,
                              );
                              setPaymentMethod(
                                null,
                              );
                            }}
                            className="bg-yellow-500 hover:bg-yellow-400 transition-colors text-black text-xs font-bold py-2 px-4 rounded-full"
                          >
                            Unlock
                            for{" "}
                            {
                              msg.priceInUSDT
                            }{" "}
                            USDT
                          </button>
                        </div>
                      ) : (
                        /* --- FREE MEDIA & TEXT RENDERING --- */
                        <div className="flex flex-col gap-2">
                          {msg.fileKey &&
                            !isVoiceNote && (
                              <>
                                {/* 1. Explicit check for Video - LOCKED DOWN */}
                                {(msg.fileType?.includes(
                                  "video",
                                ) ||
                                  msg.fileKey
                                    .toLowerCase()
                                    .endsWith(
                                      ".mp4",
                                    )) && (
                                  <video
                                    src={`https://${import.meta.env.VITE_R2_PUBLIC_DOMAIN}/${msg.fileKey}`}
                                    controls
                                    controlsList="nodownload noplaybackrate"
                                    disablePictureInPicture
                                    onContextMenu={(
                                      e,
                                    ) =>
                                      e.preventDefault()
                                    }
                                    className="w-full md:w-[250px] rounded-lg bg-black"
                                  />
                                )}

                                {/* 2. Explicit check for Image - LOCKED DOWN */}
                                {(msg.fileType?.includes(
                                  "image",
                                ) ||
                                  msg.fileKey
                                    .toLowerCase()
                                    .match(
                                      /\.(jpg|jpeg|png|gif|webp)$/,
                                    )) && (
                                  <img
                                    src={`https://${import.meta.env.VITE_R2_PUBLIC_DOMAIN}/${msg.fileKey}`}
                                    alt="Media upload"
                                    onContextMenu={(
                                      e,
                                    ) =>
                                      e.preventDefault()
                                    }
                                    draggable="false"
                                    className="w-full md:w-[250px] rounded-lg select-none"
                                  />
                                )}

                                {/* 3. Fallback for other file types (PDFs, Docs, etc.) */}
                                {!msg.fileType?.includes(
                                  "video",
                                ) &&
                                  !msg.fileType?.includes(
                                    "image",
                                  ) &&
                                  !msg.fileKey
                                    .toLowerCase()
                                    .match(
                                      /\.(mp4|jpg|jpeg|png|gif|webp)$/,
                                    ) && (
                                    <a
                                      href={`https://${import.meta.env.VITE_R2_PUBLIC_DOMAIN}/${msg.fileKey}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 underline text-sm break-all"
                                    >
                                      View
                                      Attachment
                                    </a>
                                  )}
                              </>
                            )}

                          {/* Ironclad text rendering */}
                          {msg.text &&
                            msg.text.trim()
                              .length >
                              0 && (
                              <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
                                {
                                  msg.text
                                }
                              </p>
                            )}
                        </div>
                      )}

                      {/* TIMESTAMPS */}
                      <div
                        className={`text-[10px] mt-1.5 flex items-center gap-1 ${
                          isMe
                            ? "text-white/70 justify-end"
                            : "text-gray-500"
                        }`}
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
                    }
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
                    className={`absolute right-4 top-3 text-xs ${
                      inputText.length >=
                      200
                        ? "text-red-400"
                        : "text-gray-500"
                    }`}
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

          {/* --- THE CHECKOUT MODAL FOR CHAT MEDIA --- */}
          {paymentModalMsg && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                  <h3 className="text-lg font-bold text-white">
                    Select
                    Payment
                    Method
                  </h3>
                  <button
                    onClick={() =>
                      setPaymentModalMsg(
                        null,
                      )
                    }
                    className="text-gray-400 hover:text-white transition-colors"
                    disabled={
                      processingId ===
                      paymentModalMsg._id
                    }
                  >
                    <X
                      size={
                        24
                      }
                    />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-sm text-gray-400 text-center">
                    You
                    are
                    unlocking
                    media
                    from{" "}
                    <span className="text-white font-bold">
                      {
                        chatInfo?.username
                      }
                    </span>{" "}
                    for{" "}
                    <span className="text-yellow-500 font-bold">
                      {
                        paymentModalMsg.priceInUSDT
                      }{" "}
                      USDT
                    </span>
                  </p>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() =>
                        setPaymentMethod(
                          "CRYPTO",
                        )
                      }
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        paymentMethod ===
                        "CRYPTO"
                          ? "border-yellow-500 bg-yellow-500/10 text-yellow-500"
                          : "border-slate-700 text-gray-400 hover:border-slate-500"
                      }`}
                    >
                      <Wallet
                        size={
                          28
                        }
                        className="mb-2"
                      />
                      <span className="font-bold text-sm">
                        Crypto
                      </span>
                      <span className="text-[10px] opacity-70">
                        MetaMask
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        setPaymentMethod(
                          "CARD",
                        )
                      }
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        paymentMethod ===
                        "CARD"
                          ? "border-yellow-500 bg-yellow-500/10 text-yellow-500"
                          : "border-slate-700 text-gray-400 hover:border-slate-500"
                      }`}
                    >
                      <CreditCard
                        size={
                          28
                        }
                        className="mb-2"
                      />
                      <span className="font-bold text-sm">
                        Card
                      </span>
                      <span className="text-[10px] opacity-70">
                        Paystack
                        /
                        Fiat
                      </span>
                    </button>
                  </div>

                  {/* THE FINAL EXECUTION BUTTON - YELLOW THEME */}
                  <button
                    onClick={
                      executePayment
                    }
                    disabled={
                      !paymentMethod ||
                      processingId ===
                        paymentModalMsg._id
                    }
                    className="w-full mt-4 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:hover:bg-yellow-500 shadow-lg shadow-yellow-500/20"
                  >
                    {processingId ===
                    paymentModalMsg._id ? (
                      <span className="animate-pulse">
                        Processing...
                      </span>
                    ) : (
                      <>
                        <Lock
                          size={
                            18
                          }
                          className="opacity-70"
                        />{" "}
                        Confirm
                        &
                        Pay
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

export default FanChatWindow;
