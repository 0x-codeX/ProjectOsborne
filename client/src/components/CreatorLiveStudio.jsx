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
import { io } from "socket.io-client";
import {
  MessageSquare,
  Send,
  DollarSign,
  VideoOff,
  Loader2,
  Gift,
  Camera,
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

    const chatEndRef =
      useRef(
        null,
      );
    const socketRef =
      useRef(
        null,
      );

    const localVideoRef =
      useRef(
        null,
      );
    const agoraClientRef =
      useRef(
        null,
      );
    const localTracksRef =
      useRef(
        [],
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
      isLive,
      setIsLive,
    ] =
      useState(
        false,
      );
    const [
      isEnding,
      setIsEnding,
    ] =
      useState(
        false,
      );
    const [
      sessionEarnings,
      setSessionEarnings,
    ] =
      useState(
        0,
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
            alert(
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
              const newGift =
                {
                  isGift: true,
                  text: giftData.message,
                  amount:
                    giftData.amount,
                  fanName:
                    giftData.fanName ||
                    "A Fan",
                  id: Date.now(),
                };
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
            }
          },
        );
        return () =>
          socketRef.current.disconnect();
      }
    }, [
      stream,
    ]);

    // FIXED: Ironclad hardware cleanup.
    // This guarantees the camera light turns off even if they close the tab or hit the back button.
    useEffect(() => {
      return () => {
        if (
          localTracksRef
            .current
            .length >
          0
        ) {
          localTracksRef.current.forEach(
            (
              track,
            ) => {
              track.stop();
              track.close();
            },
          );
          localTracksRef.current =
            [];
        }
        if (
          agoraClientRef.current
        ) {
          agoraClientRef.current.leave();
        }
      };
    }, []);

    const startBroadcast =
      async () => {
        try {
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
            "host",
          );

          // Forcing the Channel ID to a String ensures Agora doesn't silently fail
          await client.join(
            stream.agoraAppId,
            String(
              stream._id,
            ),
            stream.agoraToken,
            null,
          );

          const audioTrack =
            await AgoraRTC.createMicrophoneAudioTrack();
          const videoTrack =
            await AgoraRTC.createCameraVideoTrack(
              {
                encoderConfig:
                  "720p_1",
              },
            );
          localTracksRef.current =
            [
              audioTrack,
              videoTrack,
            ];

          // Because localVideoRef is permanently mounted, it is guaranteed to exist here
          if (
            localVideoRef.current
          ) {
            localVideoRef.current.innerHTML =
              "";
            videoTrack.play(
              localVideoRef.current,
              {
                fit: "cover",
              },
            );
          }

          await client.publish(
            localTracksRef.current,
          );
          await api.put(
            `/streams/${id}/go-live`,
          );
          setIsLive(
            true,
          );
        } catch (err) {
          console.error(
            "Agora Error:",
            err,
          );
          alert(
            "Failed to connect camera. Check browser permissions.",
          );
        }
      };

    const handleEndStream =
      async () => {
        if (
          !window.confirm(
            "End this live stream?",
          )
        )
          return;
        setIsEnding(
          true,
        );

        // FIXED: INSTANT HARDWARE KILL SWITCH
        // Turn off the camera and mic immediately before waiting for the network API request.
        if (
          localTracksRef
            .current
            .length >
          0
        ) {
          localTracksRef.current.forEach(
            (
              track,
            ) => {
              track.stop();
              track.close();
            },
          );
          localTracksRef.current =
            [];
        }

        if (
          localVideoRef.current
        ) {
          localVideoRef.current.innerHTML =
            "";
        }

        if (
          agoraClientRef.current
        ) {
          await agoraClientRef.current.leave();
        }

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
          // If the network request fails but the camera is already off, we must still exit the studio
          alert(
            "Stream ended locally, but sync was delayed.",
          );
          navigate(
            "/creator/dashboard",
          );
        }
      };

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

    return (
      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] w-full bg-slate-950 text-slate-200 overflow-hidden font-sans">
        <div className="flex-1 flex flex-col p-4 md:p-6 gap-6 h-full overflow-y-auto relative">
          <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl shrink-0">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${isLive ? "bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "bg-slate-600"}`}
                ></span>
                {
                  stream?.title
                }
              </h1>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
              <p className="text-lg font-bold text-emerald-400 font-mono">
                ₦
                {sessionEarnings.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="w-full flex-1 min-h-[400px] bg-black border border-slate-800 rounded-2xl overflow-hidden relative">
            {/* ALWAYS MOUNTED: The WebRTC container must exist in the DOM before play() is called */}
            <div
              ref={
                localVideoRef
              }
              className="absolute inset-0 w-full h-full bg-black"
            />

            {!isLive ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
                <button
                  onClick={
                    startBroadcast
                  }
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold p-8 rounded-2xl flex flex-col items-center gap-4 transition-all hover:scale-105 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                >
                  <Camera
                    size={
                      48
                    }
                  />
                  <h3 className="text-2xl">
                    Tap
                    to
                    Go
                    Live
                  </h3>
                </button>
              </div>
            ) : (
              <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-1.5 rounded-lg font-black tracking-widest text-xs animate-pulse z-10">
                YOU
                ARE
                LIVE
              </div>
            )}
          </div>

          {isLive && (
            <button
              onClick={
                handleEndStream
              }
              disabled={
                isEnding
              }
              className="shrink-0 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2"
            >
              {isEnding ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <VideoOff />{" "}
                  End
                  Stream
                </>
              )}
            </button>
          )}
        </div>

        <div className="w-full lg:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-[50vh] lg:h-full shrink-0">
          <div className="p-4 border-b border-slate-800 bg-slate-950">
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                    <div className="bg-emerald-900/60 p-3 rounded-2xl w-[85%] text-emerald-400 font-bold text-sm">
                      <Gift
                        size={
                          16
                        }
                        className="inline mr-2"
                      />{" "}
                      {
                        msg.text
                      }
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
            className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2"
          >
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
              placeholder="Message..."
              className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2 focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={
                !chatInput.trim()
              }
              className="bg-emerald-500 text-white p-2 rounded-xl disabled:opacity-50"
            >
              <Send
                size={
                  18
                }
              />
            </button>
          </form>
        </div>
      </div>
    );
  };
export default CreatorLiveStudio;
