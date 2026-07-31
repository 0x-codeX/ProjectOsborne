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
    const [
      requiresPurchase,
      setRequiresPurchase,
    ] =
      useState(
        false,
      ); // Triggers the 24hr block UI

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

        // Optimistically determine the receiver based on previous messages
        // (In a full app, you might fetch conversation details on load)
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
            : null; // Note: if new chat, pass it via URL state

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
          setRequiresPurchase(
            false,
          );
          scrollToBottom();
        } catch (err) {
          if (
            err
              .response
              ?.status ===
              403 &&
            err
              .response
              ?.data
              ?.requiresPurchase
          ) {
            setRequiresPurchase(
              true,
            );
            setError(
              err
                .response
                .data
                .message,
            );
          } else {
            setError(
              "Failed to send message.",
            );
          }
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
        {/* HEADER */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center shadow-sm z-10">
          <h2 className="font-bold text-white text-lg">
            Secure
            Chat
          </h2>
        </div>

        {/* MESSAGES AREA */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(
            (
              msg,
            ) => {
              const isMe =
                msg.sender ===
                (currentUser._id ||
                  currentUser.id);
              const isLocked =
                msg.priceInUSDT >
                  0 &&
                !isMe; // Assuming if price > 0 it's locked unless verified

              return (
                <div
                  key={
                    msg._id
                  }
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl p-3 ${
                      isMe
                        ? "bg-[#FF5757] text-white rounded-br-none"
                        : "bg-slate-800 text-slate-200 rounded-bl-none"
                    }`}
                  >
                    {isLocked ? (
                      <div className="flex flex-col items-center justify-center p-4 bg-slate-900/50 rounded-xl border border-[#FF5757]/30">
                        <Lock
                          size={
                            24
                          }
                          className="text-[#FF5757] mb-2"
                        />
                        <p className="text-sm text-center mb-3">
                          Exclusive
                          Content
                        </p>
                        <button
                          onClick={() =>
                            handleUnlockMessage(
                              msg._id,
                              msg.priceInUSDT,
                            )
                          }
                          className="px-4 py-2 bg-[#FF5757] text-white text-sm font-bold rounded-lg shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-colors flex items-center"
                        >
                          <Unlock
                            size={
                              14
                            }
                            className="mr-2"
                          />{" "}
                          Unlock
                          for{" "}
                          {
                            msg.priceInUSDT
                          }{" "}
                          USDT
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm leading-relaxed">
                          {
                            msg.text
                          }
                        </p>
                        {/* If fileKey exists and it's unlocked, you would call /api/messages/:id/stream here */}
                        {msg.fileKey && (
                          <div className="mt-2 text-xs opacity-75 flex items-center border border-white/20 p-2 rounded-lg bg-black/10 cursor-pointer hover:bg-black/20">
                            <ImageIcon
                              size={
                                14
                              }
                              className="mr-2"
                            />{" "}
                            View
                            Attachment
                          </div>
                        )}
                      </>
                    )}

                    <span className="text-[10px] opacity-60 mt-1 block text-right">
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
                    </span>
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

        {/* ERROR / 24-HOUR RULE BLOCKER */}
        {requiresPurchase && (
          <div className="bg-red-500/10 border-t border-red-500/20 p-3 flex items-start text-red-500 text-sm">
            <AlertCircle
              size={
                18
              }
              className="mr-2 flex-shrink-0 mt-0.5"
            />
            <p>
              {
                error
              }{" "}
              <Link
                to="/feed"
                className="font-bold underline ml-1"
              >
                Subscribe
                now
              </Link>
            </p>
          </div>
        )}

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
            disabled={
              requiresPurchase
            }
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FF5757] resize-none h-[52px] disabled:opacity-50"
            rows={
              1
            }
          />
          <button
            type="submit"
            disabled={
              !inputText.trim() ||
              requiresPurchase
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
