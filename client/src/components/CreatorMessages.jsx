import React, {
  useState,
  useEffect,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import {
  Search,
  Filter,
  Star,
  Send,
  Mic,
  Lock,
  Megaphone,
  MoreVertical,
  ChevronLeft,
  MessageSquare,
  X,
  Check,
  Video,
  Image as ImageIcon,
  Loader2,
  Square,
  Film,
  Wallet,
  CreditCard,
  Plus,
  Minus, // <-- NEW ICONS
} from "lucide-react";
import { io } from "socket.io-client";
import { useWeb3Transfer } from "../hooks/useWeb3Transfer";
import { usePaystackPayment } from "react-paystack";
import { getSmartGatewayConfig } from "../utils/paymentGateway";



const CreatorMessages =
  () => {
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
    const navigate =
      useNavigate();

    // --- STATE ---
    const [
      inbox,
      setInbox,
    ] =
      useState(
        [],
      );
    const [
      chatHistory,
      setChatHistory,
    ] =
      useState(
        [],
      );
    const [
      activeTab,
      setActiveTab,
    ] =
      useState(
        "all",
      );
    const [
      selectedChat,
      setSelectedChat,
    ] =
      useState(
        null,
      );
    const [
      messageInput,
      setMessageInput,
    ] =
      useState(
        "",
      );
    const [
      searchQuery,
      setSearchQuery,
    ] =
      useState(
        "",
      );
    const [
      isLoadingInbox,
      setIsLoadingInbox,
    ] =
      useState(
        true,
      );
    const [
      isSending,
      setIsSending,
    ] =
      useState(
        false,
      );
    const [
      vaultSearchQuery,
      setVaultSearchQuery,
    ] =
      useState(
        "",
      );
    const [
      vaultSortOrder,
      setVaultSortOrder,
    ] =
      useState(
        "newest",
      ); // "newest" or "oldest"

    // --- VAULT DRAWER & ATTACHMENT STATE ---
    const [
      showVaultDrawer,
      setShowVaultDrawer,
    ] =
      useState(
        false,
      );
    const [
      vaultItems,
      setVaultItems,
    ] =
      useState(
        [],
      );
    const [
      isLoadingVault,
      setIsLoadingVault,
    ] =
      useState(
        false,
      );
    const [
      selectedVaultItem,
      setSelectedVaultItem,
    ] =
      useState(
        null,
      );
    const [
      customPrice,
      setCustomPrice,
    ] =
      useState(
        "20.00",
      );
    const [
      pendingAttachment,
      setPendingAttachment,
    ] =
      useState(
        null,
      );

    // --- NEW: VOICE RECORDING STATE ---
    const [
      isRecording,
      setIsRecording,
    ] =
      useState(
        false,
      );
    const [
      recordingTime,
      setRecordingTime,
    ] =
      useState(
        0,
      );
    const mediaRecorderRef =
      useRef(
        null,
      );
    const audioChunksRef =
      useRef(
        [],
      );
    // --- NEW: BUNDLE CHECKOUT STATE ---
    const [
      showBundleConfig,
      setShowBundleConfig,
    ] =
      useState(
        false,
      );
    const [
      bundleQuantity,
      setBundleQuantity,
    ] =
      useState(
        1,
      );
    const [
      bundlePrice,
      setBundlePrice,
    ] =
      useState(
        5,
      );
    const [
      bundleSize,
      setBundleSize,
    ] =
      useState(
        5,
      );
    // --- NEW: DYNAMIC PRICING STATES ---
    const [
      bundleCurrency,
      setBundleCurrency,
    ] =
      useState(
        "USD",
      );
    const [
      rawBundlePrice,
      setRawBundlePrice,
    ] =
      useState(
        5,
      );
    const [
      rawBundleCurrency,
      setRawBundleCurrency,
    ] =
      useState(
        "USD",
      );
    const [
      fanCurrency,
      setFanCurrency,
    ] =
      useState(
        "USD",
      );
    const [
      exchangeRates,
      setExchangeRates,
    ] =
      useState(
        null,
      );
    const [
      checkoutData,
      setCheckoutData,
    ] =
      useState(
        null,
      );
    const [
      paymentMethod,
      setPaymentMethod,
    ] =
      useState(
        null,
      );
    const [
      processingId,
      setProcessingId,
    ] =
      useState(
        null,
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
    const initializePayment =
      usePaystackPayment(
        {
          publicKey:
            import.meta
              .env
              .VITE_PAYSTACK_PUBLIC_KEY,
        },
      );

    const closeCheckoutModal =
      () => {
        setCheckoutData(
          null,
        );
        setPaymentMethod(
          null,
        );
        setCryptoQuote(
          null,
        );
      };

    const handleSelectCrypto =
      async () => {
        setPaymentMethod(
          "CRYPTO",
        );
        setFetchingQuote(
          true,
        );
        setCryptoQuote(
          null,
        );

        try {
          // --- IRONCLAD FIX: Universal Crypto Pricing ---
          // Convert the Creator's true raw price to USD
          const toRawRate =
            exchangeRates[
              checkoutData
                .rawCurrency
            ] ||
            1;
          const rawPriceInUSD =
            checkoutData.raw /
            toRawRate;

          // Completely ignore the Fan's local fiat display currency.
          // Apply a universal crypto rounding (e.g., nearest $0.10) so the
          // charge is identical worldwide regardless of their UI settings.
          const universalFanPriceUSD =
            Math.ceil(
              rawPriceInUSD *
                10,
            ) /
            10;

          const {
            data,
          } =
            await api.post(
              "/purchases/crypto-quote",
              {
                amountUSD:
                  universalFanPriceUSD,
                rawAmountUSD:
                  rawPriceInUSD,
              },
            );

          setCryptoQuote(
            data,
          );
        } catch (error) {
          alert(
            "Failed to get live crypto rates. Please try again.",
          );
          setPaymentMethod(
            null,
          );
        } finally {
          setFetchingQuote(
            false,
          );
        }
      };

    const executePayment =
      async () => {
        if (
          !checkoutData ||
          !paymentMethod ||
          !selectedChat
        )
          return;

        if (
          paymentMethod ===
          "CARD"
        ) {
          const gatewayConfig =
            getSmartGatewayConfig(
              checkoutData.amount,
              checkoutData.currency,
              exchangeRates,
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
                    currentUser?.email ||
                    "fan@nippy.com",
                  amount:
                    gatewayConfig.amountInSubunits,
                  currency:
                    gatewayConfig.currency,
                },
              onSuccess:
                async (
                  reference,
                ) => {
                  setProcessingId(
                    "card_payment",
                  );
                  try {
                    const safeReference =
                      typeof reference ===
                      "string"
                        ? reference
                        : reference?.reference ||
                          reference?.trxref;
                    await api.post(
                      "/purchases/verify",
                      {
                        reference:
                          safeReference,
                        paymentMethod:
                          "FIAT",
                        creatorId:
                          selectedChat
                            .otherUser
                            ._id,
                        purchaseType:
                          "CHAT_BUNDLE",
                        chargeAmount:
                          priceInNGN,
                        chargeCurrency:
                          "NGN",
                        rawAmount:
                          checkoutData.raw,
                        rawCurrency:
                          checkoutData.rawCurrency,
                      },
                    );

                    // Instantly restock local bubbles
                    setSelectedChat(
                      (
                        prev,
                      ) => ({
                        ...prev,
                        bubblesLeft:
                          prev.bubblesLeft +
                          checkoutData.bubbles,
                      }),
                    );
                    setInbox(
                      (
                        prev,
                      ) =>
                        prev.map(
                          (
                            c,
                          ) =>
                            c._id ===
                            selectedChat._id
                              ? {
                                  ...c,
                                  bubblesLeft:
                                    c.bubblesLeft +
                                    checkoutData.bubbles,
                                }
                              : c,
                        ),
                    );
                    closeCheckoutModal();
                  } catch (error) {
                    alert(
                      "Verification failed: " +
                        (error
                          .response
                          ?.data
                          ?.message ||
                          error.message),
                    );
                  } finally {
                    setProcessingId(
                      null,
                    );
                  }
                },
              onClose:
                () =>
                  alert(
                    "Payment window closed.",
                  ),
            },
          );
          return;
        }

        try {
          setProcessingId(
            "crypto_payment",
          );
          const creatorWallet =
            selectedChat
              .otherUser
              ?.walletAddress;
          if (
            !creatorWallet
          )
            throw new Error(
              "This creator is missing a Web3 payout wallet.",
            );
          if (
            !cryptoQuote?.requiredUSDT ||
            !cryptoQuote?.rawUSDT
          )
            throw new Error(
              "Missing crypto quote.",
            );

          const txHash =
            await transferUSDT(
              creatorWallet,
              cryptoQuote.requiredUSDT,
              cryptoQuote.rawUSDT,
              null,
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
              txHash:
                txHash,
              paymentMethod:
                "CRYPTO",
              creatorId:
                selectedChat
                  .otherUser
                  ._id,
              purchaseType:
                "CHAT_BUNDLE",
              chargeAmount:
                checkoutData.amount,
              chargeCurrency:
                "USD",
              rawAmount:
                checkoutData.amount,
              rawCurrency:
                "USD",
            },
          );

          // Instantly restock local bubbles
          setSelectedChat(
            (
              prev,
            ) => ({
              ...prev,
              bubblesLeft:
                prev.bubblesLeft +
                checkoutData.bubbles,
            }),
          );
          setInbox(
            (
              prev,
            ) =>
              prev.map(
                (
                  c,
                ) =>
                  c._id ===
                  selectedChat._id
                    ? {
                        ...c,
                        bubblesLeft:
                          c.bubblesLeft +
                          checkoutData.bubbles,
                      }
                    : c,
              ),
          );
          closeCheckoutModal();
        } catch (error) {
          alert(
            error
              .response
              ?.data
              ?.message ||
              error.message ||
              "Transaction failed.",
          );
        } finally {
          setProcessingId(
            null,
          );
        }
      };

    // 1. Fetch Inbox & Exchange Rates on Mount
    const FALLBACK_RATES =
      {
        USD: 1,
        NGN: 1500,
        EUR: 0.92,
        GBP: 0.79,
        GHS: 14.5,
      };

    useEffect(() => {
      const fetchInitialData =
        async () => {
          try {
            const storedUser =
              JSON.parse(
                localStorage.getItem(
                  "nippy_user",
                ) ||
                  "{}",
              );
            setFanCurrency(
              storedUser.preferredCurrency ||
                "USD",
            );

            const [
              inboxRes,
              ratesRes,
            ] =
              await Promise.all(
                [
                  api.get(
                    "/messages/inbox",
                  ),
                  api
                    .get(
                      "/purchases/exchange-rates",
                    )
                    .catch(
                      () => ({
                        data: FALLBACK_RATES,
                      }),
                    ),
                ],
              );

            setInbox(
              inboxRes.data,
            );
            setExchangeRates(
              ratesRes.data ||
                FALLBACK_RATES,
            );
          } catch (error) {
            console.error(
              "Failed to fetch initial data:",
              error,
            );
          } finally {
            setIsLoadingInbox(
              false,
            );
          }
        };
      fetchInitialData();
    }, []);

    // --- THE PROFIT ENGINE ---
    const getFanPrice =
      (
        creatorPrice,
        creatorCurrency = "USD",
      ) => {
        if (
          !creatorPrice ||
          creatorPrice <=
            0 ||
          !exchangeRates
        ) {
          return {
            price: 0,
            currency:
              fanCurrency,
            raw: 0,
            rawCurrency:
              creatorCurrency,
          };
        }
        const toUSD =
          exchangeRates[
            creatorCurrency
          ] ||
          1;
        const toFan =
          exchangeRates[
            fanCurrency
          ] ||
          1;
        const exactUSD = creatorPrice / toUSD;
        const exactFanPrice = exactUSD * toFan;
        
        // --- IRONCLAD FIX: Denomination-Aware Rounding ---
        let roundedPrice;
        
        if (fanCurrency === "NGN") {
          // Skim NGN to the nearest 50 block (e.g., 1202.46 -> 1250.00)
          roundedPrice = Math.ceil(exactFanPrice / 50) * 50;
        } else if (fanCurrency === "KES") {
          // Skim KES to the nearest 10 block (e.g., 142.10 -> 150.00)
          roundedPrice = Math.ceil(exactFanPrice / 10) * 10;
        } else if (fanCurrency === "GHS") {
          // Skim GHS to the nearest whole number (e.g., 14.10 -> 15.00)
          roundedPrice = Math.ceil(exactFanPrice);
        } else {
          // Skim USD, EUR, GBP to the nearest 0.50 interval (e.g., 3.10 -> 3.50)
          roundedPrice = Math.ceil(exactFanPrice * 2) / 2;
        }

        return {
          price: roundedPrice,
          currency: fanCurrency,
          raw: creatorPrice,
          rawCurrency: creatorCurrency,
        };
      };

    // 2. Fetch Chat History & Socket Connection
    useEffect(() => {
      if (
        !selectedChat
      )
        return;
      setInbox(
        (
          prev,
        ) =>
          prev.map(
            (
              c,
            ) =>
              c._id ===
              selectedChat._id
                ? {
                    ...c,
                    unreadCount: 0,
                  }
                : c,
          ),
      );

      const fetchMessages =
        async () => {
          try {
            // IRONCLAD FIX: Used global api instance. Stripped manual headers & token.
            const res =
              await api.get(
                `/messages/${selectedChat._id}`,
              );
            setChatHistory(
              res
                .data
                .messages ||
                res.data,
            );
            scrollToBottom();
          } catch (error) {
            console.error(
              "Failed to fetch messages:",
              error,
            );
          }
        };

      fetchMessages();

      // Note: WebSockets (socket.io) require their own URL connection,
      // but we should make sure it points to the correct environment variable.
      const socket =
        io(
          import.meta.env.VITE_API_URL?.replace(
            "/api",
            "",
          ) ||
            "https://nippy-serverside.onrender.com"
        );

      socket.emit(
        "join_chat",
        selectedChat._id,
      );

      socket.on(
        "receive_message",
        (
          newMessage,
        ) => {
          setChatHistory(
            (
              prev,
            ) => {
              if (
                prev.some(
                  (
                    msg,
                  ) =>
                    msg._id ===
                    newMessage._id,
                )
              )
                return prev;
              return [
                ...prev,
                newMessage,
              ];
            },
          );
          scrollToBottom();
        },
      );

      return () => {
        socket.disconnect();
      };
    }, [
      selectedChat,
    ]);

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

    // --- VOICE RECORDING LOGIC ---
    useEffect(() => {
      let interval;
      if (
        isRecording
      ) {
        interval =
          setInterval(
            () => {
              setRecordingTime(
                (
                  prev,
                ) => {
                  if (
                    prev >=
                    20
                  ) {
                    stopRecording(); // Force stop at exactly 20 seconds
                    return 20;
                  }
                  return (
                    prev +
                    1
                  );
                },
              );
            },
            1000,
          );
      } else {
        setRecordingTime(
          0,
        );
      }
      return () =>
        clearInterval(
          interval,
        );
    }, [
      isRecording,
    ]);

    const startRecording =
      async () => {
        try {
          const stream =
            await navigator.mediaDevices.getUserMedia(
              {
                audio: true,
              },
            );
          const mediaRecorder =
            new MediaRecorder(
              stream,
            );
          mediaRecorderRef.current =
            mediaRecorder;
          audioChunksRef.current =
            [];

          mediaRecorder.ondataavailable =
            (
              event,
            ) => {
              if (
                event
                  .data
                  .size >
                0
              )
                audioChunksRef.current.push(
                  event.data,
                );
            };

          mediaRecorder.onstop =
            () => {
              const audioBlob =
                new Blob(
                  audioChunksRef.current,
                  {
                    type: "audio/webm",
                  },
                );
              const localAudioUrl =
                URL.createObjectURL(
                  audioBlob,
                );

              setPendingAttachment(
                {
                  title: `Voice Note (${recordingTime}s)`,
                  type: "audio",
                  blob: audioBlob,
                  localUrl:
                    localAudioUrl,
                  isVaultLink: false,
                },
              );
              setCustomPrice(
                "0.00",
              );

              stream
                .getTracks()
                .forEach(
                  (
                    track,
                  ) =>
                    track.stop(),
                );
            };

          mediaRecorder.start();
          setIsRecording(
            true,
          );
        } catch (error) {
          console.error(
            "Microphone access denied:",
            error,
          );
          alert(
            "You must grant microphone access to send voice notes.",
          );
        }
      };

    const stopRecording =
      () => {
        if (
          mediaRecorderRef.current &&
          isRecording
        ) {
          mediaRecorderRef.current.stop();
          setIsRecording(
            false,
          );
        }
      };

    const formatTime =
      (
        seconds,
      ) => {
        const mins =
          Math.floor(
            seconds /
              60,
          );
        const secs =
          seconds %
          60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
      };

    // --- FILTER & SORT VAULT ITEMS ---
    const filteredVaultItems =
      vaultItems
        .filter(
          (
            item,
          ) => {
            const searchStr =
              (
                item.title ||
                item.description ||
                ""
              ).toLowerCase();
            return searchStr.includes(
              vaultSearchQuery.toLowerCase(),
            );
          },
        )
        .sort(
          (
            a,
            b,
          ) => {
            const dateA =
              new Date(
                a.createdAt,
              );
            const dateB =
              new Date(
                b.createdAt,
              );
            return vaultSortOrder ===
              "newest"
              ? dateB -
                  dateA
              : dateA -
                  dateB;
          },
        );

    // --- HANDLE SENDING MESSAGE ---
    const handleOpenVault =
      async () => {
        setShowVaultDrawer(
          true,
        );
        setIsLoadingVault(
          true,
        );
        try {
          // IRONCLAD FIX: Used global api instance. Stripped manual headers & token.
          const res =
            await api.get(
              "/content/vault",
            );

          const items =
            res
              .data
              .contents ||
            res.data ||
            [];
          const sortedItems =
            items.sort(
              (
                a,
                b,
              ) =>
                new Date(
                  b.createdAt,
                ) -
                new Date(
                  a.createdAt,
                ),
            );
          setVaultItems(
            sortedItems,
          );
        } catch (err) {
          console.error(
            "Failed to load vault items:",
            err,
          );
        } finally {
          setIsLoadingVault(
            false,
          );
        }
      };

    const handleSend =
      async (
        e,
      ) => {
        if (
          e
        )
          e.preventDefault();
        if (
          !messageInput.trim() &&
          !pendingAttachment
        )
          return;

        setIsSending(
          true,
        );
        try {
          const formData =
            new FormData();
          formData.append(
            "receiverId",
            selectedChat
              .otherUser
              ._id,
          );
          formData.append(
            "conversationId",
            selectedChat._id,
          );
          formData.append(
            "text",
            messageInput.trim(),
          );

          if (
            pendingAttachment
          ) {
            if (
              pendingAttachment.blob
            ) {
              formData.append(
                "media",
                pendingAttachment.blob,
                "voice-note.webm",
              );
            } else if (
              pendingAttachment.isVaultLink
            ) {
              formData.append(
                "fileKey",
                pendingAttachment.fileKey,
              );
              formData.append(
                "fileType",
                pendingAttachment.type ===
                  "video"
                  ? "video/mp4"
                  : "image/jpeg",
              );
              formData.append(
                "isVaultLink",
                "true",
              );
              formData.append(
                "priceInUSDT",
                customPrice,
              );
            }
          }

          // IRONCLAD FIX: Used global api instance. Stripped manual headers & token.
          // Axios automatically detects FormData and handles the multipart boundary securely.
          const res =
            await api.post(
              "/messages/send",
              formData,
            );

          // --- NEW: LIVE BUBBLE COUNTDOWN ENGINE ---
          if (
            res
              .data
              .bubblesLeft !==
            undefined
          ) {
            setSelectedChat(
              (
                prev,
              ) => ({
                ...prev,
                bubblesLeft:
                  res
                    .data
                    .bubblesLeft,
              }),
            );
            setInbox(
              (
                prev,
              ) =>
                prev.map(
                  (
                    c,
                  ) =>
                    c._id ===
                    selectedChat._id
                      ? {
                          ...c,
                          bubblesLeft:
                            res
                              .data
                              .bubblesLeft,
                        }
                      : c,
                ),
            );
          }
          // --- END LIVE COUNTDOWN ---

          setChatHistory(
            [
              ...chatHistory,
              res
                .data
                .data,
            ],
          );
          setMessageInput(
            "",
          );
          setPendingAttachment(
            null,
          );
          scrollToBottom();
        } catch (error) {
          alert(
            error
              .response
              ?.data
              ?.message ||
              "Failed to send message",
          );
        } finally {
          setIsSending(
            false,
          );
        }
      };

    const filteredInbox =
      inbox
        .filter(
          (
            chat,
          ) =>
            activeTab ===
            "priority"
              ? chat.lifetimeValue >
                100
              : true,
        )
        .filter(
          (
            chat,
          ) =>
            chat.otherUser?.username
              ?.toLowerCase()
              .includes(
                searchQuery.toLowerCase(),
              ),
        );

    return (
      <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-73px)] flex bg-transparent text-slate-200 relative">
        {/* ================= LEFT PANEL ================= */}
        <div
          className={`w-full md:w-[350px] lg:w-[400px] flex flex-col border-r border-slate-800 bg-slate-950/80 backdrop-blur-md ${
            selectedChat
              ? "hidden md:flex"
              : "flex"
          }`}
        >
          <div className="p-4 border-b border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-4">
              CRM
              Inbox
            </h2>
            <div className="relative mb-4">
              <Search
                className="absolute left-3 top-2.5 text-slate-500"
                size={
                  18
                }
              />
              <input
                type="text"
                placeholder="Search users..."
                value={
                  searchQuery
                }
                onChange={(
                  e,
                ) =>
                  setSearchQuery(
                    e
                      .target
                      .value,
                  )
                }
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#FF5757]"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setActiveTab(
                    "all",
                  )
                }
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab ===
                  "all"
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:bg-slate-900"
                }`}
              >
                All
              </button>
              <button
                onClick={() =>
                  setActiveTab(
                    "priority",
                  )
                }
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  activeTab ===
                  "priority"
                    ? "bg-[#FF5757]/10 text-[#FF5757] border border-[#FF5757]/20"
                    : "text-slate-500 hover:bg-slate-900"
                }`}
              >
                <Star
                  size={
                    12
                  }
                />{" "}
                VIPs
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {isLoadingInbox ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-[#FF5757]" />
              </div>
            ) : (
              filteredInbox.map(
                (
                  chat,
                ) => (
                  <div
                    key={
                      chat._id
                    }
                    onClick={() =>
                      setSelectedChat(
                        chat,
                      )
                    }
                    className={`p-4 border-b border-slate-800/50 cursor-pointer flex items-center gap-3 ${
                      selectedChat?._id ===
                      chat._id
                        ? "bg-slate-800/50"
                        : "hover:bg-slate-900/50"
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={
                          chat
                            .otherUser
                            ?.profileImage ||
                          `https://ui-avatars.com/api/?name=${chat.otherUser?.username}`
                        }
                        alt="avatar"
                        className="w-12 h-12 rounded-full border border-slate-700"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3
                          className={`font-bold text-sm truncate ${chat.unreadCount > 0 ? "text-white" : "text-slate-200"}`}
                        >
                          {chat
                            .otherUser
                            ?.username ||
                            "Unknown User"}
                        </h3>
                        <span
                          className={`text-xs ${chat.unreadCount > 0 ? "text-[#FF5757] font-bold" : "text-slate-500"}`}
                        >
                          {chat.updatedAt
                            ? new Date(
                                chat.updatedAt,
                              ).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute:
                                    "2-digit",
                                },
                              )
                            : ""}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p
                          className={`text-xs truncate max-w-[65%] flex items-center gap-1 ${chat.unreadCount > 0 ? "text-white font-bold" : "text-slate-500"}`}
                        >
                          {chat
                            .lastMessage
                            ?.isLockedPPV && (
                            <Lock
                              size={
                                10
                              }
                              className="text-[#FF5757]"
                            />
                          )}
                          {chat
                            .lastMessage
                            ?.text ||
                            "Started a conversation"}
                        </p>

                        <div className="flex items-center gap-2">
                          {chat.unreadCount >
                            0 && (
                            <span className="bg-[#FF5757] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                              {
                                chat.unreadCount
                              }
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              chat.bubblesLeft >
                              0
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {chat.bubblesLeft ||
                              0}{" "}
                            💬
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        </div>

        {/* ================= RIGHT PANEL (CHAT) ================= */}
        {selectedChat ? (
          <div
            className={`flex-1 flex flex-col bg-slate-900/90 backdrop-blur-md ${
              !selectedChat
                ? "hidden md:flex"
                : "flex"
            }`}
          >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <div className="flex items-center gap-3">
                <button
                  className="md:hidden text-slate-400"
                  onClick={() =>
                    setSelectedChat(
                      null,
                    )
                  }
                >
                  <ChevronLeft
                    size={
                      24
                    }
                  />
                </button>
                <img
                  src={
                    selectedChat
                      .otherUser
                      ?.profileImage ||
                    `https://ui-avatars.com/api/?name=${selectedChat.otherUser?.username}`
                  }
                  alt="avatar"
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h2 className="font-bold text-white text-base">
                    {selectedChat
                      .otherUser
                      ?.username ||
                      "Unknown User"}
                  </h2>
                  <div className="flex gap-2 text-xs font-mono">
                    <span className="text-emerald-400 font-bold">
                      LTV:
                      $
                      {selectedChat.lifetimeValue ||
                        0}
                    </span>
                    <span
                      className={
                        selectedChat.bubblesLeft >
                        0
                          ? "text-blue-400"
                          : "text-red-400 font-bold"
                      }
                    >
                      {selectedChat.bubblesLeft ||
                        0}{" "}
                      Bubbles
                      Left
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.map(
                (
                  msg,
                ) => {
                  const isCreator =
                    msg.sender ===
                    (currentUser._id ||
                      currentUser.id);
                  return (
                    <div
                      key={
                        msg._id
                      }
                      className={`flex flex-col ${isCreator ? "items-end" : "items-start"}`}
                    >
                      {msg.priceInUSDT >
                      0 ? (
                        <div className="max-w-[75%] bg-slate-800 border border-[#FF5757]/30 rounded-2xl rounded-tr-sm p-4 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-[#FF5757]/10 rounded-bl-full blur-xl"></div>
                          <div className="flex items-center gap-2 mb-2 text-[#FF5757]">
                            <Lock
                              size={
                                14
                              }
                            />
                            <span className="text-xs font-bold uppercase tracking-wider">
                              Locked
                              Media
                            </span>
                            <span className="ml-auto bg-[#FF5757]/20 px-2 py-0.5 rounded text-xs font-mono font-bold">
                              $
                              {
                                msg.priceInUSDT
                              }
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 italic">
                            {msg.text ||
                              "[Media Attachment]"}
                          </p>
                        </div>
                      ) : (
                        <div
                          className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                            isCreator
                              ? "bg-[#FF5757] text-white rounded-tr-sm"
                              : "bg-slate-800 text-slate-200 rounded-tl-sm"
                          }`}
                        >
                          {msg.fileType?.includes(
                            "audio",
                          ) ? (
                            <div className="flex flex-col gap-1">
                              <span className="font-bold italic text-[10px] uppercase opacity-80">
                                Voice
                                Note
                              </span>
                              <audio
                                src={
                                  msg.fileUrl ||
                                  msg.fileKey
                                }
                                controls
                                className="h-10 max-w-[220px]"
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {/* --- ATTACHMENT RENDERING --- */}
                              {msg.fileKey && (
                                <>
                                  {/* 1. Explicit Video Check */}
                                  {(msg.fileType?.includes(
                                    "video",
                                  ) ||
                                    msg.fileKey
                                      .toLowerCase()
                                      .match(
                                        /\.(mp4|webm|ogg)$/,
                                      )) && (
                                    <video
                                      src={`https://${import.meta.env.VITE_R2_PUBLIC_DOMAIN}/${msg.fileKey}`}
                                      controls
                                      className="w-full md:w-[250px] rounded-lg bg-black"
                                    />
                                  )}

                                  {/* 2. Explicit Image Check */}
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

                                  {/* 3. Fallback for PDFs, ZIPs, Docs, etc. */}
                                  {!msg.fileType?.includes(
                                    "video",
                                  ) &&
                                    !msg.fileType?.includes(
                                      "image",
                                    ) &&
                                    !msg.fileKey
                                      .toLowerCase()
                                      .match(
                                        /\.(mp4|webm|ogg|jpg|jpeg|png|gif|webp)$/,
                                      ) && (
                                      <a
                                        href={`https://${import.meta.env.VITE_R2_PUBLIC_DOMAIN}/${msg.fileKey}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-white underline text-sm break-all font-bold flex items-center gap-1 bg-black/20 p-2 rounded-lg"
                                      >
                                        📎
                                        View
                                        Attachment
                                      </a>
                                    )}
                                </>
                              )}

                              {/* --- IRONCLAD TEXT RENDERING --- */}
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
                        </div>
                      )}
                      <span className="text-[10px] text-slate-500 mt-1 mx-1">
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
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 pb-safe flex flex-col">
              {/* --- NEW: CONTEXTUAL FAN GATEKEEPER --- */}
              {selectedChat &&
              (selectedChat
                .fan
                ?._id ===
                (currentUser._id ||
                  currentUser.id) ||
                selectedChat.fan ===
                  (currentUser._id ||
                    currentUser.id)) &&
              selectedChat.bubblesLeft <=
                0 ? (
                <div className="p-4 bg-slate-900 border border-[#FF5757]/30 rounded-2xl flex items-center justify-between shadow-lg">
                  <div>
                    <p className="text-sm font-bold text-white">
                      Chat
                      Bubbles
                      Exhausted
                    </p>
                    <p className="text-xs text-slate-400">
                      Get
                      more
                      messages
                      to
                      continue
                      chatting
                      with{" "}
                      {selectedChat
                        .otherUser
                        ?.username ||
                        "this creator"}

                      .
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const rawPrice =
                        selectedChat
                          .otherUser
                          ?.monetizationSettings
                          ?.messageBundlePrice ||
                        5;

                      // --- IRONCLAD FIX ---
                      // Match the purchaseController.js fallback chain exactly.
                      // This ensures 1,208 is treated as NGN, not USD.
                      const rawCurrency =
                        selectedChat
                          .otherUser
                          ?.monetizationSettings
                          ?.priceCurrency ||
                        selectedChat
                          .otherUser
                          ?.monetizationSettings
                          ?.baseCurrency ||
                        selectedChat
                          .otherUser
                          ?.preferredCurrency ||
                        "USD";

                      const convertedBundle =
                        getFanPrice(
                          rawPrice,
                          rawCurrency,
                        );

                      setBundlePrice(
                        convertedBundle.price,
                      );
                      setBundleCurrency(
                        convertedBundle.currency,
                      );
                      setRawBundlePrice(
                        convertedBundle.raw,
                      );
                      setRawBundleCurrency(
                        convertedBundle.rawCurrency,
                      );
                      setBundleSize(
                        selectedChat
                          .otherUser
                          ?.monetizationSettings
                          ?.messageBundleSize ||
                          5,
                      );
                      setBundleQuantity(
                        1,
                      );
                      setShowBundleConfig(
                        true,
                      );
                    }}
                    className="px-4 py-2 bg-[#FF5757] hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition-colors shadow-lg"
                  >
                    Buy
                    Bundle
                  </button>
                </div>
              ) : (
                <>
                  {pendingAttachment && (
                    <div className="mb-3 flex items-center justify-between bg-[#FF5757]/10 border border-[#FF5757]/30 rounded-lg p-2 px-3 self-start">
                      <div className="flex items-center gap-3 text-[#FF5757] text-sm font-bold">
                        {pendingAttachment.type ===
                        "audio" ? (
                          <audio
                            src={
                              pendingAttachment.localUrl
                            }
                            controls
                            className="h-8 max-w-[200px]"
                          />
                        ) : (
                          <>
                            <Lock
                              size={
                                14
                              }
                            />
                            <span className="truncate max-w-[200px]">
                              {
                                pendingAttachment.title
                              }
                            </span>
                          </>
                        )}
                        <span className="bg-[#FF5757] text-white px-1.5 py-0.5 rounded text-[10px] font-mono ml-2">
                          $
                          {
                            customPrice
                          }
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setPendingAttachment(
                            null,
                          )
                        }
                        className="text-slate-400 hover:text-white ml-4"
                      >
                        <X
                          size={
                            16
                          }
                        />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2 bg-slate-900 border border-slate-800 p-2 rounded-2xl focus-within:border-[#FF5757] transition-colors relative">
                    <div className="flex gap-1 pb-1 pl-1">
                      <button
                        onClick={
                          handleOpenVault
                        }
                        disabled={
                          isRecording
                        }
                        className="p-2 text-slate-400 hover:text-[#FF5757] disabled:opacity-50 transition-colors rounded-full"
                      >
                        <Lock
                          size={
                            20
                          }
                        />
                      </button>
                    </div>

                    {isRecording ? (
                      <div className="flex-1 flex items-center justify-between px-4 py-2.5 bg-rose-500/10 rounded-xl border border-rose-500/30">
                        <div className="flex items-center gap-3 text-[#FF5757]">
                          <div className="w-2 h-2 bg-[#FF5757] rounded-full animate-pulse"></div>
                          <span className="font-mono text-sm font-bold tracking-wider">
                            RECORDING{" "}
                            {formatTime(
                              recordingTime,
                            )}{" "}
                            /
                            0:20
                          </span>
                        </div>
                      </div>
                    ) : (
                      <textarea
                        rows="1"
                        placeholder={
                          pendingAttachment
                            ? "Add a description..."
                            : "Type a message..."
                        }
                        value={
                          messageInput
                        }
                        onChange={(
                          e,
                        ) =>
                          setMessageInput(
                            e
                              .target
                              .value,
                          )
                        }
                        onKeyDown={(
                          e,
                        ) => {
                          if (
                            e.key ===
                              "Enter" &&
                            !e.shiftKey
                          ) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-white resize-none max-h-32 py-2.5 px-2"
                      />
                    )}

                    {messageInput.trim() ||
                    pendingAttachment ? (
                      <button
                        onClick={
                          handleSend
                        }
                        disabled={
                          isSending
                        }
                        className="p-2.5 rounded-xl transition-all mb-0.5 bg-[#FF5757] text-white shadow-lg"
                      >
                        {isSending ? (
                          <Loader2
                            size={
                              18
                            }
                            className="animate-spin"
                          />
                        ) : (
                          <Send
                            size={
                              18
                            }
                            className="ml-0.5"
                          />
                        )}
                      </button>
                    ) : (
                      <button
                        onMouseDown={
                          isRecording
                            ? stopRecording
                            : startRecording
                        }
                        className={`p-2.5 rounded-xl transition-all mb-0.5 ${
                          isRecording
                            ? "bg-rose-600 text-white animate-pulse"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {isRecording ? (
                          <Square
                            size={
                              18
                            }
                            fill="currentColor"
                          />
                        ) : (
                          <Mic
                            size={
                              18
                            }
                          />
                        )}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-slate-900/50 backdrop-blur-sm text-slate-500">
            Select
            a
            chat
            to
            begin
          </div>
        )}

        {/* ================= VAULT DRAWER OVERLAY ================= */}
        {showVaultDrawer && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-950 w-full md:w-[500px] md:rounded-3xl border-t md:border border-slate-800 shadow-2xl flex flex-col max-h-[85vh]">
              {/* HEADER */}
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 md:rounded-t-3xl">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Lock
                      size={
                        18
                      }
                      className="text-[#FF5757]"
                    />{" "}
                    Attach
                    Vault
                    Media
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select
                    content
                    to
                    lock
                    behind
                    a
                    paywall.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setShowVaultDrawer(
                      false,
                    )
                  }
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition-colors"
                >
                  <X
                    size={
                      18
                    }
                  />
                </button>
              </div>

              {/* SEARCH & SORT BAR */}
              <div className="px-4 pb-4 pt-3 border-b border-slate-800 bg-slate-900/50 flex gap-2">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-2.5 text-slate-500"
                    size={
                      16
                    }
                  />
                  <input
                    type="text"
                    placeholder="Search by title or description..."
                    value={
                      vaultSearchQuery
                    }
                    onChange={(
                      e,
                    ) =>
                      setVaultSearchQuery(
                        e
                          .target
                          .value,
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-[#FF5757]"
                  />
                </div>
                <button
                  onClick={() =>
                    setVaultSortOrder(
                      (
                        prev,
                      ) =>
                        prev ===
                        "newest"
                          ? "oldest"
                          : "newest",
                    )
                  }
                  className="bg-slate-800 text-slate-300 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-700 transition-colors"
                >
                  <Filter
                    size={
                      16
                    }
                  />
                  {vaultSortOrder ===
                  "newest"
                    ? "Newest"
                    : "Oldest"}
                </button>
              </div>

              {/* GRID AREA */}
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3">
                {isLoadingVault ? (
                  <div className="col-span-2 flex justify-center py-10">
                    <Loader2 className="animate-spin text-[#FF5757]" />
                  </div>
                ) : filteredVaultItems.length ===
                  0 ? (
                  <div className="col-span-2 text-center text-slate-500 py-10">
                    {vaultItems.length ===
                    0
                      ? "Your vault is empty. Upload content first."
                      : "No content matches your search."}
                  </div>
                ) : (
                  filteredVaultItems.map(
                    (
                      item,
                    ) => {
                      const itemId =
                        item._id ||
                        item.id;
                      const isSelected =
                        selectedVaultItem?._id ===
                        itemId;
                      const isVideo =
                        item.fileType?.includes(
                          "video",
                        );

                      return (
                        <div
                          key={
                            itemId
                          }
                          onClick={() => {
                            setSelectedVaultItem(
                              item,
                            );
                            setCustomPrice(
                              item.priceInUSDT ||
                                0,
                            );
                          }}
                          className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all flex flex-col ${
                            isSelected
                              ? "border-[#FF5757]"
                              : "border-slate-800 hover:border-slate-600"
                          }`}
                        >
                          {/* MEDIA THUMBNAIL (MIRRORING CREATOR VAULT) */}
                          <div className="relative aspect-video bg-slate-950 flex items-center justify-center border-b border-slate-800 overflow-hidden group">
                            {item.previewKey ? (
                              <img
                                src={`https://pub-cloudflare.com/${item.previewKey}`}
                                alt={
                                  item.title
                                }
                                className="w-full h-full object-cover opacity-80"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-600">
                                {isVideo ? (
                                  <Film
                                    size={
                                      24
                                    }
                                    className="mb-1"
                                  />
                                ) : (
                                  <ImageIcon
                                    size={
                                      24
                                    }
                                    className="mb-1"
                                  />
                                )}
                                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
                                  {item.fileType ||
                                    "Media"}
                                </span>
                              </div>
                            )}

                            {/* Top Left Icon Badge */}
                            <div className="absolute top-1.5 left-1.5 bg-slate-900/80 p-1 rounded-md text-white backdrop-blur-md">
                              {isVideo ? (
                                <Film
                                  size={
                                    12
                                  }
                                />
                              ) : (
                                <ImageIcon
                                  size={
                                    12
                                  }
                                />
                              )}
                            </div>

                            {/* Selection Checkmark Overlay */}
                            {isSelected && (
                              <div className="absolute inset-0 bg-[#FF5757]/20 flex items-center justify-center backdrop-blur-[1px]">
                                <div className="bg-[#FF5757] text-white p-2 rounded-full shadow-lg">
                                  <Check
                                    size={
                                      20
                                    }
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* CARD DETAILS */}
                          <div className="p-3 bg-slate-900 flex-1 flex flex-col justify-between">
                            <p className="text-xs font-bold text-slate-200 truncate">
                              {item.title ||
                                "Untitled Content"}
                            </p>
                            <span className="text-[10px] text-emerald-400 font-mono mt-2 block font-bold">
                              Vault
                              Price:
                              $
                              {item.priceInUSDT ||
                                0}
                            </span>
                          </div>
                        </div>
                      );
                    },
                  )
                )}
              </div>

              {/* ATTACHMENT PRICING & BUTTON (Only shows if an item is selected) */}
              {selectedVaultItem && (
                <div className="p-4 border-t border-slate-800 bg-slate-900 md:rounded-b-3xl">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                        Unlock
                        Price
                        (USDT)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-500 font-bold">
                          $
                        </span>
                        <input
                          type="number"
                          value={
                            customPrice
                          }
                          onChange={(
                            e,
                          ) =>
                            setCustomPrice(
                              e
                                .target
                                .value,
                            )
                          }
                          className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg py-2 pl-7 pr-3 focus:outline-none focus:border-[#FF5757] font-mono font-bold"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setPendingAttachment(
                          {
                            ...selectedVaultItem,
                            title:
                              selectedVaultItem.title ||
                              selectedVaultItem.description?.substring(
                                0,
                                20,
                              ) ||
                              "Vault Content",
                            isVaultLink: true,
                          },
                        );
                        setShowVaultDrawer(
                          false,
                        );
                        setSelectedVaultItem(
                          null,
                        );
                      }}
                      className="flex-1 bg-[#FF5757] hover:bg-rose-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mt-5"
                    >
                      <Lock
                        size={
                          16
                        }
                      />{" "}
                      Attach
                      Media
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= BUNDLE CONFIGURATION MODAL ================= */}
        {showBundleConfig && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                <h3 className="text-xl font-bold text-white">
                  Buy
                  Chat
                  Bundle
                </h3>
                <button
                  onClick={() =>
                    setShowBundleConfig(
                      false,
                    )
                  }
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X
                    size={
                      24
                    }
                  />
                </button>
              </div>

              <div className="p-6 flex flex-col items-center">
                <MessageSquare
                  size={
                    48
                  }
                  className="text-[#FF5757] mb-4 opacity-80"
                />
                <p className="text-sm text-slate-300 text-center mb-6">
                  <span className="font-bold text-white">
                    {
                      selectedChat
                        .otherUser
                        ?.username
                    }
                  </span>{" "}
                  is
                  offering{" "}
                  <span className="font-bold text-[#FF5757]">
                    {
                      bundleSize
                    }{" "}
                    messages
                  </span>{" "}
                  per
                  bundle
                  for{" "}
                  <span className="font-bold text-[#FF5757]">
                    {bundlePrice.toFixed(
                      2,
                    )}{" "}
                    {
                      bundleCurrency
                    }
                  </span>

                  .
                </p>

                <div className="flex items-center gap-6 mb-8 bg-slate-950 p-2 rounded-2xl border border-slate-800">
                  <button
                    onClick={() =>
                      setBundleQuantity(
                        (
                          prev,
                        ) =>
                          Math.max(
                            1,
                            prev -
                              1,
                          ),
                      )
                    }
                    disabled={
                      bundleQuantity <=
                      1
                    }
                    className="p-3 bg-slate-800 rounded-xl text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    <Minus
                      size={
                        20
                      }
                    />
                  </button>
                  <div className="flex flex-col items-center min-w-[60px]">
                    <span className="text-3xl font-black text-white">
                      {
                        bundleQuantity
                      }
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                      Bundles
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setBundleQuantity(
                        (
                          prev,
                        ) =>
                          prev +
                          1,
                      )
                    }
                    className="p-3 bg-slate-800 rounded-xl text-white hover:bg-slate-700"
                  >
                    <Plus
                      size={
                        20
                      }
                    />
                  </button>
                </div>

                <div className="w-full bg-[#FF5757]/10 border border-[#FF5757]/20 rounded-xl p-4 flex justify-between items-center mb-6">
                  <div>
                    <p className="text-xs text-[#FF5757] font-bold uppercase">
                      Total
                      Messages
                    </p>
                    <p className="text-2xl font-black text-rose-400">
                      {bundleQuantity *
                        bundleSize}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#FF5757] font-bold uppercase">
                      Total
                      Cost
                    </p>
                    <p className="text-2xl font-black text-rose-400">
                      {(
                        bundleQuantity *
                        bundlePrice
                      ).toFixed(
                        2,
                      )}{" "}
                      {
                        bundleCurrency
                      }
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowBundleConfig(
                      false,
                    );
                    setCheckoutData(
                      {
                        type: "CHAT_BUNDLE",
                        amount:
                          bundleQuantity *
                          bundlePrice,
                        currency:
                          bundleCurrency,
                        raw:
                          bundleQuantity *
                          rawBundlePrice,
                        rawCurrency:
                          rawBundleCurrency,
                        bubbles:
                          bundleQuantity *
                          bundleSize,
                      },
                    );
                  }}
                  className="w-full bg-[#FF5757] hover:bg-rose-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-colors"
                >
                  Continue
                  to
                  Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= PAYMENT CHECKOUT MODAL ================= */}
        {checkoutData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                <h3 className="text-lg font-bold text-white">
                  Select
                  Payment
                  Method
                </h3>
                <button
                  onClick={
                    closeCheckoutModal
                  }
                  disabled={
                    processingId !==
                    null
                  }
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X
                    size={
                      24
                    }
                  />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-400 text-center">
                  You
                  are
                  buying{" "}
                  {
                    checkoutData.bubbles
                  }{" "}
                  messages
                  from{" "}
                  <span className="text-white font-bold">
                    {
                      selectedChat
                        .otherUser
                        ?.username
                    }
                  </span>{" "}
                  for{" "}
                  <span className="text-[#FF5757] font-bold">
                    {checkoutData.amount.toFixed(
                      2,
                    )}{" "}
                    {
                      checkoutData.currency
                    }
                  </span>
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={
                      handleSelectCrypto
                    }
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                      paymentMethod ===
                      "CRYPTO"
                        ? "border-[#FF5757] bg-[#FF5757]/10 text-[#FF5757]"
                        : "border-slate-700 text-gray-400 hover:border-slate-500"
                    }`}
                  >
                    <Wallet
                      size={
                        28
                      }
                      className="mb-2"
                    />
                    <span className="font-bold text-sm">
                      Crypto
                    </span>
                    <span className="text-[10px] opacity-70">
                      MetaMask
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      setPaymentMethod(
                        "CARD",
                      )
                    }
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                      paymentMethod ===
                      "CARD"
                        ? "border-[#FF5757] bg-[#FF5757]/10 text-[#FF5757]"
                        : "border-slate-700 text-gray-400 hover:border-slate-500"
                    }`}
                  >
                    <CreditCard
                      size={
                        28
                      }
                      className="mb-2"
                    />
                    <span className="font-bold text-sm">
                      Card
                    </span>
                    <span className="text-[10px] opacity-70">
                      Paystack
                      /
                      Fiat
                    </span>
                  </button>
                </div>

                {paymentMethod ===
                  "CRYPTO" &&
                  fetchingQuote && (
                    <div className="mt-2 p-3 text-center text-sm text-[#FF5757] animate-pulse">
                      Fetching
                      live
                      USDT
                      rates...
                    </div>
                  )}
                {paymentMethod ===
                  "CRYPTO" &&
                  cryptoQuote && (
                    <div className="mt-2 p-4 bg-[#FF5757]/10 border border-[#FF5757]/20 rounded-xl text-center">
                      <p className="text-sm text-gray-400 mb-1">
                        Total:{" "}
                        <span className="text-white">
                          $
                          {cryptoQuote.amountUSD.toFixed(
                            2,
                          )}{" "}
                          USD
                        </span>
                      </p>
                      <p className="text-xl font-bold text-rose-400">
                        Due:{" "}
                        {
                          cryptoQuote.requiredUSDT
                        }{" "}
                        USDT
                      </p>
                      <p className="text-xs text-[#FF5757]/70 mt-2 flex items-center justify-center gap-1">
                        <Lock
                          size={
                            12
                          }
                        />{" "}
                        Rate
                        locked
                        for
                        10:00
                      </p>
                    </div>
                  )}

                <button
                  onClick={
                    executePayment
                  }
                  disabled={
                    !paymentMethod ||
                    fetchingQuote ||
                    (paymentMethod ===
                      "CRYPTO" &&
                      !cryptoQuote) ||
                    processingId !==
                      null
                  }
                  className="w-full mt-4 bg-[#FF5757] hover:bg-rose-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-[#FF5757]/20"
                >
                  {processingId !==
                  null ? (
                    <span className="animate-pulse">
                      Processing...
                    </span>
                  ) : (
                    <>
                      <Lock
                        size={
                          18
                        }
                        className="opacity-70"
                      />{" "}
                      Confirm
                      &
                      Pay
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <style
          dangerouslySetInnerHTML={{
            __html: `.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`,
          }}
        />
      </div>
    );
  };;;

export default CreatorMessages;
