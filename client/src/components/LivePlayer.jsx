import React, {
  useState,
  useEffect,
  useRef,
} from "react";
import {
  useParams,
  useNavigate,
} from "react-router-dom";
import api from "../utils/api";
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
  Play,
} from "lucide-react";
import { useWeb3Transfer } from "../hooks/useWeb3Transfer";

const LivePlayer =
  () => {
    const {
      id,
    } =
      useParams(); // This is the STREAM ID
    const navigate =
      useNavigate();

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

    // Paywall State
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
    const [
      creatorIdToSub,
      setCreatorIdToSub,
    ] =
      useState(
        null,
      ); // Fixed the navigation bug!

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
      );
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
              // THE FIX: Save the actual creator ID so the subscribe button routes correctly
              setRequiresSub(
                true,
              );
              setSubPrice(
                err
                  .response
                  .data
                  .subscriptionPriceNGN,
              );
              setCreatorIdToSub(
                err
                  .response
                  .data
                  .creatorId,
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
      // Setup Socket.IO for Chat & Gifts
      if (
        stream
      ) {
        socketRef.current =
          io(
            import.meta.env.VITE_API_URL?.replace(
              "/api",
              "",
            ) ||
              "http://localhost:5000",
          );

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

        // Listen for the stream ending so we can boot the fan out
        socketRef.current.on(
          "live_stream_ended",
          (
            data,
          ) => {
            if (
              data.streamId ===
              stream._id
            ) {
              setError(
                "This live stream has ended.",
              );
            }
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

        // OPTIMISTIC UPDATE: Fan sees their own message instantly
        setMessages(
          (
            prev,
          ) => [
            ...prev,
            msgPayload,
          ],
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
            const quoteRes =
              await api.post(
                "/purchases/crypto-quote",
                {
                  amountUSD:
                    giftAmountNGN /
                    1500,
                },
              );

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
                    100,
                  currency:
                    "NGN",
                  callback:
                    async (
                      response,
                    ) => {
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
            return;
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

    // --- THE PAYWALL ---
    if (
      requiresSub
    ) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
          {/* Cinematic Blur Background */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516280440502-a7f457788195?q=80&w=2000')] bg-cover bg-center opacity-10"></div>

          <div className="z-10 bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <Lock
                className="text-red-500"
                size={
                  32
                }
              />
            </div>
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
              Subscriber
              Exclusive
            </h2>
            <p className="text-slate-400 mb-8 text-sm">
              You
              are
              missing
              out!
              You
              need
              an
              active
              subscription
              to
              watch
              this
              live
              stream
              and
              join
              the
              chat
              room.
            </p>

            {/* THE FIX: Routes securely to the Creator's profile using creatorIdToSub */}
            <button
              onClick={() =>
                navigate(
                  `/creator/${creatorIdToSub}`,
                )
              }
              className="w-full bg-emerald-500 text-white font-bold py-4 rounded-xl hover:bg-emerald-600 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 flex items-center justify-center gap-2"
            >
              <Play
                size={
                  18
                }
                fill="currentColor"
              />
              Subscribe
              for
              ₦
              {subPrice.toLocaleString()}
            </button>

            <button
              onClick={() =>
                navigate(
                  -1,
                )
              }
              className="mt-4 text-slate-500 text-sm hover:text-white transition-colors"
            >
              Go
              Back
            </button>
          </div>
        </div>
      );
    }

    if (
      error
    ) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
          <AlertCircle
            className="text-red-500 mb-4"
            size={
              48
            }
          />
          <h2 className="text-xl font-bold text-white mb-2">
            {
              error
            }
          </h2>
          <button
            onClick={() =>
              navigate(
                "/feed",
              )
            }
            className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
          >
            Return
            to
            Feed
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col md:flex-row h-screen w-full bg-black relative overflow-hidden">
        {/* --- VIDEO PANE --- */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          {/* THE ENTERPRISE FIX: Livepeer's bulletproof playback iframe */}
          <iframe
            src={`https://lvpr.tv?v=${stream.playbackId}`}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            frameBorder="0"
          />

          <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-black tracking-widest px-3 py-1.5 rounded-md shadow-[0_0_15px_rgba(220,38,38,0.6)] animate-pulse pointer-events-none">
            LIVE
          </div>
          <div className="absolute top-4 left-20 bg-slate-900/80 backdrop-blur border border-slate-700 text-white text-xs font-bold px-4 py-1.5 rounded-md pointer-events-none">
            {
              stream.title
            }
          </div>
        </div>

        {/* --- CHAT PANE --- */}
        <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-1/2 md:h-full relative shrink-0">
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
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-2 rounded-full hover:scale-110 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.4)]"
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
            {messages.length ===
              0 && (
              <p className="text-center text-slate-500 text-sm mt-10">
                Say
                hi
                to{" "}
                {
                  stream
                    .creator
                    .username
                }
                !
              </p>
            )}
            {messages.map(
              (
                msg,
                idx,
              ) => (
                <div
                  key={
                    idx
                  }
                  className={`text-sm ${msg.isGift ? "bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/30 p-3 rounded-xl" : ""}`}
                >
                  {msg.isGift ? (
                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 flex items-center gap-2">
                      <Gift
                        size={
                          16
                        }
                        className="text-pink-400 shrink-0"
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
                placeholder="Send a message..."
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
            className={`absolute top-0 right-0 w-full h-full bg-slate-900 border-l border-slate-800 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isGiftDrawerOpen ? "translate-x-0" : "translate-x-full"}`}
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
                        className={`py-2 rounded-lg text-sm font-bold transition-all ${giftAmountNGN === amount ? "bg-purple-500 text-white border-transparent" : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"}`}
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
                    className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl border transition-all ${paymentMethod === "CRYPTO" ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"}`}
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
                    className={`flex-1 py-3 flex justify-center items-center gap-2 rounded-xl border transition-all ${paymentMethod === "FIAT" ? "bg-blue-500/10 border-blue-500 text-blue-500" : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"}`}
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
                  `Send NGN ${giftAmountNGN.toLocaleString()} Gift`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

export default LivePlayer;
