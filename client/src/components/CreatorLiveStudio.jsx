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

    // THE NEW DYNAMIC STATE
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
            ); // Set initial DB state
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
            setMessages(
              (
                prev,
              ) => [
                ...prev,
                {
                  isGift: true,
                  text: giftData.message,
                  amount:
                    giftData.amount,
                  id: Date.now(),
                },
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
          },
        );

        // THE NERVOUS SYSTEM LISTENER: Hears the ping from Node.js
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
      ) {
        startOBSPreview();
      }
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
            isCreator: true,
            text: chatInput,
            id: Date.now(),
          };

        // Send to backend for the fans
        socketRef.current.emit(
          "send_live_message",
          newMessage,
        );

        // OPTIMISTIC UPDATE: Instantly show it on your own screen!
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
            "Are you sure you want to end this live stream? This will disconnect all fans.",
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
            "Failed to end stream. Please try again.",
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
                {/* THE DYNAMIC DOT */}
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
                    <p className="text-sm text-slate-400 mt-2">
                      Go
                      live
                      instantly.
                      No
                      software
                      required.
                    </p>
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
                    <p className="text-sm text-slate-400 mt-2">
                      Use
                      OBS
                      Studio
                      or
                      vMix
                      for
                      multi-cam
                      streams.
                    </p>
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

                {/* THE LIVE BADGE */}
                {isLive && (
                  <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-1.5 rounded-lg font-black tracking-widest text-xs animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.6)] z-10 pointer-events-none">
                    YOU
                    ARE
                    LIVE
                  </div>
                )}

                {broadcastMode ===
                  "OBS" &&
                  !isLive && (
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2 text-xs font-bold text-slate-300 z-10">
                      <Activity
                        size={
                          14
                        }
                        className="text-slate-500"
                      />
                      Waiting
                      for
                      OBS
                      Connection...
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
                      (Keep
                      Secret)
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
                <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                  <AlertCircle
                    size={
                      18
                    }
                  />{" "}
                  Danger
                  Zone
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  When
                  you
                  are
                  finished
                  broadcasting,
                  you
                  MUST
                  click
                  this
                  button
                  to
                  kill
                  the
                  stream
                  and
                  update
                  your
                  fans'
                  feeds.
                </p>
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

        <div className="w-full lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-[50vh] lg:h-full flex-shrink-0">
          <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center z-10">
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
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length ===
              0 && (
              <p className="text-center text-slate-500 text-sm mt-10">
                Chat
                is
                quiet...
                start
                talking!
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
                  className={`text-sm ${msg.isGift ? "bg-gradient-to-r from-emerald-900/40 to-emerald-800/40 border border-emerald-500/30 p-3 rounded-xl" : msg.isCreator ? "bg-slate-800 p-2 rounded-lg border border-slate-700" : ""}`}
                >
                  {msg.isGift ? (
                    <span className="font-bold text-emerald-400 flex items-center gap-2">
                      <Gift
                        size={
                          16
                        }
                      />{" "}
                      {
                        msg.text
                      }
                    </span>
                  ) : (
                    <p>
                      <span
                        className={`font-bold mr-2 ${msg.isCreator ? "text-emerald-500" : "text-slate-400"}`}
                      >
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
                placeholder="Talk to your fans..."
                className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 text-sm"
                disabled={
                  !broadcastMode
                }
              />
              <button
                type="submit"
                disabled={
                  !broadcastMode
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
