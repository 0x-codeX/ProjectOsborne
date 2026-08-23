import React, {
  useState,
  useRef,
  useEffect,
} from "react";
import {
  useParams,
  useNavigate,
} from "react-router-dom";
import AgeVerificationGate from "./AgeVerificationGate";
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
  Plus,
  Minus,
} from "lucide-react";
import api from "../utils/api";
import { useWeb3Transfer } from "../hooks/useWeb3Transfer";
import { io } from "socket.io-client";
import { usePaystackPayment } from "react-paystack";

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

    // Bubble and Bundle Management
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
      bundlePrice,
      setBundlePrice,
    ] =
      useState(
        5,
      );
    const [
      bundleSize,
      setBundleSize,
    ] =
      useState(
        10,
      );

    // Modal & Configuration States
    const [
      showBundleConfig,
      setShowBundleConfig,
    ] =
      useState(
        false,
      );
    const [
      bundleQuantity,
      setBundleQuantity,
    ] =
      useState(
        1,
      );
    const [
      checkoutData,
      setCheckoutData,
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
      );
    const [
      processingId,
      setProcessingId,
    ] =
      useState(
        null,
      );

    // DYNAMIC CRYPTO QUOTE STATES
    const [
      cryptoQuote,
      setCryptoQuote,
    ] =
      useState(
        null,
      );
    const [
      fetchingQuote,
      setFetchingQuote,
    ] =
      useState(
        false,
      );
    // --- AGE VERIFICATION GATE STATES ---
    const [
      showAgeGate,
      setShowAgeGate,
    ] =
      useState(
        false,
      );
    const [
      pendingCheckoutData,
      setPendingCheckoutData,
    ] =
      useState(
        null,
      );

    // THE WIRE: Universal Payment Guard for DMs
    const handleGuardedCheckout =
      (
        checkoutPayload,
        isRestricted,
      ) => {
        if (
          isRestricted &&
          !currentUser.isAgeVerified
        ) {
          setPendingCheckoutData(
            checkoutPayload,
          );
          setShowAgeGate(
            true,
          );
          return; // STOP! Block the checkout modal.
        }

        // Allow through if verified or SFW
        setCheckoutData(
          checkoutPayload,
        );
        setPaymentMethod(
          null,
        );
      };

    const currentUser =
      JSON.parse(
        localStorage.getItem(
          "nippy_user",
        ) ||
          "{}",
      );

    const initializePayment =
      usePaystackPayment(
        {
          publicKey:
            import.meta
              .env
              .VITE_PAYSTACK_PUBLIC_KEY,
        },
      );

    useEffect(() => {
      fetchMessages();
      const socket =
        io(
          import.meta.env.VITE_API_URL?.replace(
            "/api",
            "",
          ) ||
            "http://localhost:5000",
        );

      if (
        conversationId
      ) {
        socket.emit(
          "join_chat",
          conversationId,
        );
      }

      socket.on(
        "receive_message",
        (
          newMessage,
        ) => {
          setMessages(
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
      conversationId,
    ]);

    const fetchMessages =
      async () => {
        try {
          // 1. Refactored: Clean api call using interceptor
          const res =
            await api.get(
              `/messages/${conversationId}`,
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
            setBundleSize(
              res
                .data
                .conversation
                .creator
                ?.monetizationSettings
                ?.messageBundleSize ||
                10,
            );

            if (
              res
                .data
                .conversation
                .bubblesLeft <=
              0
            ) {
              setRequiresBundle(
                true,
              );
            }
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

          // 2. Refactored: Clean api call using interceptor
          const res =
            await api.post(
              "/messages/send",
              {
                conversationId,
                receiverId,
                text: inputText,
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

    const closeCheckoutModal =
      () => {
        setCheckoutData(
          null,
        );
        setPaymentMethod(
          null,
        );
        setCryptoQuote(
          null,
        );
      };

    const handleSelectCrypto =
      async () => {
        setPaymentMethod(
          "CRYPTO",
        );
        setFetchingQuote(
          true,
        );
        setCryptoQuote(
          null,
        );

        try {
          // Convert Fan's padded price back to USD for the quote
          const toFanRate =
            exchangeRates[
              checkoutData
                .currency
            ] ||
            1;
          const fanPriceInUSD =
            checkoutData.amount /
            toFanRate;

          // Convert Creator's true raw price to USD for the quote
          const toRawRate =
            exchangeRates[
              checkoutData
                .rawCurrency
            ] ||
            1;
          const rawPriceInUSD =
            checkoutData.raw /
            toRawRate;

          const {
            data,
          } =
            await api.post(
              "/purchases/crypto-quote",
              {
                amountUSD:
                  fanPriceInUSD,
                rawAmountUSD:
                  rawPriceInUSD, // <--- We send the raw amount here
              },
            );

          setCryptoQuote(
            data,
          );
        } catch (error) {
          alert(
            "Failed to get live crypto rates. Please try again.",
          );
          setPaymentMethod(
            null,
          );
        } finally {
          setFetchingQuote(
            false,
          );
        }
      };

    const executePayment =
      async () => {
        if (
          !checkoutData ||
          !paymentMethod
        )
          return;

        if (
          paymentMethod ===
          "CARD"
        ) {
          // --- WEB2 EXECUTION (DYNAMIC FIAT) ---
          const amountInSubunits =
            Math.round(
              checkoutData.amount *
                100,
            );

          initializePayment(
            {
              config:
                {
                  reference:
                    new Date()
                      .getTime()
                      .toString(),
                  email:
                    currentUser?.email ||
                    "fan@nippy.com",
                  amount:
                    amountInSubunits,
                  currency:
                    checkoutData.currency,
                },
              onSuccess:
                async (
                  reference,
                ) => {
                  setProcessingId(
                    checkoutData.post
                      ? checkoutData
                          .post
                          ._id
                      : checkoutData.type,
                  );
                  try {
                    // The backend verifyPayment function uses checkoutData.raw to credit the Creator's Wallet
                    await api.post(
                      "/purchases/verify",
                      {
                        reference:
                          reference.reference,
                        paymentMethod:
                          "FIAT",
                        creatorId:
                          id,
                        contentId:
                          checkoutData.post
                            ? checkoutData
                                .post
                                ._id
                            : null,
                        purchaseType:
                          checkoutData.type,
                        subscriptionTier:
                          checkoutData.tier ||
                          null,
                        chargeAmount:
                          checkoutData.amount,
                        chargeCurrency:
                          checkoutData.currency,
                        rawAmount:
                          checkoutData.raw,
                        rawCurrency:
                          checkoutData.rawCurrency,
                      },
                    );

                    await fetchProfileAndRates();
                    closeCheckoutModal();
                  } catch (error) {
                    alert(
                      "Verification failed: " +
                        (error
                          .response
                          ?.data
                          ?.message ||
                          error.message),
                    );
                  } finally {
                    setProcessingId(
                      null,
                    );
                  }
                },
              onClose:
                () =>
                  alert(
                    "Payment window closed by user.",
                  ),
            },
          );
          return;
        }

        // --- WEB3 EXECUTION ---
        try {
          setProcessingId(
            checkoutData.post
              ? checkoutData
                  .post
                  ._id
              : checkoutData.type,
          );

          if (
            !profileData
              ?.creator
              ?.walletAddress
          )
            throw new Error(
              "Creator missing Web3 wallet.",
            );
          if (
            !cryptoQuote?.requiredUSDT ||
            !cryptoQuote?.rawUSDT
          )
            throw new Error(
              "Missing crypto quote.",
            );

          // THE FIX: We pass BOTH the Fan's bloated price and the Creator's raw base price to the Smart Contract!
          const txHash =
            await transferUSDT(
              profileData
                .creator
                .walletAddress,
              cryptoQuote.requiredUSDT, // e.g., 3.50 USDT (Fan is charged this)
              cryptoQuote.rawUSDT, // e.g., 3.33 USDT (Contract calculates 80% split against this)
              checkoutData.post
                ? checkoutData
                    .post
                    ._id
                : null,
            );

          if (
            !txHash
          )
            throw new Error(
              "Transaction completed but no hash was returned.",
            );

          // The backend uses checkoutData.raw to credit the Creator's Wallet
          await api.post(
            "/purchases/verify",
            {
              txHash:
                txHash,
              paymentMethod:
                "CRYPTO",
              creatorId:
                id,
              contentId:
                checkoutData.post
                  ? checkoutData
                      .post
                      ._id
                  : null,
              purchaseType:
                checkoutData.type,
              subscriptionTier:
                checkoutData.tier ||
                null,
              chargeAmount:
                checkoutData.amount,
              chargeCurrency:
                checkoutData.currency,
              rawAmount:
                checkoutData.raw,
              rawCurrency:
                checkoutData.rawCurrency,
            },
          );

          await fetchProfileAndRates();
          closeCheckoutModal();
        } catch (error) {
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
                <div
                  onClick={() => {
                    const creatorId =
                      chatInfo._id ||
                      (typeof chatInfo ===
                      "string"
                        ? chatInfo
                        : null);
                    if (
                      creatorId
                    ) {
                      navigate(
                        `/creator/${creatorId}`,
                      );
                    }
                  }}
                  className="flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
                >
                  <img
                    src={
                      chatInfo.profilePicture ||
                      `https://ui-avatars.com/api/?name=${chatInfo.username}`
                    }
                    alt={
                      chatInfo.username
                    }
                    className="w-10 h-10 rounded-full object-cover border border-gray-700 group-hover:border-emerald-500 transition-colors"
                  />
                  <div className="flex flex-col">
                    <h2 className="text-sm font-bold text-slate-200 flex items-center gap-1 group-hover:text-emerald-400 transition-colors">
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
                const isVoiceNote =
                  msg.fileType?.includes(
                    "audio",
                  ) ||
                  (msg.fileKey &&
                    msg.fileKey.includes(
                      "voice-notes",
                    ));

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
                      {/* FREE VOICE NOTE */}
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
                              missing.
                            </div>
                          )}
                        </div>
                      )}

                      {/* LOCKED PPV */}
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
                          <button
                            onClick={() => {
                              handleGuardedCheckout(
                                {
                                  type: "DM_UNLOCK",
                                  message:
                                    msg,
                                  amount:
                                    msg.priceInUSDT,
                                },
                                msg.isNsfw ||
                                  chatInfo?.willingNsfw, // Fallback to creator's NSFW status if msg doesn't have it
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
                        /* FREE MEDIA & TEXT */
                        <div className="flex flex-col gap-2">
                          {msg.fileKey &&
                            !isVoiceNote && (
                              <>
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

          {/* INPUT / BUNDLE PROMPT */}
          <div className="bg-nippy-obsidian/95 border-t border-gray-800 p-3 pb-safe z-10">
            {requiresBundle ||
            bubblesLeft <=
              0 ? (
              <div className="p-4 bg-slate-900 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">
                    Chat
                    Bubbles
                    Exhausted
                  </p>
                  <p className="text-xs text-slate-400">
                    Get{" "}
                    {chatInfo?.bundleSize ||
                      bundleSize ||
                      5}{" "}
                    messages
                    for{" "}
                    {chatInfo?.bundleDisplayCurrency ||
                      "USDT"}{" "}
                    {(
                      chatInfo?.bundleDisplayPrice ||
                      bundlePrice
                    )?.toFixed(
                      2,
                    )}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setBundleQuantity(
                      1,
                    );
                    setShowBundleConfig(
                      true,
                    );
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition-colors"
                >
                  Buy
                  Bundle
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

          {/* CHAT BUNDLE CONFIG MODAL */}
          {showBundleConfig && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                  <h3 className="text-xl font-bold text-white">
                    Buy
                    Chat
                    Bundle
                  </h3>
                  <button
                    onClick={() =>
                      setShowBundleConfig(
                        false,
                      )
                    }
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X
                      size={
                        24
                      }
                    />
                  </button>
                </div>

                <div className="p-6 flex flex-col items-center">
                  <MessageSquare
                    size={
                      48
                    }
                    className="text-emerald-500 mb-4 opacity-80"
                  />
                  <p className="text-sm text-slate-300 text-center mb-6">
                    <span className="font-bold text-white">
                      {
                        chatInfo?.username
                      }
                    </span>{" "}
                    is
                    offering{" "}
                    <span className="font-bold text-emerald-400">
                      {
                        bundleSize
                      }{" "}
                      messages
                    </span>{" "}
                    per
                    bundle
                    for{" "}
                    <span className="font-bold text-emerald-400">
                      $
                      {
                        bundlePrice
                      }
                    </span>

                    .
                  </p>

                  <div className="flex items-center gap-6 mb-8 bg-slate-950 p-2 rounded-2xl border border-slate-800">
                    <button
                      onClick={() =>
                        setBundleQuantity(
                          (
                            prev,
                          ) =>
                            Math.max(
                              1,
                              prev -
                                1,
                            ),
                        )
                      }
                      disabled={
                        bundleQuantity <=
                        1
                      }
                      className="p-3 bg-slate-800 rounded-xl text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                      <Minus
                        size={
                          20
                        }
                      />
                    </button>
                    <div className="flex flex-col items-center min-w-[60px]">
                      <span className="text-3xl font-black text-white">
                        {
                          bundleQuantity
                        }
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        Bundles
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        setBundleQuantity(
                          (
                            prev,
                          ) =>
                            prev +
                            1,
                        )
                      }
                      className="p-3 bg-slate-800 rounded-xl text-white hover:bg-slate-700"
                    >
                      <Plus
                        size={
                          20
                        }
                      />
                    </button>
                  </div>

                  <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex justify-between items-center mb-6">
                    <div>
                      <p className="text-xs text-emerald-500 font-bold uppercase">
                        Total
                        Messages
                      </p>
                      <p className="text-2xl font-black text-emerald-400">
                        {bundleQuantity *
                          bundleSize}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-500 font-bold uppercase">
                        Total
                        Cost
                      </p>
                      <p className="text-2xl font-black text-emerald-400">
                        $
                        {(
                          bundleQuantity *
                          bundlePrice
                        ).toFixed(
                          2,
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowBundleConfig(
                        false,
                      );
                      handleGuardedCheckout(
                        {
                          type: "CHAT_BUNDLE",
                          amount:
                            bundleQuantity *
                            bundlePrice,
                          bubbles:
                            bundleQuantity *
                            bundleSize,
                        },
                        chatInfo?.willingNsfw, // Restricts bundles if the creator produces NSFW
                      );
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-colors"
                  >
                    Continue
                    to
                    Payment
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* THE NEW AGE GATE */}
          <AgeVerificationGate
            isOpen={
              showAgeGate
            }
            onClose={() =>
              setShowAgeGate(
                false,
              )
            }
          />

          {/* UNIFIED CHECKOUT MODAL (Handles both DM Unlock and Bundles) */}
          {checkoutData && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                  <h3 className="text-lg font-bold text-white">
                    Select
                    Payment
                    Method
                  </h3>
                  <button
                    onClick={
                      closeCheckoutModal
                    }
                    disabled={
                      processingId !==
                      null
                    }
                    className="text-gray-400 hover:text-white transition-colors"
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
                    {checkoutData.type ===
                    "CHAT_BUNDLE"
                      ? `You are buying ${checkoutData.bubbles} messages from `
                      : `You are unlocking a message from `}
                    <span className="text-white font-bold">
                      {
                        chatInfo?.username
                      }
                    </span>{" "}
                    for{" "}
                    <span className="text-emerald-500 font-bold">
                      {
                        checkoutData.amount
                      }{" "}
                      USD
                    </span>
                  </p>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={
                        handleSelectCrypto
                      }
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        paymentMethod ===
                        "CRYPTO"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
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
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
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

                  {/* DYNAMIC CRYPTO QUOTE DISPLAY */}
                  {paymentMethod ===
                    "CRYPTO" &&
                    fetchingQuote && (
                      <div className="mt-2 p-3 text-center text-sm text-emerald-500 animate-pulse">
                        Fetching
                        live
                        USDT
                        rates...
                      </div>
                    )}
                  {paymentMethod ===
                    "CRYPTO" &&
                    cryptoQuote && (
                      <div className="mt-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                        <p className="text-sm text-gray-400 mb-1">
                          Total:{" "}
                          <span className="text-white">
                            $
                            {cryptoQuote.amountUSD.toFixed(
                              2,
                            )}{" "}
                            USD
                          </span>
                        </p>
                        <p className="text-xl font-bold text-emerald-400">
                          Due:{" "}
                          {
                            cryptoQuote.requiredUSDT
                          }{" "}
                          USDT
                        </p>
                        <p className="text-xs text-emerald-500/70 mt-2 flex items-center justify-center gap-1">
                          <Lock
                            size={
                              12
                            }
                          />{" "}
                          Rate
                          locked
                          for
                          10:00
                        </p>
                      </div>
                    )}

                  <button
                    onClick={
                      executePayment
                    }
                    disabled={
                      !paymentMethod ||
                      fetchingQuote ||
                      (paymentMethod ===
                        "CRYPTO" &&
                        !cryptoQuote) ||
                      processingId !==
                        null
                    }
                    className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                  >
                    {processingId !==
                    null ? (
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
  };;

export default FanChatWindow;
