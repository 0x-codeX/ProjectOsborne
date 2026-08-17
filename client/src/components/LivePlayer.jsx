import React, {
  useState,
  useEffect,
  useRef,
} from "react";
import {
  useParams,
  useNavigate,
} from "react-router-dom";
import api from "../utils/api"; // THE FIX: Imported the global interceptor
import Hls from "hls.js";
import { io } from "socket.io-client";
import {
  MessageSquare,
  Send,
  Gift,
  X,
  CreditCard,
  Wallet,
  AlertCircle,
  Loader2,
  Lock,
} from "lucide-react";
import { useWeb3Transfer } from "../hooks/useWeb3Transfer";

const LivePlayer =
  () => {
    const {
      id,
    } =
      useParams();
    const navigate =
      useNavigate();
    const videoRef =
      useRef(
        null,
      );
    const chatEndRef =
      useRef(
        null,
      );
    const socketRef =
      useRef(
        null,
      );

    // --- STATE ---
    const [
      stream,
      setStream,
    ] =
      useState(
        null,
      );
    const [
      loading,
      setLoading,
    ] =
      useState(
        true,
      );
    const [
      error,
      setError,
    ] =
      useState(
        null,
      );
    const [
      requiresSub,
      setRequiresSub,
    ] =
      useState(
        false,
      );
    const [
      subPrice,
      setSubPrice,
    ] =
      useState(
        0,
      );

    // Chat State
    const [
      messages,
      setMessages,
    ] =
      useState(
        [],
      );
    const [
      chatInput,
      setChatInput,
    ] =
      useState(
        "",
      );

    // Gifting State
    const [
      isGiftDrawerOpen,
      setIsGiftDrawerOpen,
    ] =
      useState(
        false,
      );
    const [
      giftAmountNGN,
      setGiftAmountNGN,
    ] =
      useState(
        1000,
      );
    const [
      paymentMethod,
      setPaymentMethod,
    ] =
      useState(
        "CRYPTO",
      ); // 'CRYPTO' or 'FIAT'
    const [
      isProcessingGift,
      setIsProcessingGift,
    ] =
      useState(
        false,
      );
    const [
      giftError,
      setGiftError,
    ] =
      useState(
        "",
      );

    const {
      transferUSDT,
    } =
      useWeb3Transfer();

    // --- 1. INITIALIZE STREAM & SOCKET ---
    useEffect(() => {
      const fetchStream =
        async () => {
          try {
            // THE FIX: Clean, centralized API call
            const res =
              await api.get(
                `/streams/${id}`,
              );
            setStream(
              res
                .data
                .stream,
            );
          } catch (err) {
            if (
              err
                .response
                ?.status ===
                403 &&
              err
                .response
                ?.data
                ?.requiresSubscription
            ) {
              setRequiresSub(
                true,
              );
              setSubPrice(
                err
                  .response
                  .data
                  .subscriptionPriceNGN,
              );
            } else {
              setError(
                err
                  .response
                  ?.data
                  ?.message ||
                  "Failed to load stream.",
              );
            }
          } finally {
            setLoading(
              false,
            );
          }
        };

      fetchStream();
    }, [
      id,
    ]);

    useEffect(() => {
      // Setup HLS Video Player
      if (
        stream?.playbackUrl &&
        videoRef.current
      ) {
        if (
          Hls.isSupported()
        ) {
          const hls =
            new Hls();
          hls.loadSource(
            stream.playbackUrl,
          );
          hls.attachMedia(
            videoRef.current,
          );
          hls.on(
            Hls
              .Events
              .MANIFEST_PARSED,
            () => {
              videoRef.current
                .play()
                .catch(
                  () =>
                    console.log(
                      "Autoplay prevented",
                    ),
                );
            },
          );
        } else if (
          videoRef.current.canPlayType(
            "application/vnd.apple.mpegurl",
          )
        ) {
          // Fallback for Safari natively supporting HLS
          videoRef.current.src =
            stream.playbackUrl;
          videoRef.current.play();
        }
      }

      // Setup Socket.IO for Chat & Gifts
      if (
        stream
      ) {
        socketRef.current =
          io(
            import.meta
              .env
              .VITE_API_URL ||
              "http://localhost:5000",
          ); // Best practice to env var this too
        socketRef.current.emit(
          "join_live_chat",
          {
            streamId:
              stream._id,
          },
        );

        socketRef.current.on(
          "live_message",
          (
            msg,
          ) => {
            setMessages(
              (
                prev,
              ) => [
                ...prev,
                msg,
              ],
            );
          },
        );

        // The Flex: Flashy Live Gift Event
        socketRef.current.on(
          "live_gift_received",
          (
            giftData,
          ) => {
            setMessages(
              (
                prev,
              ) => [
                ...prev,
                {
                  isGift: true,
                  text: giftData.message,
                  id: Date.now(),
                },
              ],
            );
          },
        );

        return () => {
          socketRef.current.disconnect();
        };
      }
    }, [
      stream,
    ]);

    // Auto-scroll chat to bottom
    useEffect(() => {
      chatEndRef.current?.scrollIntoView(
        {
          behavior:
            "smooth",
        },
      );
    }, [
      messages,
    ]);

    // --- 2. CHAT HANDLER ---
    const handleSendMessage =
      (
        e,
      ) => {
        e.preventDefault();
        if (
          !chatInput.trim() ||
          !socketRef.current
        )
          return;

        const user =
          JSON.parse(
            localStorage.getItem(
              "nippy_user",
            ) ||
              "{}",
          );
        const msgPayload =
          {
            streamId:
              stream._id,
            senderName:
              user.username ||
              "Fan",
            text: chatInput,
            id: Date.now(),
          };

        socketRef.current.emit(
          "send_live_message",
          msgPayload,
        );
        setChatInput(
          "",
        );
      };

    // --- 3. GIFTING HANDLER (The Money Maker) ---
    const handleSendGift =
      async () => {
        setIsProcessingGift(
          true,
        );
        setGiftError(
          "",
        );

        try {
          if (
            paymentMethod ===
            "CRYPTO"
          ) {
            // 1. Get Crypto Quote for NGN amount
            // THE FIX: Clean, centralized API call
            const quoteRes =
              await api.post(
                "/purchases/crypto-quote",
                {
                  amountUSD:
                    giftAmountNGN /
                    1500, // Rough static conversion just for quote request, backend handles true logic
                },
              );

            // 2. Execute Web3 Transfer
            const txHash =
              await transferUSDT(
                quoteRes
                  .data
                  .requiredUSDT,
                stream
                  .creator
                  .walletAddress,
              );

            if (
              !txHash
            )
              throw new Error(
                "Transaction failed or was rejected.",
              );

            // 3. Verify Payment
            // THE FIX: Clean, centralized API call
            await api.post(
              "/purchases/verify",
              {
                creatorId:
                  stream
                    .creator
                    ._id,
                streamId:
                  stream._id,
                purchaseType:
                  "LIVE_GIFT",
                paymentMethod:
                  "CRYPTO",
                txHash,
                baseGiftAmountNGN:
                  giftAmountNGN,
              },
            );
          } else {
            // FIAT (Paystack) Execution
            const user =
              JSON.parse(
                localStorage.getItem(
                  "nippy_user",
                ) ||
                  "{}",
              );

            const handler =
              window.PaystackPop.setup(
                {
                  key: import.meta
                    .env
                    .VITE_PAYSTACK_PUBLIC_KEY,
                  email:
                    user.email,
                  amount:
                    giftAmountNGN *
                    100, // Paystack uses kobo
                  currency:
                    "NGN",
                  callback:
                    async (
                      response,
                    ) => {
                      // THE FIX: Clean, centralized API call
                      await api.post(
                        "/purchases/verify",
                        {
                          creatorId:
                            stream
                              .creator
                              ._id,
                          streamId:
                            stream._id,
                          purchaseType:
                            "LIVE_GIFT",
                          paymentMethod:
                            "FIAT",
                          reference:
                            response.reference,
                          baseGiftAmountNGN:
                            giftAmountNGN,
                        },
                      );
                      setIsGiftDrawerOpen(
                        false,
                      );
                    },
                  onClose:
                    () => {
                      setGiftError(
                        "Payment cancelled.",
                      );
                      setIsProcessingGift(
                        false,
                      );
                    },
                },
              );
            handler.openIframe();
            return; // Pause execution here until callback runs
          }

          setIsGiftDrawerOpen(
            false,
          );
        } catch (err) {
          setGiftError(
            err
              .response
              ?.data
              ?.message ||
              err.message ||
              "Gifting failed.",
          );
        } finally {
          setIsProcessingGift(
            false,
          );
        }
      };

    // --- RENDER BLOCKS ---

    if (
      loading
    ) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-emerald-500">
          <Loader2
            className="animate-spin"
            size={
              40
            }
          />
        </div>
      );
    }

    // Upsell Screen if not subscribed
    if (
      requiresSub
    ) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-6">
          <Lock
            className="text-emerald-500 mb-4"
            size={
              48
            }
          />
          <h2 className="text-2xl font-bold text-white mb-2">
            Subscriber
            Exclusive
            Live
          </h2>
          <p className="text-slate-400 mb-6 text-center max-w-md">
            You
            need
            an
            active
            subscription
            to
            watch
            this
            creator
            go
            live.
            Subscribe
            now
            to
            join
            the
            room!
          </p>
          <button
            onClick={() =>
              navigate(
                `/creator/${id}`,
              )
            }
            className="bg-emerald-500 text-white font-bold py-3 px-8 rounded-full hover:bg-emerald-600 transition-colors"
          >
            Subscribe
            for
            NGN{" "}
            {
              subPrice
            }
          </button>
        </div>
      );
    }

    if (
      error
    ) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-red-500">
          {
            error
          }
        </div>
      );
    }

    return (
      <div className="flex flex-col md:flex-row h-screen w-full bg-black relative overflow-hidden">
        {/* --- VIDEO PANE --- */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          <video
            ref={
              videoRef
            }
            controls
            autoPlay
            muted
            className="w-full h-full object-contain"
          />
          <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
            LIVE
          </div>
          <div className="absolute top-4 left-20 bg-slate-900/60 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full">
            {
              stream.title
            }
          </div>
        </div>

        {/* --- CHAT PANE --- */}
        <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-1/2 md:h-full relative">
          <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center z-10">
            <h3 className="text-white font-bold flex items-center gap-2">
              <MessageSquare
                size={
                  18
                }
                className="text-emerald-500"
              />{" "}
              Live
              Chat
            </h3>
            <button
              onClick={() =>
                setIsGiftDrawerOpen(
                  true,
                )
              }
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-2 rounded-full hover:scale-105 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            >
              <Gift
                size={
                  18
                }
              />
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(
              (
                msg,
                idx,
              ) => (
                <div
                  key={
                    idx
                  }
                  className={`text-sm ${
                    msg.isGift
                      ? "bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/30 p-3 rounded-xl"
                      : ""
                  }`}
                >
                  {msg.isGift ? (
                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 flex items-center gap-2">
                      <Gift
                        size={
                          16
                        }
                        className="text-pink-400"
                      />{" "}
                      {
                        msg.text
                      }
                    </span>
                  ) : (
                    <p>
                      <span className="font-bold text-slate-400 mr-2">
                        {
                          msg.senderName
                        }
                        :
                      </span>
                      <span className="text-slate-200">
                        {
                          msg.text
                        }
                      </span>
                    </p>
                  )}
                </div>
              ),
            )}
            <div
              ref={
                chatEndRef
              }
            />
          </div>

          {/* Chat Input */}
          <form
            onSubmit={
              handleSendMessage
            }
            className="p-4 border-t border-slate-800 bg-slate-950"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={
                  chatInput
                }
                onChange={(
                  e,
                ) =>
                  setChatInput(
                    e
                      .target
                      .value,
                  )
                }
                placeholder="Say something..."
                className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 text-sm"
              />
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-xl transition-colors"
              >
                <Send
                  size={
                    18
                  }
                />
              </button>
            </div>
          </form>

          {/* --- SLIDING GIFT DRAWER --- */}
          <div
            className={`absolute top-0 right-0 w-full h-full bg-slate-900 border-l border-slate-800 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
              isGiftDrawerOpen
                ? "translate-x-0"
                : "translate-x-full"
            }`}
          >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Gift
                  size={
                    18
                  }
                  className="text-purple-500"
                />{" "}
                Send
                a
                Gift
              </h3>
              <button
                onClick={() =>
                  setIsGiftDrawerOpen(
                    false,
                  )
                }
                className="text-slate-400 hover:text-white"
              >
                <X
                  size={
                    20
                  }
                />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-6">
              {giftError && (
                <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm flex gap-2">
                  <AlertCircle
                    size={
                      16
                    }
                    className="shrink-0 mt-0.5"
                  />{" "}
                  {
                    giftError
                  }
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">
                  Select
                  Amount
                  (NGN)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    1000,
                    5000,
                    10000,
                    25000,
                    50000,
                  ].map(
                    (
                      amount,
                    ) => (
                      <button
                        key={
                          amount
                        }
                        onClick={() =>
                          setGiftAmountNGN(
                            amount,
                          )
                        }
                        className={`py-2 rounded-lg text-sm font-bold transition-all ${
                          giftAmountNGN ===
                          amount
                            ? "bg-purple-500 text-white border-transparent"
                            : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                        }`}
                      >
                        ₦
                        {amount /
                          1000}
                        k
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">
                  Payment
                  Method
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPaymentMethod(
                        "CRYPTO",
                      )
                    }
                    className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl border transition-all ${
                      paymentMethod ===
                      "CRYPTO"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    <Wallet
                      size={
                        16
                      }
                    />{" "}
                    Web3
                  </button>
                  <button
                    onClick={() =>
                      setPaymentMethod(
                        "FIAT",
                      )
                    }
                    className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl border transition-all ${
                      paymentMethod ===
                      "FIAT"
                        ? "bg-blue-500/10 border-blue-500 text-blue-500"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    <CreditCard
                      size={
                        16
                      }
                    />{" "}
                    Card
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950">
              <button
                onClick={
                  handleSendGift
                }
                disabled={
                  isProcessingGift
                }
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isProcessingGift ? (
                  <Loader2
                    className="animate-spin"
                    size={
                      20
                    }
                  />
                ) : (
                  `Send NGN ${giftAmountNGN} Gift`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

export default LivePlayer;
