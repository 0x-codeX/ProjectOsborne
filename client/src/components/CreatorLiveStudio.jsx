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

    // Studio specific state
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

    // --- INITIALIZATION ---
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
      // 1. Setup Video Preview (MUST be muted to prevent audio feedback loop with OBS)
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
          videoRef.current.src =
            stream.playbackUrl;
          videoRef.current.play();
        }
      }

      // 2. Setup Socket.IO for Chat & Live Earnings
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

        // Listen for the money!
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
            // Tick up the live earnings counter
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

        return () => {
          socketRef.current.disconnect();
        };
      }
    }, [
      stream,
    ]);

    // Auto-scroll chat
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

    // --- HANDLERS ---
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
              "Creator",
            isCreator: true, // Flag to highlight creator messages in chat
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

          // Tell everyone in the socket room the stream is over
          if (
            socketRef.current
          ) {
            socketRef.current.emit(
              "end_live_stream",
              {
                streamId:
                  id,
              },
            );
          }

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
        {/* --- LEFT COLUMN: CONTROL ROOM --- */}
        <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 h-full overflow-y-auto">
          {/* Header Stats */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
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

            <div className="flex gap-4">
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
          </div>

          {/* Video Preview */}
          <div className="w-full bg-black border border-slate-800 rounded-2xl overflow-hidden relative aspect-video flex-shrink-0">
            <video
              ref={
                videoRef
              }
              controls
              muted // CRITICAL: Must be muted so creator doesn't hear themselves delayed
              className="w-full h-full object-contain"
            />
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2 text-xs font-bold text-slate-300">
              <Activity
                size={
                  14
                }
                className="text-emerald-500"
              />{" "}
              Preview
              (Muted)
            </div>
          </div>

          {/* Danger Zone */}
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
              broadcasting
              from
              OBS,
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
        </div>

        {/* --- RIGHT COLUMN: LIVE CHAT --- */}
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

          {/* Messages List */}
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
                  className={`text-sm ${
                    msg.isGift
                      ? "bg-gradient-to-r from-emerald-900/40 to-emerald-800/40 border border-emerald-500/30 p-3 rounded-xl"
                      : msg.isCreator
                        ? "bg-slate-800 p-2 rounded-lg border border-slate-700"
                        : ""
                  }`}
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
                placeholder="Talk to your fans..."
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
        </div>
      </div>
    );
  };

export default CreatorLiveStudio;
