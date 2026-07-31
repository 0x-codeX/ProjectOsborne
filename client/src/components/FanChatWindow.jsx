import React, {
  useState,
  useRef,
  useEffect,
} from "react";
import {
  useParams,
  useNavigate,
} from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Lock,
  Unlock,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  MoreVertical,
} from "lucide-react";

// Import your custom Web3 hook
import { useWeb3Transfer } from "../hooks/useWeb3Transfer";

const FanChatWindow =
  () => {
    const {
      id,
    } =
      useParams();
    const navigate =
      useNavigate();
    const messagesEndRef =
      useRef(
        null,
      );

    const [
      inputText,
      setInputText,
    ] =
      useState(
        "",
      );

    // 1. Initialize the Web3 Hook
    const {
      transferUSDT,
    } =
      useWeb3Transfer();

    // 2. We use a local state to track the ENTIRE process (Web3 transfer + Backend verification)
    const [
      isUnlocking,
      setIsUnlocking,
    ] =
      useState(
        false,
      );

    // MOCK DATA
    const [
      chatInfo,
    ] =
      useState(
        {
          creatorName:
            "Lagos Queen",
          handle:
            "@lagosqueen",
          avatar:
            "https://i.pravatar.cc/150?u=lagos",
          isVerified: true,
          canReply: true,
        },
      );

    const [
      messages,
      setMessages,
    ] =
      useState(
        [
          {
            id: "m1",
            senderId:
              "creator123",
            text: "Hey! Thanks for subscribing. Here is that exclusive set you asked for.",
            timestamp:
              "10:42 AM",
            isPPV: false,
          },
          {
            id: "m2",
            senderId:
              "creator123",
            text: "Private VIP Video 🤫",
            timestamp:
              "10:43 AM",
            isPPV: true,
            price:
              "5.00",
            isLocked: true,
            mediaType:
              "video",
            mediaUrl:
              null,
          },
        ],
      );

    useEffect(() => {
      messagesEndRef.current?.scrollIntoView(
        {
          behavior:
            "smooth",
        },
      );
    }, [
      messages,
    ]);

    const handleSendMessage =
      (
        e,
      ) => {
        e.preventDefault();
        if (
          !inputText.trim()
        )
          return;

        const newMessage =
          {
            id: Date.now().toString(),
            senderId:
              "me",
            text: inputText,
            timestamp:
              new Date().toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute:
                    "2-digit",
                },
              ),
            isPPV: false,
          };

        setMessages(
          [
            ...messages,
            newMessage,
          ],
        );
        setInputText(
          "",
        );
      };

    // --- INTEGRATED WEB3 TRANSACTION LOGIC ---
    const handleUnlock =
      async (
        messageId,
        price,
      ) => {
        setIsUnlocking(
          true,
        );

        try {
          // 1. Get Creator's Wallet (In production, this comes from your chatInfo/backend)
          const creatorWalletAddress =
            "0xYourCreatorsPolygonAddressHere";

          // 2. Call the hook to trigger MetaMask and execute the USDT transfer on Polygon
          const txHash =
            await transferUSDT(
              creatorWalletAddress,
              price,
            );
          console.log(
            "Transaction Successful! Hash:",
            txHash,
          );

          // 3. Mock Backend Verification Delay (Simulating sending txHash to your Node server)
          setTimeout(
            () => {
              setMessages(
                (
                  prevMessages,
                ) =>
                  prevMessages.map(
                    (
                      msg,
                    ) => {
                      if (
                        msg.id ===
                        messageId
                      ) {
                        return {
                          ...msg,
                          isLocked: false,
                          mediaUrl:
                            "https://www.w3schools.com/html/mov_bbb.mp4",
                        };
                      }
                      return msg;
                    },
                  ),
              );
              setIsUnlocking(
                false,
              ); // Stop the spinner once backend returns the video URL
            },
            2000,
          );
        } catch (error) {
          // If the user rejects the transaction or doesn't have funds, the hook throws an error here
          console.error(
            "Unlock Process Failed:",
            error,
          );
          alert(
            error.message ||
              "Transaction failed or was rejected.",
          );
          setIsUnlocking(
            false,
          ); // Stop the spinner so they can try again
        }
      };

    return (
      // DESKTOP WRAPPER: Centers the chat like WhatsApp Web
      <div className="fixed inset-0 z-50 flex justify-center bg-black/95 md:py-6 font-sans">
        {/* CHAT CONTAINER: Full screen on mobile, centered column on desktop */}
        <div className="w-full h-full md:h-[90vh] md:max-w-2xl bg-nippy-onyx md:rounded-3xl md:border md:border-gray-800 md:shadow-2xl flex flex-col relative overflow-hidden">
          {/* HEADER */}
          <div className="flex items-center justify-between p-4 bg-nippy-obsidian/95 backdrop-blur-md border-b border-gray-800 z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  navigate(
                    -1,
                  )
                }
                className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors rounded-full"
              >
                <ArrowLeft
                  size={
                    24
                  }
                />
              </button>

              <div className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <img
                    src={
                      chatInfo.avatar
                    }
                    alt="Creator"
                    className="w-10 h-10 rounded-full object-cover border border-gray-700"
                  />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-nippy-onyx rounded-full"></div>
                </div>
                <div className="flex flex-col">
                  <h2 className="text-sm font-bold text-slate-200 flex items-center gap-1">
                    {
                      chatInfo.creatorName
                    }
                    {chatInfo.isVerified && (
                      <CheckCircle2
                        size={
                          14
                        }
                        className="text-nippy-coral"
                      />
                    )}
                  </h2>
                  <span className="text-xs text-gray-400">
                    {
                      chatInfo.handle
                    }
                  </span>
                </div>
              </div>
            </div>

            <button className="p-2 text-gray-400 hover:text-white transition-colors rounded-full">
              <MoreVertical
                size={
                  20
                }
              />
            </button>
          </div>

          {/* CHAT FEED */}
          <div className="flex-grow overflow-y-auto p-4 space-y-6">
            {messages.map(
              (
                msg,
              ) => {
                const isMe =
                  msg.senderId ===
                  "me";

                return (
                  <div
                    key={
                      msg.id
                    }
                    className={`flex flex-col ${
                      isMe
                        ? "items-end"
                        : "items-start"
                    }`}
                  >
                    {/* BUBBLE STYLING: WhatsApp/IG Aesthetics */}
                    <div
                      className={`max-w-[85%] md:max-w-[70%] px-4 py-2.5 shadow-sm relative ${
                        isMe
                          ? "bg-nippy-coral text-white rounded-2xl rounded-tr-sm"
                          : "bg-[#262626] text-slate-200 rounded-2xl rounded-tl-sm border border-gray-800"
                      }`}
                    >
                      {/* STANDARD TEXT */}
                      {msg.text && (
                        <p className="text-[15px] leading-relaxed">
                          {
                            msg.text
                          }
                        </p>
                      )}

                      {/* PPV LOCKED CONTENT */}
                      {msg.isPPV &&
                        msg.isLocked && (
                          <div className="mt-2 w-64 h-56 bg-black rounded-xl flex flex-col items-center justify-center relative overflow-hidden border border-gray-700">
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black blur-md"></div>

                            <div className="relative z-10 flex flex-col items-center p-4 text-center">
                              <div className="w-14 h-14 bg-yellow-500/10 rounded-full flex items-center justify-center mb-3 border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.15)]">
                                <Lock
                                  size={
                                    28
                                  }
                                  className="text-yellow-500"
                                />
                              </div>
                              <p className="text-sm font-bold text-gray-200 mb-1">
                                Exclusive
                                Content
                              </p>
                              <p className="text-xs text-gray-400 mb-4">
                                Unlock
                                to
                                view
                              </p>

                              <button
                                onClick={() =>
                                  handleUnlock(
                                    msg.id,
                                    msg.price,
                                  )
                                }
                                disabled={
                                  isUnlocking
                                }
                                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2.5 px-6 rounded-full text-sm flex items-center gap-2 transition-all disabled:opacity-70 shadow-lg"
                              >
                                {isUnlocking ? (
                                  <>
                                    <Loader2
                                      size={
                                        16
                                      }
                                      className="animate-spin"
                                    />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    Pay{" "}
                                    {
                                      msg.price
                                    }{" "}
                                    USDT
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                      {/* PPV UNLOCKED CONTENT */}
                      {msg.isPPV &&
                        !msg.isLocked && (
                          <div className="mt-2 w-64 rounded-xl overflow-hidden border border-gray-700 relative bg-black shadow-lg">
                            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur px-2.5 py-1 rounded-md text-[10px] font-bold text-green-400 flex items-center gap-1 z-10 border border-green-500/30">
                              <Unlock
                                size={
                                  12
                                }
                              />{" "}
                              UNLOCKED
                            </div>
                            <video
                              controls
                              controlsList="nodownload"
                              className="w-full h-auto object-cover"
                              src={
                                msg.mediaUrl
                              }
                            >
                              Your
                              browser
                              does
                              not
                              support
                              the
                              video
                              tag.
                            </video>
                          </div>
                        )}

                      {/* TIMESTAMP */}
                      <div
                        className={`text-[10px] mt-1 flex items-center gap-1 ${
                          isMe
                            ? "text-white/70 justify-end"
                            : "text-gray-500"
                        }`}
                      >
                        {
                          msg.timestamp
                        }
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

          {/* INPUT AREA */}
          <div className="bg-nippy-obsidian/95 border-t border-gray-800 p-3 pb-safe z-10">
            {chatInfo.canReply ? (
              <form
                onSubmit={
                  handleSendMessage
                }
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-nippy-coral transition-colors rounded-full hover:bg-gray-800"
                >
                  <ImageIcon
                    size={
                      22
                    }
                  />
                </button>
                <div className="flex-grow relative">
                  <input
                    type="text"
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
                    placeholder="Message..."
                    className="w-full bg-[#262626] border border-gray-700 text-white rounded-full py-2.5 pl-4 pr-10 focus:outline-none focus:border-nippy-coral transition-colors text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={
                    !inputText.trim()
                  }
                  className="p-2.5 bg-nippy-coral text-white rounded-full hover:bg-nippy-coralHover transition-colors disabled:opacity-40 disabled:hover:bg-nippy-coral"
                >
                  <Send
                    size={
                      18
                    }
                    className="ml-0.5"
                  />
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 bg-[#262626] rounded-xl p-3 border border-gray-800">
                <AlertCircle
                  size={
                    16
                  }
                  className="text-yellow-500 flex-shrink-0"
                />
                You
                must
                unlock
                a
                PPV
                message
                or
                subscribe
                to
                reply.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

export default FanChatWindow;
