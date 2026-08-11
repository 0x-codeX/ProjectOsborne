import React, {
  useState,
  useEffect,
} from "react";
// import { usePaystackPayment } from "react-paystack";
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
} from "lucide-react";
import { useWeb3Transfer } from "../hooks/useWeb3Transfer";

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

    const {
      transferUSDT,
    } =
      useWeb3Transfer();

    useEffect(() => {
      fetchProfile();
    }, [
      id,
    ]);

    const fetchProfile =
      async () => {
        try {
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const response =
            await fetch(
              `http://localhost:5000/api/content/creator/${id}`,
              {
                headers:
                  {
                    Authorization: `Bearer ${token}`,
                  },
              },
            );
          if (
            response.ok
          ) {
            const data =
              await response.json();
            setProfileData(
              data,
            );
          }
        } catch (error) {
          console.error(
            "Failed to load creator",
            error,
          );
        } finally {
          setLoading(
            false,
          );
        }
      };

    // --- NEW: FOLLOW TOGGLE ---
    const handleFollowToggle =
      async () => {
        const previousState =
          profileData.isFollowed;
        // Optimistic UI Update
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
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          await fetch(
            `http://localhost:5000/api/users/${id}/follow`,
            {
              method:
                "POST",
              headers:
                {
                  Authorization: `Bearer ${token}`,
                  "Content-Type":
                    "application/json",
                },
            },
          );
        } catch (error) {
          console.error(
            "Failed to sync follow state",
            error,
          );
          // Revert on failure
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
          alert(
            "Paystack integration pending. Please use Web3 Crypto for now.",
          );
          return;
        }

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
          ) {
            throw new Error(
              "This creator has not set up their Web3 wallet address yet!",
            );
          }

          const txHash =
            await transferUSDT(
              profileData
                .creator
                .walletAddress,
              checkoutData.amount,
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

          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const verifyResponse =
            await fetch(
              "http://localhost:5000/api/purchases/verify",
              {
                method:
                  "POST",
                headers:
                  {
                    "Content-Type":
                      "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                body: JSON.stringify(
                  {
                    txHash:
                      txHash,
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
                  },
                ),
              },
            );

          const verifyData =
            await verifyResponse.json();

          if (
            !verifyResponse.ok
          ) {
            throw new Error(
              verifyData.message ||
                "Payment went through, but backend verification failed.",
            );
          }

          await fetchProfile();
          setCheckoutData(
            null,
          );
        } catch (error) {
          console.error(
            "Transaction Error Trace:",
            error,
          );
          alert(
            error.message ||
              "Transaction failed. Check browser console for details.",
          );
        } finally {
          setProcessingId(
            null,
          );
        }
      };

    if (
      loading
    )
      return (
        <div className="flex justify-center items-center h-64 text-emerald-500 animate-pulse">
          Loading
          creator
          vault...
        </div>
      );
    if (
      !profileData
    )
      return (
        <div className="text-center text-gray-500 mt-20">
          Creator
          not
          found.
        </div>
      );

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
    const hasActiveChat =
      profileData.chatBubblesLeft >
        0 ||
      profileData.hasActiveChat;

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
          price:
            settings.weeklySubscription,
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
          price:
            settings.monthlySubscription,
        },
      );
    if (
      settings.multiMonthPrice >
      0
    )
      availableTiers.push(
        {
          label: `${settings.multiMonthDuration || 3}-Month Bundle`,
          price:
            settings.multiMonthPrice,
        },
      );

    return (
      <div className="max-w-4xl mx-auto pb-12 relative">
        <div className="h-48 bg-gradient-to-r from-gray-900 to-black border-b border-gray-800 relative">
          <div className="absolute -bottom-12 left-4 sm:left-8 flex items-end gap-4">
            {/* TikTok Style Avatar with Follow Button */}
            <div className="relative">
              <div className="w-24 h-24 bg-gray-800 rounded-full border-4 border-black flex items-center justify-center overflow-hidden">
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
                  <span className="text-3xl font-bold text-gray-400">
                    {creator.username
                      .charAt(
                        0,
                      )
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <button
                onClick={
                  handleFollowToggle
                }
                className={`absolute -bottom-2 left-1/2 -translate-x-1/2 p-1.5 rounded-full border-2 border-black transition-all ${
                  isFollowed
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-rose-500 text-white hover:bg-rose-600"
                }`}
              >
                {isFollowed ? (
                  <Check
                    size={
                      16
                    }
                    strokeWidth={
                      3
                    }
                  />
                ) : (
                  <Plus
                    size={
                      16
                    }
                    strokeWidth={
                      3
                    }
                  />
                )}
              </button>
            </div>

            <div className="mb-2">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                {
                  creator.username
                }{" "}
                <ShieldCheck
                  size={
                    20
                  }
                  className="text-blue-400"
                />
              </h1>
              <p className="text-gray-400 font-medium">
                {
                  content.length
                }{" "}
                Exclusive
                Posts
              </p>
            </div>
          </div>

          {/* Sleek, compact action row on the right */}
          <div className="absolute -bottom-5 right-4 sm:right-8 flex items-center gap-2">
            {/* DM / CHAT BUTTON - COLOR LOGIC UPDATED HERE */}
            {settings.messageBundlePrice >
              0 &&
              (hasActiveChat ? (
                <button
                  onClick={() =>
                    navigate(
                      "/messages",
                    )
                  }
                  // Changed from outline to solid blue when active
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
                  // Remains outline when they need to buy
                  className="bg-slate-900 text-gray-400 border border-gray-600 px-3 py-2 sm:px-4 rounded-full font-bold hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2 shadow-lg"
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

            {/* SUBSCRIBE BUTTON */}
            {isSubscribed ? (
              <button className="bg-gray-800 text-emerald-400 px-4 py-2 rounded-full font-bold flex items-center gap-1.5 border border-gray-700 cursor-default text-sm">
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
                className="bg-white text-black px-4 py-2 rounded-full font-bold hover:bg-gray-200 transition-all flex items-center gap-1.5 shadow-lg text-sm"
              >
                <Star
                  size={
                    16
                  }
                />{" "}
                Subscribe
              </button>
            ) : (
              <button className="bg-gray-800 text-white px-4 py-2 rounded-full font-bold border border-gray-700 text-sm">
                Free
                Profile
              </button>
            )}
          </div>
        </div>

        <div className="px-4 mt-20">
          <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-800 pb-2">
            Creator
            Vault
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {content.map(
              (
                post,
              ) => (
                <div
                  key={
                    post._id
                  }
                  className="bg-nippy-obsidian border border-gray-800 rounded-xl overflow-hidden flex flex-col"
                >
                  <div className="bg-black aspect-square relative flex items-center justify-center border-b border-gray-800/50 overflow-hidden">
                    {post.isLocked ? (
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
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm p-4 text-center z-10">
                          <Lock
                            size={
                              32
                            }
                            className="text-gray-300 mb-2 shadow-sm"
                          />
                          <p className="text-white font-bold mb-3 shadow-md">
                            Locked
                            Content
                          </p>
                          <button
                            onClick={() => {
                              setCheckoutData(
                                {
                                  type: "PPV",
                                  post,
                                  amount:
                                    post.actualPrice,
                                },
                              );
                              setPaymentMethod(
                                null,
                              );
                            }}
                            className="bg-white hover:bg-gray-200 text-black font-bold py-2 px-6 rounded-full flex items-center justify-center gap-2 transition-colors shadow-lg"
                          >
                            Unlock
                            for
                            $
                            {
                              post.actualPrice
                            }
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full relative group">
                        <video
                          controls
                          src={
                            post.mediaUrl
                          }
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-slate-200 line-clamp-1">
                      {
                        post.title
                      }
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(
                        post.createdAt,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
          {content.length ===
            0 && (
            <p className="text-center text-gray-500 mt-10">
              This
              creator
              hasn't
              posted
              anything
              yet.
            </p>
          )}
        </div>

        {/* Subscription Modal */}
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
                <p className="text-sm text-gray-400 mb-4 text-center">
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
                        setCheckoutData(
                          {
                            type: "SUBSCRIPTION",
                            tier: tier.label,
                            post: null,
                            amount:
                              tier.price,
                          },
                        );
                        setPaymentMethod(
                          null,
                        );
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
                          className="text-gray-400 group-hover:text-emerald-500"
                        />
                        {
                          tier.price
                        }{" "}
                        USDT
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat Bundle Config Modal */}
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
                    $
                    {
                      settings.messageBundlePrice
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
                      $
                      {(
                        bundleQuantity *
                        settings.messageBundlePrice
                      ).toFixed(
                        2,
                      )}
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
                          settings.messageBundlePrice,
                        bubbles:
                          bundleQuantity *
                          settings.messageBundleSize,
                      },
                    );
                    setPaymentMethod(
                      null,
                    );
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

        {/* Checkout Modal */}
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
                  onClick={() =>
                    setCheckoutData(
                      null,
                    )
                  }
                  className="text-gray-400 hover:text-white transition-colors"
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
                <p className="text-sm text-gray-400 text-center">
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
                    {
                      checkoutData.amount
                    }{" "}
                    USDT
                  </span>
                </p>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={() =>
                      setPaymentMethod(
                        "CRYPTO",
                      )
                    }
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${paymentMethod === "CRYPTO" ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-slate-700 text-gray-400 hover:border-slate-500"}`}
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
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${paymentMethod === "CARD" ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-slate-700 text-gray-400 hover:border-slate-500"}`}
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

                <button
                  onClick={
                    executePayment
                  }
                  disabled={
                    !paymentMethod ||
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