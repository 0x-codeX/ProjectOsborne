import React, {
  useState,
  useEffect,
  useRef,
} from "react";
import {
  useParams,
  useNavigate,
} from "react-router-dom";
import Hls from "hls.js";
import { io } from "socket.io-client";
import {
  MessageSquare,
  Send,
  DollarSign,
  Activity,
  VideoOff,
  AlertCircle,
  Loader2,
  Gift,
  Camera,
  Monitor,
  Copy,
  Crown,
} from "lucide-react";
import api from "../utils/api";

const CreatorLiveStudio =
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
      broadcastMode,
      setBroadcastMode,
    ] =
      useState(
        null,
      );
    const [
      sessionEarnings,
      setSessionEarnings,
    ] =
      useState(
        0,
      );
    const [
      isEnding,
      setIsEnding,
    ] =
      useState(
        false,
      );
    const [
      isLive,
      setIsLive,
    ] =
      useState(
        false,
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

    // WHALE LEADERBOARD STATE
    const [
      pinnedGifts,
      setPinnedGifts,
    ] =
      useState(
        [],
      );

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
            setIsLive(
              res
                .data
                .stream
                .isLive ||
                false,
            );
          } catch (err) {
            setError(
              err
                .response
                ?.data
                ?.message ||
                "Failed to load studio.",
            );
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
        const socketUrl =
          import.meta.env.VITE_API_URL?.replace(
            "/api",
            "",
          ) ||
          "http://localhost:5000";
        socketRef.current =
          io(
            socketUrl,
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

              // 1. Add to main chat
              setMessages(
                (
                  prev,
                ) => [
                  ...prev,
                  newGift,
                ],
              );
              setSessionEarnings(
                (
                  prev,
                ) =>
                  prev +
                  (giftData.amount ||
                    0),
              );

              // 2. Pin to Top Leaderboard (Sort top 3)
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

              // 3. Remove pin after 10 seconds
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
          "live_stream_started",
          (
            data,
          ) => {
            if (
              data.streamId ===
              stream._id
            )
              setIsLive(
                true,
              );
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
              setIsLive(
                false,
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

    const startOBSPreview =
      () => {
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
              () =>
                videoRef.current
                  .play()
                  .catch(
                    () => {},
                  ),
            );
          } else if (
            videoRef.current.canPlayType(
              "application/vnd.apple.mpegurl",
            )
          ) {
            videoRef.current.src =
              stream.playbackUrl;
            videoRef.current.play();
          }
        }
      };

    useEffect(() => {
      if (
        broadcastMode ===
        "OBS"
      )
        startOBSPreview();
    }, [
      broadcastMode,
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
        const newMessage =
          {
            streamId:
              stream._id,
            senderName:
              user.username ||
              "Creator",
            isCreator: true, // FLAG FOR STYLING
            text: chatInput,
            id: Date.now(),
          };

        socketRef.current.emit(
          "send_live_message",
          newMessage,
        );
        setMessages(
          (
            prev,
          ) => [
            ...prev,
            newMessage,
          ],
        );
        setChatInput(
          "",
        );
      };

    const handleEndStream =
      async () => {
        if (
          !window.confirm(
            "Are you sure you want to end this live stream?",
          )
        )
          return;
        setIsEnding(
          true,
        );
        try {
          await api.put(
            `/streams/${id}/end`,
          );
          if (
            socketRef.current
          )
            socketRef.current.emit(
              "end_live_stream",
              {
                streamId:
                  id,
              },
            );
          navigate(
            "/creator/dashboard",
          );
        } catch (err) {
          alert(
            "Failed to end stream.",
          );
          setIsEnding(
            false,
          );
        }
      };

    const copyToClipboard =
      (
        text,
      ) => {
        navigator.clipboard.writeText(
          text,
        );
        alert(
          "Copied to clipboard!",
        );
      };

    if (
      loading
    )
      return (
        <div className="h-screen bg-slate-950 flex items-center justify-center text-emerald-500">
          <Loader2
            className="animate-spin"
            size={
              40
            }
          />
        </div>
      );
    if (
      error
    )
      return (
        <div className="h-screen bg-slate-950 flex items-center justify-center text-red-500">
          {
            error
          }
        </div>
      );

    return (
      <div className="flex flex-col lg:flex-row h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans">
        <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 h-full overflow-y-auto relative">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full transition-all duration-500 ${isLive ? "bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "bg-slate-600"}`}
                ></span>
                {
                  stream?.title
                }
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Live
                Studio
                Control
                Room
              </p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-3">
              <DollarSign
                className="text-emerald-500"
                size={
                  20
                }
              />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">
                  Session
                  Earnings
                </p>
                <p className="text-lg font-bold text-emerald-400 font-mono">
                  ₦
                  {sessionEarnings.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {!broadcastMode ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <h2 className="text-2xl font-bold text-white mb-6">
                How
                do
                you
                want
                to
                broadcast?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                <button
                  onClick={() =>
                    setBroadcastMode(
                      "BROWSER",
                    )
                  }
                  className="bg-slate-900 border border-slate-700 hover:border-emerald-500 p-8 rounded-2xl flex flex-col items-center gap-4 transition-all hover:scale-105 group"
                >
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center group-hover:bg-emerald-500/20">
                    <Camera
                      size={
                        32
                      }
                      className="text-emerald-500"
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-white text-lg">
                      Browser
                      Camera
                    </h3>
                  </div>
                </button>
                <button
                  onClick={() =>
                    setBroadcastMode(
                      "OBS",
                    )
                  }
                  className="bg-slate-900 border border-slate-700 hover:border-blue-500 p-8 rounded-2xl flex flex-col items-center gap-4 transition-all hover:scale-105 group"
                >
                  <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center group-hover:bg-blue-500/20">
                    <Monitor
                      size={
                        32
                      }
                      className="text-blue-500"
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-white text-lg">
                      External
                      Software
                      (OBS)
                    </h3>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="w-full bg-black border border-slate-800 rounded-2xl overflow-hidden relative aspect-video flex-shrink-0 flex items-center justify-center group">
                {broadcastMode ===
                "BROWSER" ? (
                  <iframe
                    src={`https://lvpr.tv/broadcast/${stream.streamKey}`}
                    className="w-full h-full object-cover"
                    allow="camera; microphone; fullscreen; display-capture; autoplay"
                    frameBorder="0"
                  />
                ) : (
                  <video
                    ref={
                      videoRef
                    }
                    controls
                    muted
                    className="w-full h-full object-contain"
                  />
                )}
                {isLive && (
                  <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-1.5 rounded-lg font-black tracking-widest text-xs animate-pulse z-10 pointer-events-none">
                    YOU
                    ARE
                    LIVE
                  </div>
                )}
              </div>

              {broadcastMode ===
                "OBS" && (
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-bold">
                      RTMP
                      URL
                    </label>
                    <div className="flex mt-1">
                      <input
                        type="text"
                        readOnly
                        value="rtmp://rtmp.livepeer.com/live"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-l-lg px-3 py-2 text-sm text-slate-300"
                      />
                      <button
                        onClick={() =>
                          copyToClipboard(
                            "rtmp://rtmp.livepeer.com/live",
                          )
                        }
                        className="bg-slate-800 border-y border-r border-slate-700 px-3 rounded-r-lg hover:bg-slate-700"
                      >
                        <Copy
                          size={
                            16
                          }
                        />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-bold">
                      Stream
                      Key
                    </label>
                    <div className="flex mt-1">
                      <input
                        type="password"
                        readOnly
                        value={
                          stream.streamKey ||
                          ""
                        }
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-l-lg px-3 py-2 text-sm text-slate-300"
                      />
                      <button
                        onClick={() =>
                          copyToClipboard(
                            stream.streamKey,
                          )
                        }
                        className="bg-slate-800 border-y border-r border-slate-700 px-3 rounded-r-lg hover:bg-slate-700"
                      >
                        <Copy
                          size={
                            16
                          }
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-red-950/20 border border-red-500/30 p-6 rounded-2xl mt-auto">
                <button
                  onClick={
                    handleEndStream
                  }
                  disabled={
                    isEnding
                  }
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.3)] disabled:opacity-50"
                >
                  {isEnding ? (
                    <Loader2
                      className="animate-spin"
                      size={
                        20
                      }
                    />
                  ) : (
                    <>
                      <VideoOff
                        size={
                          20
                        }
                      />{" "}
                      End
                      Live
                      Stream
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="w-full lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-[50vh] lg:h-full flex-shrink-0 relative">
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
          </div>

          {/* PINNED WHALE GIFTS BANNER */}
          {pinnedGifts.length >
            0 && (
            <div className="absolute top-[60px] left-0 w-full z-20 flex flex-col gap-1 p-3 pointer-events-none">
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
            {messages.length ===
              0 && (
              <p className="text-center text-slate-500 text-sm mt-10">
                Chat
                is
                quiet...
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
                  className={`w-full flex ${msg.isCreator ? "justify-end" : "justify-start"}`}
                >
                  {msg.isGift ? (
                    <div className="bg-gradient-to-r from-emerald-900/60 to-emerald-800/60 border border-emerald-500/50 p-3 rounded-2xl w-[85%]">
                      <span className="font-bold text-emerald-400 flex items-center gap-2 text-sm">
                        <Gift
                          size={
                            16
                          }
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
                placeholder="Message..."
                className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2 pr-12 focus:outline-none focus:border-emerald-500 text-sm"
                disabled={
                  !broadcastMode
                }
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
                  !broadcastMode ||
                  !chatInput.trim()
                }
                className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-xl transition-colors disabled:opacity-50"
              >
                <Send
                  size={
                    18
                  }
                />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

export default CreatorLiveStudio;
