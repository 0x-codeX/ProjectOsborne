import React, {
  useState,
  useEffect,
  useRef,
} from "react";
import {
  useParams,
  useNavigate,
} from "react-router-dom";
import AgoraRTC from "agora-rtc-sdk-ng";
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
  VideoOff,
} from "lucide-react";
import { useWeb3Transfer } from "../hooks/useWeb3Transfer";

// ECONOMIC REALITY CONFIGURATION
const CURRENCY_CONFIG =
  {
    USD: {
      symbol:
        "$",
      tiers:
        [
          1,
          5,
          10,
          20,
          50,
        ],
      min: 1,
    },
    NGN: {
      symbol:
        "₦",
      tiers:
        [
          1000,
          2000,
          5000,
          10000,
          20000,
        ],
      min: 1000,
    },
    GHS: {
      symbol:
        "GH₵",
      tiers:
        [
          10,
          20,
          50,
          100,
          200,
        ],
      min: 10,
    },
  };

const LivePlayer =
  () => {
    const {
      id,
    } =
      useParams();
    const navigate =
      useNavigate();

    // 1. ALL REFS
    const chatEndRef =
      useRef(
        null,
      );
    const socketRef =
      useRef(
        null,
      );
    const remoteVideoRef =
      useRef(
        null,
      );
    const agoraClientRef =
      useRef(
        null,
      );

    // 2. ALL STATE
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

    // UI Upgrades State
    const [
      floatingGifts,
      setFloatingGifts,
    ] =
      useState(
        [],
      );
    const [
      giftTally,
      setGiftTally,
    ] =
      useState(
        {},
      );
    const [
      topGifters,
      setTopGifters,
    ] =
      useState(
        [],
      );
    const [
      showLeaderboard,
      setShowLeaderboard,
    ] =
      useState(
        false,
      );
    const leaderboardTimerRef =
      useRef(
        null,
      );

    const [
      isGiftDrawerOpen,
      setIsGiftDrawerOpen,
    ] =
      useState(
        false,
      );
    const [
      fanCurrency,
      setFanCurrency,
    ] =
      useState(
        "USD",
      );
    const [
      giftAmount,
      setGiftAmount,
    ] =
      useState(
        1,
      );
    const [
      isCustomAmount,
      setIsCustomAmount,
    ] =
      useState(
        false,
      );
    const [
      exchangeRates,
      setExchangeRates,
    ] =
      useState(
        {
          USD: 1,
          NGN: 1500,
          GHS: 15,
        },
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

    // 3. EFFECTS
    useEffect(() => {
      const user =
        JSON.parse(
          localStorage.getItem(
            "nippy_user",
          ) ||
            "{}",
        );
      const pref =
        user.preferredCurrency;
      const currency =
        CURRENCY_CONFIG[
          pref
        ]
          ? pref
          : "USD";

      setFanCurrency(
        currency,
      );
      setGiftAmount(
        CURRENCY_CONFIG[
          currency
        ]
          .tiers[0],
      );

      api
        .get(
          "/purchases/exchange-rates",
        )
        .then(
          (
            res,
          ) =>
            setExchangeRates(
              res.data,
            ),
        )
        .catch(
          console.error,
        );
    }, []);

    useEffect(() => {
      const fetchStream =
        async () => {
          try {
            const res =
              await api.get(
                `/streams/${id}`,
              );
            if (
              res
                .data
                .stream
                .status ===
              "ENDED"
            ) {
              setError(
                `${res.data.stream.creator?.username || "The creator"} has ended their live stream`,
              );
            } else {
              setStream(
                res
                  .data
                  .stream,
              );
            }
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
              "https://nippy-serverside.onrender.com"
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
              String(
                giftData.streamId,
              ) ===
              String(
                stream._id,
              )
            ) {
              const bubbleId =
                Date.now() +
                Math.random();
              const fanName =
                giftData.fanName ||
                "A Fan";
              const newGiftMsg =
                {
                  isGift: true,
                  text: giftData.message,
                  amount:
                    giftData.amount,
                  fanName:
                    fanName,
                  id: bubbleId,
                };

              // 1. Add to Chat Log
              setMessages(
                (
                  prev,
                ) => [
                  ...prev,
                  newGiftMsg,
                ],
              );

              // 2. Spawn Floating Bubble Animation
              setFloatingGifts(
                (
                  prev,
                ) => [
                  ...prev,
                  {
                    id: bubbleId,
                    fanName:
                      fanName,
                    rawAmount:
                      giftData.rawAmount,
                    rawCurrency:
                      giftData.rawCurrency,
                  },
                ],
              );
              setTimeout(
                () => {
                  setFloatingGifts(
                    (
                      prev,
                    ) =>
                      prev.filter(
                        (
                          b,
                        ) =>
                          b.id !==
                          bubbleId,
                      ),
                  );
                },
                4000,
              ); // Clean up after CSS animation completes

              // 3. Update Cumulative Leaderboard
              setGiftTally(
                (
                  prevTally,
                ) => {
                  const currentTotal =
                    prevTally[
                      fanName
                    ] ||
                    0;
                  const newTotal =
                    currentTotal +
                    Number(
                      giftData.amount ||
                        0,
                    ); // Accumulate based on DB Base Price to keep ranks normalized
                  const updatedTally =
                    {
                      ...prevTally,
                      [fanName]:
                        newTotal,
                    };

                  const sortedTop3 =
                    Object.entries(
                      updatedTally,
                    )
                      .map(
                        ([
                          name,
                          total,
                        ]) => ({
                          fanName:
                            name,
                          totalAmount:
                            total,
                        }),
                      )
                      .sort(
                        (
                          a,
                          b,
                        ) =>
                          b.totalAmount -
                          a.totalAmount,
                      )
                      .slice(
                        0,
                        3,
                      ); // Extract Top 3

                  setTopGifters(
                    sortedTop3,
                  );
                  setShowLeaderboard(
                    true,
                  );

                  if (
                    leaderboardTimerRef.current
                  )
                    clearTimeout(
                      leaderboardTimerRef.current,
                    );
                  leaderboardTimerRef.current =
                    setTimeout(
                      () => {
                        setShowLeaderboard(
                          false,
                        );
                      },
                      180000,
                    ); // Remains sticky for exactly 3 minutes

                  return updatedTally;
                },
              );
            }
          },
        );

        // The Kill Switch Listener
        socketRef.current.on(
          "live_stream_ended",
          (
            data,
          ) => {
            if (
              String(
                data.streamId,
              ) ===
              String(
                stream._id,
              )
            ) {
              // Sever Agora connection immediately
              if (
                agoraClientRef.current
              ) {
                agoraClientRef.current.leave();
              }
              // Unmount the studio and display the exact requested text
              setError(
                `${stream.creator?.username || "The creator"} has ended their live stream`,
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

    useEffect(() => {
      chatEndRef.current?.scrollIntoView(
        {
          behavior:
            "smooth",
        },
      );
    }, [
      messages,
      topGifters, // FIXED: Updated dependency to the new state
    ]);

    useEffect(() => {
      if (
        stream &&
        stream.agoraToken &&
        !requiresSub
      ) {
        const initAgora =
          async () => {
            const client =
              AgoraRTC.createClient(
                {
                  mode: "live",
                  codec:
                    "vp8",
                },
              );
            agoraClientRef.current =
              client;
            await client.setClientRole(
              "audience",
            );

            client.on(
              "user-published",
              async (
                user,
                mediaType,
              ) => {
                await client.subscribe(
                  user,
                  mediaType,
                );
                if (
                  mediaType ===
                  "video"
                ) {
                  if (
                    remoteVideoRef.current
                  ) {
                    remoteVideoRef.current.innerHTML =
                      "";
                    user.videoTrack.play(
                      remoteVideoRef.current,
                      {
                        fit: "cover",
                      },
                    );
                  }
                }
                if (
                  mediaType ===
                  "audio"
                ) {
                  user.audioTrack.play();
                }
              },
            );

            client.on(
              "user-unpublished",
              (
                user,
                mediaType,
              ) => {
                if (
                  mediaType ===
                    "video" &&
                  remoteVideoRef.current
                ) {
                  remoteVideoRef.current.innerHTML =
                    "";
                }
              },
            );

            try {
              await client.join(
                stream.agoraAppId,
                String(
                  stream._id,
                ),
                stream.agoraToken,
                null,
              );
            } catch (e) {
              console.error(
                "Agora join failed",
                e,
              );
            }
          };
        initAgora();
      }

      return () => {
        if (
          agoraClientRef.current
        )
          agoraClientRef.current.leave();
      };
    }, [
      stream,
      requiresSub,
    ]);

    useEffect(() => {
      if (
        paymentMethod ===
        "CRYPTO"
      ) {
        const fetchCryptoQuote =
          async () => {
            setFetchingQuote(
              true,
            );
            setGiftError(
              "",
            );
            try {
              const rate =
                exchangeRates[
                  fanCurrency
                ] ||
                1;
              const amountUSD =
                fanCurrency ===
                "USD"
                  ? giftAmount
                  : giftAmount /
                    rate;
              const quoteRes =
                await api.post(
                  "/purchases/crypto-quote",
                  {
                    amountUSD,
                    rawAmountUSD:
                      amountUSD,
                  },
                );
              setCryptoQuote(
                quoteRes.data,
              );
            } catch (err) {
              setGiftError(
                "Failed to fetch live crypto rates.",
              );
            } finally {
              setFetchingQuote(
                false,
              );
            }
          };

        const delay =
          setTimeout(
            () => {
              if (
                giftAmount >=
                CURRENCY_CONFIG[
                  fanCurrency
                ]
                  .min
              ) {
                fetchCryptoQuote();
              }
            },
            600,
          );
        return () =>
          clearTimeout(
            delay,
          );
      }
    }, [
      giftAmount,
      paymentMethod,
      fanCurrency,
      exchangeRates,
    ]);

    // 4. HANDLERS
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

    const handleSelectCrypto =
      () => {
        setPaymentMethod(
          "CRYPTO",
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
                "This creator has not connected a Web3 wallet yet.",
              );
            if (
              !cryptoQuote
            )
              throw new Error(
                "Awaiting live crypto rate conversion...",
              );

            const txHash =
              await transferUSDT(
                stream
                  .creator
                  .walletAddress,
                cryptoQuote.requiredUSDT,
                cryptoQuote.rawUSDT ||
                  cryptoQuote.requiredUSDT,
                stream._id,
              );
            if (
              !txHash
            )
              throw new Error(
                "Web3 transaction failed or was rejected.",
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
                txHash:
                  txHash,
                rawAmount:
                  giftAmount,
                rawCurrency:
                  fanCurrency,
              },
            );
            setIsGiftDrawerOpen(
              false,
            );
            setIsProcessingGift(
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
            const baseNGNRate =
              exchangeRates.NGN ||
              1500;
            const currentFanRate =
              exchangeRates[
                fanCurrency
              ] ||
              1;
            const chargeAmountNGN =
              fanCurrency ===
              "NGN"
                ? giftAmount
                : Math.round(
                    giftAmount *
                      (baseNGNRate /
                        currentFanRate),
                  );

            const initRes =
              await api.post(
                "/purchases/initialize-fiat",
                {
                  amount:
                    chargeAmountNGN,
                  currency:
                    "NGN",
                  email:
                    user?.email ||
                    "fan@nippy.com",
                  creatorId:
                    stream
                      .creator
                      ._id,
                  streamId:
                    stream._id,
                  rawAmount:
                    giftAmount,
                  rawCurrency:
                    fanCurrency,
                },
              );

            const payWindow =
              window.open(
                initRes
                  .data
                  .authorization_url,
                "PaystackSecureCheckout",
                "width=500,height=700,left=200,top=100,scrollbars=yes",
              );

            const checkWindow =
              setInterval(
                async () => {
                  if (
                    payWindow &&
                    payWindow.closed
                  ) {
                    clearInterval(
                      checkWindow,
                    );
                    try {
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
                            initRes
                              .data
                              .reference,
                          rawAmount:
                            giftAmount,
                          rawCurrency:
                            fanCurrency,
                        },
                      );
                      setIsGiftDrawerOpen(
                        false,
                      );
                    } catch (err) {
                      setGiftError(
                        "Payment was cancelled or failed security verification.",
                      );
                    } finally {
                      setIsProcessingGift(
                        false,
                      );
                    }
                  }
                },
                1000,
              );
          }
        } catch (err) {
          setGiftError(
            err
              .response
              ?.data
              ?.message ||
              err.message ||
              "Gifting network failed. Try again.",
          );
          setIsProcessingGift(
            false,
          );
        }
      };

    // 5. EARLY RETURNS
    if (
      loading
    )
      return (
        <div className="h-[calc(100vh-80px)] w-full flex items-center justify-center bg-slate-950 text-emerald-500">
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
    ) {
      return (
        <div className="h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center bg-slate-950 p-6 relative overflow-hidden font-sans">
          <div className="z-10 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500 text-center">
            <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mb-2 mx-auto">
              <VideoOff
                size={
                  24
                }
                className="text-slate-500"
              />
            </div>
            <h2 className="text-xl font-bold text-slate-300 max-w-sm leading-snug">
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
              className="mt-4 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
            >
              Continue
              to
              Explore
            </button>
          </div>
        </div>
      );
    }

    const currentConfig =
      CURRENCY_CONFIG[
        fanCurrency
      ];

    // 6. MAIN RENDER
    return (
      <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] w-full bg-black relative overflow-hidden font-sans">
        <style>{`
          @keyframes floatUp {
            0% { opacity: 0; transform: translate(-50%, 50px) scale(0.8); }
            10% { opacity: 1; transform: translate(-50%, 0) scale(1.1); }
            80% { opacity: 1; transform: translate(-50%, -200px) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -250px) scale(0.8); }
          }
          .bubble-anim { animation: floatUp 4s ease-in-out forwards; }
        `}</style>

        <div className="flex-1 relative bg-black flex items-center justify-center">
          <div
            ref={
              remoteVideoRef
            }
            className="w-full h-full bg-black [&>video]:object-cover"
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

          {/* 3-MINUTE CUMULATIVE LEADERBOARD */}
          {showLeaderboard &&
            topGifters.length >
              0 && (
              <div className="absolute top-[70px] left-0 w-full z-20 flex flex-col gap-1 p-3 pointer-events-none animate-in slide-in-from-top-4 duration-500">
                <div className="text-[10px] font-black text-yellow-400 uppercase tracking-widest text-center mb-1 drop-shadow-md">
                  Top
                  3
                  Gifters
                </div>
                {topGifters.map(
                  (
                    gift,
                    index,
                  ) => (
                    <div
                      key={
                        gift.fanName
                      }
                      className={`bg-gradient-to-r p-2.5 rounded-xl flex justify-between items-center backdrop-blur-md border shadow-lg ${
                        index ===
                        0
                          ? "from-yellow-600/90 to-amber-700/90 border-yellow-400"
                          : index ===
                              1
                            ? "from-slate-400/90 to-slate-500/90 border-slate-300"
                            : "from-orange-700/90 to-amber-800/90 border-orange-500"
                      }`}
                    >
                      <span className="font-bold text-white text-xs flex items-center gap-1">
                        <Crown
                          size={
                            14
                          }
                          className={
                            index ===
                            0
                              ? "text-yellow-300"
                              : index ===
                                  1
                                ? "text-slate-200"
                                : "text-orange-300"
                          }
                        />
                        {index +
                          1}
                        .{" "}
                        {
                          gift.fanName
                        }
                      </span>
                      <span className="font-black text-white text-sm tracking-wider drop-shadow-md">
                        ₦
                        {Math.floor(
                          gift.totalAmount,
                        ).toLocaleString()}
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}

          {/* FLOATING BUBBLE OVERLAY */}
          <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
            {floatingGifts.map(
              (
                bubble,
              ) => (
                <div
                  key={
                    bubble.id
                  }
                  className="bubble-anim absolute left-1/2 bottom-1/4 bg-gradient-to-br from-purple-600/90 to-pink-600/90 border border-pink-400 text-white px-4 py-2 rounded-full shadow-[0_0_20px_rgba(236,72,153,0.5)] flex items-center gap-2 backdrop-blur-sm whitespace-nowrap"
                >
                  <Gift
                    size={
                      16
                    }
                    className="text-pink-200"
                  />
                  <span className="font-bold text-sm">
                    {
                      bubble.fanName
                    }
                  </span>
                  <span className="font-black text-yellow-300">
                    sent{" "}
                    {bubble.rawCurrency ===
                    "NGN"
                      ? "₦"
                      : bubble.rawCurrency ===
                          "USD"
                        ? "$"
                        : bubble.rawCurrency}
                    {bubble.rawAmount?.toLocaleString()}
                    !
                  </span>
                </div>
              ),
            )}
          </div>

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
                  setGiftError(
                    "",
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
                  (
                  {
                    fanCurrency
                  }

                  )
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {currentConfig.tiers.map(
                    (
                      amount,
                    ) => (
                      <button
                        key={
                          amount
                        }
                        onClick={() => {
                          setIsCustomAmount(
                            false,
                          );
                          setGiftAmount(
                            amount,
                          );
                        }}
                        className={`py-2 rounded-lg text-sm font-bold transition-all ${!isCustomAmount && giftAmount === amount ? "bg-purple-500 text-white border-transparent" : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"}`}
                      >
                        {
                          currentConfig.symbol
                        }
                        {amount.toLocaleString()}
                      </button>
                    ),
                  )}
                  <button
                    onClick={() =>
                      setIsCustomAmount(
                        true,
                      )
                    }
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${isCustomAmount ? "bg-purple-500 text-white border-transparent" : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"}`}
                  >
                    Custom
                  </button>
                </div>

                {isCustomAmount && (
                  <div className="mt-3 animate-in fade-in zoom-in-95 duration-200">
                    <input
                      type="number"
                      min={
                        currentConfig.min
                      }
                      value={
                        giftAmount
                      }
                      onChange={(
                        e,
                      ) =>
                        setGiftAmount(
                          Number(
                            e
                              .target
                              .value,
                          ),
                        )
                      }
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 text-sm font-bold shadow-inner"
                      placeholder={`Min ${currentConfig.symbol}${currentConfig.min}`}
                    />
                  </div>
                )}
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
                      <p className="text-sm text-slate-400 mb-1">
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
                  giftAmount <
                    currentConfig.min ||
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
                  `Send ${currentConfig.symbol}${giftAmount.toLocaleString()} Gift`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };;

export default LivePlayer;
