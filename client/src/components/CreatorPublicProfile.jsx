import React, {
  useState,
  useEffect,
} from "react";
import { usePaystackPayment } from "react-paystack";
import AgeVerificationGate from "./AgeVerificationGate";
import {
  useParams,
  useNavigate,
} from "react-router-dom";
import {
  Lock,
  Star,
  ShieldCheck,
  Unlock,
  X,
  BadgeDollarSign,
  Wallet,
  CreditCard,
  MessageSquare,
  Plus,
  Minus,
  Check,
  Radio,
} from "lucide-react";
import { useWeb3Transfer } from "../hooks/useWeb3Transfer";
import api from "../utils/api";
import { io } from "socket.io-client";
import { getSmartGatewayConfig } from "../utils/paymentGateway";



const CreatorPublicProfile =
  () => {
    const {
      id,
    } =
      useParams();
    const navigate =
      useNavigate();

    const [
      profileData,
      setProfileData,
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
      processingId,
      setProcessingId,
    ] =
      useState(
        null,
      );

    // --- DYNAMIC PRICING ENGINE STATES ---
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

    // Modal States
    const [
      showSubModal,
      setShowSubModal,
    ] =
      useState(
        false,
      );
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

    // Checkout Data
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

    // Crypto Quote States
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

    // --- AGE VERIFICATION GATE STATES ---
    const [
      showAgeGate,
      setShowAgeGate,
    ] =
      useState(
        false,
      );
    const [
      pendingCheckoutData,
      setPendingCheckoutData,
    ] =
      useState(
        null,
      );

    const currentUser =
      JSON.parse(
        localStorage.getItem(
          "nippy_user",
        ) ||
          "{}",
      );

    // THE WIRE: Universal Payment Guard
    const handleGuardedCheckout =
      (
        checkoutPayload,
        isRestricted,
      ) => {
        if (
          isRestricted &&
          !currentUser.isAgeVerified
        ) {
          setPendingCheckoutData(
            checkoutPayload,
          );
          setShowAgeGate(
            true,
          );
          return; // STOP! Block the checkout modal.
        }

        // Allow through if verified or SFW
        setCheckoutData(
          checkoutPayload,
        );
        setPaymentMethod(
          null,
        );
      };

    const {
      transferUSDT,
    } =
      useWeb3Transfer();

    useEffect(() => {
      fetchProfileAndRates();
    }, [
      id,
    ]);

    // INJECTED: Real-time socket connection for the Creator Profile
    useEffect(() => {
      const socket =
        io(
          import.meta.env.VITE_API_URL?.replace(
            "/api",
            "",
          ) ||
            "https://nippy-serverside.onrender.com"
        );

      socket.on(
        "live_stream_started",
        (
          data,
        ) => {
          setProfileData(
            (
              prev,
            ) => {
              if (
                !prev ||
                !prev.creator
              )
                return prev;
              if (
                String(
                  prev
                    .creator
                    ._id,
                ) ===
                String(
                  data.creatorId,
                )
              ) {
                return {
                  ...prev,
                  creator:
                    {
                      ...prev.creator,
                      isLive: true,
                      currentStreamId:
                        data.streamId,
                    },
                };
              }
              return prev;
            },
          );
        },
      );

      socket.on(
        "live_stream_ended",
        (
          data,
        ) => {
          setProfileData(
            (
              prev,
            ) => {
              if (
                !prev ||
                !prev.creator
              )
                return prev;
              if (
                String(
                  prev
                    .creator
                    .currentStreamId,
                ) ===
                String(
                  data.streamId,
                )
              ) {
                return {
                  ...prev,
                  creator:
                    {
                      ...prev.creator,
                      isLive: false,
                      currentStreamId:
                        null,
                    },
                };
              }
              return prev;
            },
          );
        },
      );

      return () =>
        socket.disconnect();
    }, []);

    const FALLBACK_RATES =
      {
        USD: 1,
        NGN: 1500,
        EUR: 0.92,
        GBP: 0.79,
        GHS: 14.5,
      };

    const fetchProfileAndRates =
      async () => {
        try {
          // 1. Get the Fan's local currency preference
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

          // 2. Fetch Creator Profile & Live Rates concurrently for speed
          const [
            profileRes,
            ratesRes,
          ] =
            await Promise.all(
              [
                api.get(
                  `/content/creator/${id}`,
                ),
                // THE FIX: Intercept failed network requests with the robust fallback
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

          setProfileData(
            profileRes.data,
          );
          // THE FIX: Ensure fallback is applied if data comes back empty
          setExchangeRates(
            ratesRes.data ||
              FALLBACK_RATES,
          );
        } catch (error) {
          console.error(
            "Failed to load vault data",
            error,
          );
        } finally {
          setLoading(
            false,
          );
        }
      };

    // --- THE PROFIT ENGINE ---
    // Converts creator's base price to Fan's currency and skims the decimals
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

        const exactUSD =
          creatorPrice /
          toUSD;
        const exactFanPrice =
          exactUSD *
          toFan;

        // --- IRONCLAD FIX: Denomination-Aware Rounding ---
        let roundedPrice;

        if (
          fanCurrency ===
          "NGN"
        ) {
          // Skim NGN to the nearest 50 block (e.g., 1202.46 -> 1250.00)
          roundedPrice =
            Math.ceil(
              exactFanPrice /
                50,
            ) *
            50;
        } else if (
          fanCurrency ===
          "KES"
        ) {
          // Skim KES to the nearest 10 block (e.g., 142.10 -> 150.00)
          roundedPrice =
            Math.ceil(
              exactFanPrice /
                10,
            ) *
            10;
        } else if (
          fanCurrency ===
          "GHS"
        ) {
          // Skim GHS to the nearest whole number (e.g., 14.10 -> 15.00)
          roundedPrice =
            Math.ceil(
              exactFanPrice,
            );
        } else {
          // Skim USD, EUR, GBP to the nearest 0.50 interval (e.g., 3.10 -> 3.50)
          roundedPrice =
            Math.ceil(
              exactFanPrice *
                2,
            ) /
            2;
        }

        return {
          price:
            roundedPrice,
          currency:
            fanCurrency,
          raw: creatorPrice,
          rawCurrency:
            creatorCurrency,
        };
      };

    const handleFollowToggle =
      async () => {
        const previousState =
          profileData.isFollowed;
        setProfileData(
          (
            prev,
          ) => ({
            ...prev,
            isFollowed:
              !previousState,
          }),
        );

        try {
          await api.post(
            `/users/${id}/follow`,
          );
        } catch (error) {
          setProfileData(
            (
              prev,
            ) => ({
              ...prev,
              isFollowed:
                previousState,
            }),
          );
        }
      };

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
          !paymentMethod
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
                    checkoutData.post
                      ? checkoutData
                          .post
                          ._id
                      : checkoutData.type,
                  );
                  try {
                    // THE FIX: Robustly extracts the reference regardless of react-paystack API quirks
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
                          id,
                        contentId:
                          checkoutData.post
                            ? checkoutData
                                .post
                                ._id
                            : null,
                        purchaseType:
                          checkoutData.type,
                        subscriptionTier:
                          checkoutData.tier ||
                          null,
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

                    await fetchProfileAndRates();
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
                    "Payment window closed by user.",
                  ),
            },
          );
          return;
        }

        // --- WEB3 EXECUTION ---
        try {
          setProcessingId(
            checkoutData.post
              ? checkoutData
                  .post
                  ._id
              : checkoutData.type,
          );

          if (
            !profileData
              ?.creator
              ?.walletAddress
          )
            throw new Error(
              "Creator missing Web3 wallet.",
            );
          if (
            !cryptoQuote?.requiredUSDT ||
            !cryptoQuote?.rawUSDT
          )
            throw new Error(
              "Missing crypto quote.",
            );

          // THE FIX: We pass BOTH the Fan's bloated price and the Creator's raw base price to the Smart Contract!
          const txHash =
            await transferUSDT(
              profileData
                .creator
                .walletAddress,
              cryptoQuote.requiredUSDT, // e.g., 3.50 USDT (Fan is charged this)
              cryptoQuote.rawUSDT, // e.g., 3.33 USDT (Contract calculates 80% split against this)
              checkoutData.post
                ? checkoutData
                    .post
                    ._id
                : null,
            );

          if (
            !txHash
          )
            throw new Error(
              "Transaction completed but no hash was returned.",
            );

          // The backend uses checkoutData.raw to credit the Creator's Wallet
          await api.post(
            "/purchases/verify",
            {
              txHash:
                txHash,
              paymentMethod:
                "CRYPTO",
              creatorId:
                id,
              contentId:
                checkoutData.post
                  ? checkoutData
                      .post
                      ._id
                  : null,
              purchaseType:
                checkoutData.type,
              subscriptionTier:
                checkoutData.tier ||
                null,
              chargeAmount:
                checkoutData.amount,
              chargeCurrency:
                checkoutData.currency,
              rawAmount:
                checkoutData.raw,
              rawCurrency:
                checkoutData.rawCurrency,
            },
          );

          await fetchProfileAndRates();
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

    if (
      loading ||
      !exchangeRates
    ) {
      return (
        <div className="flex justify-center items-center h-64 text-emerald-500 animate-pulse">
          Loading
          creator
          vault...
        </div>
      );
    }
    if (
      !profileData
    ) {
      return (
        <div className="text-center text-slate-500 mt-20">
          Creator
          not
          found.
        </div>
      );
    }

    const {
      creator,
      isSubscribed,
      content,
      isFollowed,
    } =
      profileData;
    const settings =
      creator.monetizationSettings ||
      {};
    const creatorCurrency =
      settings.priceCurrency ||
      "USD";
    const hasActiveChat =
      profileData.chatBubblesLeft >
        0 ||
      profileData.hasActiveChat;

    // Process subscription tiers through the pricing engine
    const availableTiers =
      [];
    if (
      settings.weeklySubscription >
      0
    )
      availableTiers.push(
        {
          label:
            "Weekly",
          ...getFanPrice(
            settings.weeklySubscription,
            creatorCurrency,
          ),
        },
      );
    if (
      settings.monthlySubscription >
      0
    )
      availableTiers.push(
        {
          label:
            "Monthly",
          ...getFanPrice(
            settings.monthlySubscription,
            creatorCurrency,
          ),
        },
      );
    if (
      settings.multiMonthPrice >
      0
    )
      availableTiers.push(
        {
          label: `${settings.multiMonthDuration || 3}-Month Bundle`,
          ...getFanPrice(
            settings.multiMonthPrice,
            creatorCurrency,
          ),
        },
      );

    // Process chat bundle through the pricing engine
    const chatBundle =
      getFanPrice(
        settings.messageBundlePrice,
        creatorCurrency,
      );

    return (
      <div className="max-w-4xl mx-auto pb-12 relative shadow-2xl bg-slate-950 min-h-screen">
        {/* THE BANNER (Twitter/Facebook Style) */}
        <div className="h-48 md:h-72 w-full bg-slate-900 relative">
          {creator.bannerImage ? (
            <img
              src={
                creator.bannerImage
              }
              alt="Profile Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-900 via-slate-800 to-black"></div>
          )}
        </div>
        {/* ^^^ THIS WAS THE MISSING CLOSING DIV THAT CAUSED YOUR RED SQUIGGLIES ^^^ */}

        {/* PROFILE HEADER SECTION */}
        <div className="px-4 sm:px-8 relative mb-2">
          <div className="flex justify-between items-start -mt-14 md:-mt-20 relative z-10">
            {/* LEFT COLUMN: Avatar + Username Group */}
            <div className="flex flex-col">
              {/* THE ENLARGED AVATAR */}
              <div className="relative w-max">
                <div className="w-28 h-28 md:w-40 md:h-40 bg-slate-800 rounded-full border-4 border-slate-950 flex items-center justify-center overflow-hidden shadow-xl">
                  {creator.profileImage ? (
                    <img
                      src={
                        creator.profileImage
                      }
                      alt={
                        creator.username
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl md:text-5xl font-bold text-slate-400">
                      {creator.username
                        .charAt(
                          0,
                        )
                        .toUpperCase()}
                    </span>
                  )}
                </div>

                {/* FOLLOW BUTTON */}
                <button
                  onClick={
                    handleFollowToggle
                  }
                  className={`absolute bottom-0 right-0 md:bottom-2 md:right-2 p-2 rounded-full border-4 border-slate-950 transition-all ${
                    isFollowed
                      ? "bg-slate-700 text-white hover:bg-slate-600"
                      : "bg-emerald-500 text-white hover:bg-emerald-600"
                  }`}
                >
                  {isFollowed ? (
                    <Check
                      size={
                        18
                      }
                      strokeWidth={
                        3
                      }
                    />
                  ) : (
                    <Plus
                      size={
                        18
                      }
                      strokeWidth={
                        3
                      }
                    />
                  )}
                </button>
              </div>

              {/* CREATOR INFO (Snapped exactly below the avatar, right aligned) */}
              <div className="-mt-7 md:-mt-10 flex flex-col items-end w-max relative z-20">
                <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2 leading-none">
                  {
                    creator.username
                  }{" "}
                  <ShieldCheck
                    size={
                      24
                    }
                    className="text-blue-400"
                  />
                </h1>
                {/* -mt-2 pulls the text up tightly against the username. w-full and text-right strictly anchor it to the right edge */}
                <p className="text-red-400 font-medium text-sm -mt-9 w-full text-right pr-1">
                  {
                    content.length
                  }{" "}
                  Exclusive
                  Posts
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN: ACTION BUTTONS (Straddling the banner edge) */}
            <div className="flex flex-wrap justify-end items-center gap-2 mt-9 md:mt-[3.75rem]">
              {/* INJECTED: Glowing Live Button with Sub-Gate Logic */}
              {creator?.isLive &&
                creator?.currentStreamId && (
                  <button
                    onClick={() => {
                      if (
                        isSubscribed ||
                        availableTiers.length ===
                          0
                      ) {
                        navigate(
                          `/live/${creator.currentStreamId}`,
                        );
                      } else {
                        setShowSubModal(
                          true,
                        );
                      }
                    }}
                    className="bg-red-600 text-white border border-red-500 px-3 py-2 sm:px-4 rounded-full font-bold hover:bg-red-500 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.6)] animate-pulse"
                  >
                    <Radio
                      size={
                        16
                      }
                    />
                    <span className="hidden sm:inline text-sm">
                      LIVE
                      NOW
                    </span>
                  </button>
                )}

              {settings.messageBundlePrice >
                0 &&
                (hasActiveChat ? (
                  <button
                    onClick={() =>
                      navigate(
                        "/messages",
                      )
                    }
                    className="bg-blue-600 text-white border border-blue-500 px-3 py-2 sm:px-4 rounded-full font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                  >
                    <MessageSquare
                      size={
                        16
                      }
                    />
                    <span className="hidden sm:inline text-sm">
                      DM
                      Now
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setBundleQuantity(
                        1,
                      );
                      setShowBundleConfig(
                        true,
                      );
                    }}
                    className="bg-slate-900 text-slate-400 border border-slate-600 px-3 py-2 sm:px-4 rounded-full font-bold hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2 shadow-lg"
                  >
                    <MessageSquare
                      size={
                        16
                      }
                    />
                    <span className="hidden sm:inline text-sm">
                      Buy
                      DM
                    </span>
                  </button>
                ))}

              {isSubscribed ? (
                <button className="bg-slate-800 text-emerald-400 px-4 py-2 rounded-full font-bold flex items-center gap-1.5 border border-slate-700 cursor-default text-sm">
                  <Unlock
                    size={
                      16
                    }
                  />{" "}
                  Subscribed
                </button>
              ) : availableTiers.length >
                0 ? (
                <button
                  onClick={() =>
                    setShowSubModal(
                      true,
                    )
                  }
                  className="bg-white text-black px-4 py-2 rounded-full font-bold hover:bg-slate-200 transition-all flex items-center gap-1.5 shadow-lg text-sm"
                >
                  <Star
                    size={
                      16
                    }
                  />{" "}
                  Subscribe
                </button>
              ) : (
                <button className="bg-slate-800 text-white px-4 py-2 rounded-full font-bold border border-slate-700 text-sm">
                  Free
                  Profile
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 mt-12 md:mt-16">
          <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-800 pb-2">
            Creator
            Vault
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {content.map(
              (
                post,
              ) => {
                // Extract the raw price from our new backend structure
                const rawPostPrice =
                  post.actualPrice !==
                  undefined
                    ? post.actualPrice
                    : post.price ||
                      0;
                const rawPostCurrency =
                  post.priceCurrency ||
                  creatorCurrency;

                const isFreeContent =
                  rawPostPrice <=
                  0;
                const ppvPriceData =
                  getFanPrice(
                    rawPostPrice,
                    rawPostCurrency,
                  );

                return (
                  <div
                    key={
                      post._id
                    }
                    className="relative group rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col"
                  >
                    {/* PPV Badge */}
                    {post.isPaywalled &&
                      !isFreeContent && (
                        <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-slate-700 z-20">
                          {
                            ppvPriceData.currency
                          }{" "}
                          {ppvPriceData.price.toFixed(
                            2,
                          )}
                        </div>
                      )}

                    <div className="bg-slate-950 aspect-square relative flex items-center justify-center border-b border-slate-800/50 overflow-hidden">
                      {/* THE FIX: Bypass the blur if the content is free */}
                      {post.isLocked &&
                      !isFreeContent ? (
                        <>
                          <video
                            src={
                              post.teaserUrl
                            }
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover blur-2xl scale-110 opacity-50 pointer-events-none select-none"
                          />
                          {/* THE FIX: Bypass the lock overlay if the content is free */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm p-4 text-center z-10">
                            <Lock
                              size={
                                32
                              }
                              className="text-slate-300 mb-2 shadow-sm"
                            />
                            <p className="text-white font-bold mb-3 shadow-md">
                              Locked
                              Content
                            </p>
                            <button
                              onClick={() => {
                                handleGuardedCheckout(
                                  {
                                    type: "PPV",
                                    post,
                                    amount:
                                      ppvPriceData.price,
                                    currency:
                                      ppvPriceData.currency,
                                    raw: ppvPriceData.raw,
                                    rawCurrency:
                                      ppvPriceData.rawCurrency,
                                  },
                                  post.isNsfw,
                                ); // Checks if this specific post is NSFW
                              }}
                              className="bg-white hover:bg-slate-200 text-black font-bold py-2 px-6 rounded-full flex items-center justify-center gap-2 transition-colors shadow-lg"
                            >
                              Unlock
                              for{" "}
                              {
                                ppvPriceData.currency
                              }{" "}
                              {ppvPriceData.price.toFixed(
                                2,
                              )}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full relative group">
                          {post.mediaUrl
                            ?.toLowerCase()
                            .match(
                              /\.(jpg|jpeg|png|gif|webp)/i,
                            ) ||
                          post.fileType?.includes(
                            "image",
                          ) ? (
                            <img
                              src={
                                post.mediaUrl
                              }
                              alt={
                                post.title
                              }
                              className="w-full h-full object-cover select-none"
                            />
                          ) : (
                            <video
                              controls
                              src={
                                post.mediaUrl
                              }
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-slate-200 line-clamp-1">
                        {
                          post.title
                        }
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(
                          post.createdAt,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              },
            )}
          </div>
          {content.length ===
            0 && (
            <p className="text-center text-slate-500 mt-10">
              This
              creator
              hasn't
              posted
              anything
              yet.
            </p>
          )}
        </div>

        {/* SUBSCRIPTION MODAL */}
        {showSubModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                <h3 className="text-xl font-bold text-white">
                  Choose
                  a
                  Tier
                </h3>
                <button
                  onClick={() =>
                    setShowSubModal(
                      false,
                    )
                  }
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X
                    size={
                      24
                    }
                  />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-400 mb-4 text-center">
                  Select
                  a
                  plan
                  to
                  unlock
                  full
                  access
                  to{" "}
                  {
                    creator.username
                  }
                  's
                  exclusive
                  vault.
                </p>
                {availableTiers.map(
                  (
                    tier,
                    idx,
                  ) => (
                    <button
                      key={
                        idx
                      }
                      onClick={() => {
                        setShowSubModal(
                          false,
                        );
                        handleGuardedCheckout(
                          {
                            type: "SUBSCRIPTION",
                            tier: tier.label,
                            post: null,
                            amount:
                              tier.price,
                            currency:
                              tier.currency,
                            raw: tier.raw,
                            rawCurrency:
                              tier.rawCurrency,
                          },
                          creator.willingNsfw,
                        ); // Checks if the creator produces NSFW content
                      }}
                      className="w-full bg-slate-800 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500 text-white p-4 rounded-xl flex items-center justify-between transition-all group"
                    >
                      <span className="font-bold">
                        {
                          tier.label
                        }
                      </span>
                      <span className="flex items-center gap-1 font-black group-hover:text-emerald-500 transition-colors">
                        <BadgeDollarSign
                          size={
                            18
                          }
                          className="text-slate-400 group-hover:text-emerald-500"
                        />
                        {tier.price.toFixed(
                          2,
                        )}{" "}
                        {
                          tier.currency
                        }
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        )}

        {/* CHAT BUNDLE CONFIG MODAL */}
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
                  className="text-slate-400 hover:text-white transition-colors"
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
                  className="text-emerald-500 mb-4 opacity-80"
                />
                <p className="text-sm text-slate-300 text-center mb-6">
                  <span className="font-bold text-white">
                    {
                      creator.username
                    }
                  </span>{" "}
                  is
                  offering{" "}
                  <span className="font-bold text-emerald-400">
                    {
                      settings.messageBundleSize
                    }{" "}
                    messages
                  </span>{" "}
                  per
                  bundle
                  for{" "}
                  <span className="font-bold text-emerald-400">
                    {chatBundle.price.toFixed(
                      2,
                    )}{" "}
                    {
                      chatBundle.currency
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
                    className="p-3 bg-slate-800 rounded-xl text-white hover:bg-slate-700 disabled:opacity-50"
                    disabled={
                      bundleQuantity <=
                      1
                    }
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

                <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex justify-between items-center mb-6">
                  <div>
                    <p className="text-xs text-emerald-500 font-bold uppercase">
                      Total
                      Messages
                    </p>
                    <p className="text-2xl font-black text-emerald-400">
                      {bundleQuantity *
                        settings.messageBundleSize}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-emerald-500 font-bold uppercase">
                      Total
                      Cost
                    </p>
                    <p className="text-2xl font-black text-emerald-400">
                      {(
                        bundleQuantity *
                        chatBundle.price
                      ).toFixed(
                        2,
                      )}{" "}
                      {
                        chatBundle.currency
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowBundleConfig(
                      false,
                    );
                    handleGuardedCheckout(
                      {
                        type: "CHAT_BUNDLE",
                        amount:
                          bundleQuantity *
                          chatBundle.price,
                        currency:
                          chatBundle.currency,
                        raw:
                          bundleQuantity *
                          chatBundle.raw,
                        rawCurrency:
                          chatBundle.rawCurrency,
                        bubbles:
                          bundleQuantity *
                          settings.messageBundleSize,
                      },
                      creator.willingNsfw,
                    ); // Gated if creator makes NSFW
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg transition-colors"
                >
                  Continue
                  to
                  Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* THE NEW AGE GATE */}
        <AgeVerificationGate
          isOpen={
            showAgeGate
          }
          onClose={() =>
            setShowAgeGate(
              false,
            )
          }
        />

        {/* CHECKOUT MASTER MODAL */}
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
                  className="text-slate-400 hover:text-white transition-colors"
                  disabled={
                    processingId !==
                    null
                  }
                >
                  <X
                    size={
                      24
                    }
                  />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-400 text-center">
                  {checkoutData.type ===
                  "PPV"
                    ? `You are unlocking a post from `
                    : checkoutData.type ===
                        "CHAT_BUNDLE"
                      ? `You are buying ${checkoutData.bubbles} messages from `
                      : `You are subscribing to `}
                  <span className="text-white font-bold">
                    {
                      creator.username
                    }
                  </span>{" "}
                  for{" "}
                  <span className="text-emerald-500 font-bold">
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
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                        : "border-slate-700 text-slate-400 hover:border-slate-500"
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
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                        : "border-slate-700 text-slate-400 hover:border-slate-500"
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
                    <div className="mt-2 p-3 text-center text-sm text-emerald-500 animate-pulse">
                      Fetching
                      live
                      USDT
                      rates...
                    </div>
                  )}

                {paymentMethod ===
                  "CRYPTO" &&
                  cryptoQuote && (
                    <div className="mt-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                      <p className="text-sm text-slate-400 mb-1">
                        Total:{" "}
                        <span className="text-white">
                          $
                          {cryptoQuote.amountUSD.toFixed(
                            2,
                          )}{" "}
                          USD
                        </span>
                      </p>
                      <p className="text-xl font-bold text-emerald-400">
                        Due:{" "}
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
                  className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
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
      </div>
    );
  };

export default CreatorPublicProfile;
