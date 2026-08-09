import React, {
  useState,
  useEffect,
  useRef,
} from "react";
import {
  useParams,
  Link,
} from "react-router-dom";
import axios from "axios";
import {
  Send,
  Lock,
  Unlock,
  AlertCircle,
} from "lucide-react";

const ChatWindow =
  () => {
    const {
      conversationId,
    } =
      useParams();
    const [
      messages,
      setMessages,
    ] =
      useState(
        [],
      );
    const [
      inputText,
      setInputText,
    ] =
      useState(
        "",
      );
    const [
      isLoading,
      setIsLoading,
    ] =
      useState(
        true,
      );
    const [
      error,
      setError,
    ] =
      useState(
        "",
      );
    // const [
    //   requiresPurchase,
    //   setRequiresPurchase,
    // ] =
    //   useState(
    //     false,
    //   ); // Triggers the 24hr block UI

    const currentUser =
      JSON.parse(
        localStorage.getItem(
          "nippy_user",
        ) ||
          "{}",
      );
    const messagesEndRef =
      useRef(
        null,
      );

    useEffect(() => {
      fetchMessages();
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
          scrollToBottom();
        } catch (err) {
          console.error(
            err,
          );
          setError(
            "Failed to load messages.",
          );
        } finally {
          setIsLoading(
            false,
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

        const receiverId =
          messages.length >
          0
            ? messages[0]
                .sender ===
                currentUser._id ||
              currentUser.id
              ? messages[0]
                  .receiver
              : messages[0]
                  .sender
            : null;

        try {
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const res =
            await axios.post(
              "/api/messages/send",
              {
                receiverId,
                text: inputText,
                conversationId,
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
          setError(
            "",
          );
          scrollToBottom();
        } catch (err) {
          setError(
            err
              .response
              ?.data
              ?.message ||
              "Failed to send message.",
          );
        }
      };

    // Mock function to represent the Web3 payment flow for PPV messages
    const handleUnlockMessage =
      async (
        messageId,
        price,
      ) => {
        alert(
          `Initiating Web3 Payment of ${price} USDT via Polygon... Once txHash is confirmed, call /api/messages/unlock`,
        );
        // 1. Call ethers.js transfer
        // 2. await axios.post('/api/messages/unlock', { messageId, txHash })
        // 3. fetchMessages() to re-render as unlocked
      };

    if (
      isLoading
    )
      return (
        <div className="text-center p-8">
          Decrypting
          chat...
        </div>
      );

    return (
      <div className="max-w-3xl mx-auto h-[calc(100vh-100px)] flex flex-col mt-4 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
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

              // Bulletproof check
              const isVoiceNote =
                msg.fileType?.includes(
                  "audio",
                ) ||
                (msg.fileKey &&
                  msg.fileKey.includes(
                    "voice-notes",
                  ));
              const isLockedPPV =
                msg.priceInUSDT >
                  0 &&
                !isMe &&
                !isVoiceNote;

              return (
                <div
                  key={
                    msg._id
                  }
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[70%] px-4 py-2.5 relative ${
                      isMe
                        ? "bg-[#FF5757] text-white rounded-2xl rounded-tr-sm shadow-md shadow-[#FF5757]/20"
                        : "bg-slate-900 text-slate-200 rounded-2xl rounded-tl-sm border border-slate-700"
                    }`}
                  >
                    {/* --- VOICE NOTE RENDERING --- */}
                    {isVoiceNote && (
                      <div className="flex flex-col gap-1 mt-1 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                          {isMe
                            ? "Your Voice Note"
                            : "Voice Note"}
                        </span>
                        <audio
                          src={
                            msg.fileUrl ||
                            ""
                          }
                          controls
                          className="h-10 w-[200px] md:w-[250px] rounded bg-transparent"
                        />
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
                        <button className="bg-yellow-500 text-black text-xs font-bold py-2 px-4 rounded-full">
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
                              {/* 1. Explicit check for Video */}
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
                                  className="w-full md:w-[250px] rounded-lg bg-black"
                                />
                              )}

                              {/* 2. Explicit check for Image */}
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
                                  className="w-full md:w-[250px] rounded-lg"
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
                      className={`text-[10px] mt-1.5 flex items-center gap-1 ${isMe ? "text-white/70 justify-end" : "text-slate-500"}`}
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

        {/* ❌ DELETE THE 24-HOUR RULE BLOCKER UI YOU HAD HERE ❌ */}

        {/* INPUT AREA */}
        <form
          onSubmit={
            handleSendMessage
          }
          className="p-3 bg-slate-900 border-t border-slate-800 flex items-end space-x-2"
        >
          <textarea
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
            placeholder="Type a secure message..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5757] resize-none h-[52px]"
            rows={
              1
            }
          />
          <button
            type="submit"
            disabled={
              !inputText.trim()
            }
            className="bg-[#FF5757] text-white p-3 rounded-xl disabled:opacity-50 hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
          >
            <Send
              size={
                20
              }
            />
          </button>
        </form>
      </div>
    );
  };
export default ChatWindow;
