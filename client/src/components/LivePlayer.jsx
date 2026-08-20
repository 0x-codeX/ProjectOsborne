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
  Crown,
} from "lucide-react";
import { useWeb3Transfer } from "../hooks/useWeb3Transfer";
import { usePaystackPayment } from "react-paystack";

const LivePlayer =
  () => {
    const {
      id,
    } =
      useParams();
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
    const [
      creatorIdToSub,
      setCreatorIdToSub,
    ] =
      useState(
        null,
      );

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
    const [
      pinnedGifts,
      setPinnedGifts,
    ] =
      useState(
        [],
      );

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
        null,
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

    // --- CRYPTO QUOTE STATE ---
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

    const {
      transferUSDT,
    } =
      useWeb3Transfer();

    const initializePayment =
      usePaystackPayment(
        {
          publicKey:
            import.meta
              .env
              .VITE_PAYSTACK_PUBLIC_KEY,
        },
      );

    // Fetch Stream logic
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

    // Sockets logic
    useEffect(() => {
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
          ) =>
            setMessages(
              (
                prev,
              ) => [
                ...prev,
                msg,
              ],
            ),
        );

        socketRef.current.on(
          "live_gift_received",
          (
            giftData,
          ) => {
            if (
              giftData.streamId ===
              stream._id
            ) {
              const giftId =
                Date.now();
              const newGift =
                {
                  isGift: true,
                  text: giftData.message,
                  amount:
                    giftData.amount,
                  fanName:
                    giftData.fanName ||
                    "A Fan",
                  id: giftId,
                };
              setMessages(
                (
                  prev,
                ) => [
                  ...prev,
                  newGift,
                ],
              );
              setPinnedGifts(
                (
                  prev,
                ) => {
                  const updated =
                    [
                      ...prev,
                      newGift,
                    ]
                      .sort(
                        (
                          a,
                          b,
                        ) =>
                          b.amount -
                          a.amount,
                      )
                      .slice(
                        0,
                        3,
                      );
                  return updated;
                },
              );
              setTimeout(
                () => {
                  setPinnedGifts(
                    (
                      prev,
                    ) =>
                      prev.filter(
                        (
                          g,
                        ) =>
                          g.id !==
                          giftId,
                      ),
                  );
                },
                10000,
              );
            }
          },
        );

        socketRef.current.on(
          "live_stream_ended",
          (
            data,
          ) => {
            if (
              data.streamId ===
              stream._id
            )
              setError(
                "This live stream has ended.",
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

    useEffect(() => {
      chatEndRef.current?.scrollIntoView(
        {
          behavior:
            "smooth",
        },
      );
    }, [
      messages,
      pinnedGifts,
    ]);

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
            isCreator: false,
            text: chatInput,
            id: Date.now(),
          };

        socketRef.current.emit(
          "send_live_message",
          msgPayload,
        );
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

    // --- NGN TO USD TO USDT CONVERSION ---
    const fetchCryptoQuote =
      async (
        amountNGN,
      ) => {
        setFetchingQuote(
          true,
        );
        setGiftError(
          "",
        );
        try {
          // Step 1: Convert to USD
          const amountUSD =
            amountNGN /
            1500;
          // Step 2: Ask backend for exact USDT
          const quoteRes =
            await api.post(
              "/purchases/crypto-quote",
              {
                amountUSD,
              },
            );
          setCryptoQuote(
            quoteRes.data,
          );
        } catch (err) {
          setGiftError(
            "Failed to fetch live crypto rates from server.",
          );
        } finally {
          setFetchingQuote(
            false,
          );
        }
      };

    const handleAmountSelect =
      (
        amount,
      ) => {
        setGiftAmountNGN(
          amount,
        );
        if (
          paymentMethod ===
          "CRYPTO"
        ) {
          fetchCryptoQuote(
            amount,
          );
        }
      };

    const handleSelectCrypto =
      () => {
        setPaymentMethod(
          "CRYPTO",
        );
        fetchCryptoQuote(
          giftAmountNGN,
        );
      };

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
            if (
              !stream
                .creator
                ?.walletAddress
            )
              throw new Error(
                "Creator missing Web3 wallet.",
              );
            if (
              !cryptoQuote
            )
              throw new Error(
                "Awaiting crypto rate conversion...",
              );

            // We pass stream._id as the 3rd arg so contentId is not empty (0x000...)
            const txHash =
              await transferUSDT(
                stream
                  .creator
                  .walletAddress,
                cryptoQuote.requiredUSDT,
                stream._id,
              );
            if (
              !txHash
            )
              throw new Error(
                "Transaction failed or was rejected.",
              );

            // Must match backend expected fields exactly
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
                txHash:
                  txHash,
                baseGiftAmountNGN:
                  giftAmountNGN,
              },
            );

            setIsGiftDrawerOpen(
              false,
            );
          } else {
            const user =
              JSON.parse(
                localStorage.getItem(
                  "nippy_user",
                ) ||
                  "{}",
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
                      user?.email ||
                      "fan@nippy.com",
                    amount:
                      giftAmountNGN *
                      100, // Kobo
                    currency:
                      "NGN",
                  },
                onSuccess:
                  async (
                    reference,
                  ) => {
                    try {
                      // Same payload structure for fiat
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
                            reference.reference,
                          baseGiftAmountNGN:
                            giftAmountNGN,
                        },
                      );
                      setIsGiftDrawerOpen(
                        false,
                      );
                    } catch (err) {
                      setGiftError(
                        err
                          .response
                          ?.data
                          ?.message ||
                          "Verification failed on backend.",
                      );
                    }
                  },
                onClose:
                  () => {
                    setGiftError(
                      "Payment window closed.",
                    );
                  },
              },
            );
          }
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

    if (
      loading
    )
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
    if (
      requiresSub
    ) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
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
              need
              an
              active
              subscription
              to
              watch
              this
              live
              stream.
            </p>
            <button
              onClick={() =>
                navigate(
                  `/creator/${creatorIdToSub}`,
                )
              }
              className="w-full bg-emerald-500 text-white font-bold py-4 rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
            >
              <Play
                size={
                  18
                }
                fill="currentColor"
              />{" "}
              Subscribe
              for
              ₦
              {subPrice.toLocaleString()}
            </button>
          </div>
        </div>
      );
    }
    if (
      error
    )
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
          {
            error
          }
        </div>
      );

    return (
      <div className="flex flex-col md:flex-row h-screen w-full bg-black relative overflow-hidden font-sans">
        <div className="flex-1 relative bg-black flex items-center justify-center">
          <iframe
            src={`https://lvpr.tv?v=${stream.playbackId}`}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            frameBorder="0"
          />
          <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-black tracking-widest px-3 py-1.5 rounded-md animate-pulse">
            LIVE
          </div>
        </div>

        <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-1/2 md:h-full relative shrink-0">
          <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center z-30 relative">
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
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-2 rounded-full shadow-lg hover:scale-105"
            >
              <Gift
                size={
                  18
                }
              />
            </button>
          </div>

          {pinnedGifts.length >
            0 && (
            <div className="absolute top-[70px] left-0 w-full z-20 flex flex-col gap-1 p-3 pointer-events-none">
              {pinnedGifts.map(
                (
                  gift,
                ) => (
                  <div
                    key={
                      gift.id
                    }
                    className="bg-gradient-to-r from-yellow-600 to-purple-700 border border-yellow-400 p-2.5 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.4)] animate-pulse flex justify-between items-center backdrop-blur-md"
                  >
                    <span className="font-bold text-white text-xs flex items-center gap-1">
                      <Crown
                        size={
                          14
                        }
                        className="text-yellow-300"
                      />{" "}
                      {
                        gift.fanName
                      }
                    </span>
                    <span className="font-black text-yellow-200 text-sm tracking-wider">
                      ₦
                      {gift.amount?.toLocaleString()}
                    </span>
                  </div>
                ),
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3 z-10 relative">
            {messages.map(
              (
                msg,
                idx,
              ) => (
                <div
                  key={
                    idx
                  }
                  className={`w-full flex ${msg.isCreator ? "justify-end" : "justify-start"}`}
                >
                  {msg.isGift ? (
                    <div className="bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-purple-500/50 p-3 rounded-2xl w-[85%]">
                      <span className="font-bold text-pink-400 flex items-center gap-2 text-sm">
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
                    </div>
                  ) : msg.isCreator ? (
                    <div className="max-w-[85%] bg-emerald-900/40 border border-emerald-500/50 p-3 rounded-2xl rounded-tr-sm text-right shadow-lg">
                      <div className="text-xs font-black text-emerald-400 mb-1 animate-[pulse_1s_ease-in-out_2]">
                        {
                          msg.senderName
                        }{" "}
                        (Creator)
                      </div>
                      <div className="text-white text-sm">
                        {
                          msg.text
                        }
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[85%] text-sm">
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
                    </div>
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

          <form
            onSubmit={
              handleSendMessage
            }
            className="p-4 border-t border-slate-800 bg-slate-950 z-30"
          >
            <div className="flex gap-2 relative">
              <input
                type="text"
                maxLength={
                  140
                }
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
                className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2 pr-12 focus:outline-none focus:border-emerald-500 text-sm"
              />
              <span
                className={`absolute right-14 top-2.5 text-xs ${chatInput.length >= 140 ? "text-red-400" : "text-slate-500"}`}
              >
                {
                  chatInput.length
                }
                /140
              </span>
              <button
                type="submit"
                disabled={
                  !chatInput.trim()
                }
                className="bg-emerald-500 text-white p-2 rounded-xl transition-colors disabled:opacity-50"
              >
                <Send
                  size={
                    18
                  }
                />
              </button>
            </div>
          </form>

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
                onClick={() => {
                  setIsGiftDrawerOpen(
                    false,
                  );
                  setPaymentMethod(
                    null,
                  );
                  setCryptoQuote(
                    null,
                  );
                }}
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
                          handleAmountSelect(
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
                    onClick={
                      handleSelectCrypto
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

              {/* --- VISUAL CONVERSION DISPLAY --- */}
              {paymentMethod ===
                "CRYPTO" && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center animate-in fade-in">
                  {fetchingQuote ? (
                    <p className="text-sm text-emerald-500 animate-pulse">
                      Fetching
                      live
                      USDT
                      quote...
                    </p>
                  ) : cryptoQuote ? (
                    <>
                      <p className="text-sm text-gray-400 mb-1">
                        Converted
                        Value
                      </p>
                      <p className="text-xl font-bold text-emerald-400">
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
                        Live
                        API
                        Rate
                        Applied
                      </p>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950">
              <button
                onClick={
                  handleSendGift
                }
                disabled={
                  isProcessingGift ||
                  !paymentMethod ||
                  (paymentMethod ===
                    "CRYPTO" &&
                    (!cryptoQuote ||
                      fetchingQuote))
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
