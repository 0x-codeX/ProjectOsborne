import React, {
  useState,
  useEffect,
} from "react";
import { useWeb3Transfer } from "../hooks/useWeb3Transfer";
import api from "../utils/api";
import { usePaystackPayment } from "react-paystack";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Eye,
  Send,
  Lock,
  BadgeDollarSign,
  BookmarkMinus,
  Wallet,
  CreditCard,
  X,
  UserPlus,
  UserCheck,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import AgeVerificationGate from "./AgeVerificationGate"; // <-- 1. IMPORTED THE GATE

// --- SUB-COMPONENT ---
const FeedPostItem =
  ({
    post,
    ppvPriceData,
    isRatesLoading,
    handleFollowToggle,
    handleBookmark,
    handleLike,
    activeCommentPostId,
    setActiveCommentPostId,
    commentText,
    setCommentText,
    submitComment,
    submittingComment,
    openPaymentModal,
  }) => {
    const isFreeContent =
      ppvPriceData.raw <=
      0;
    const fanPrice =
      ppvPriceData.price;
    const fanCurrency =
      ppvPriceData.currency;
    const priceLoading =
      isRatesLoading;

    return (
      <div className="mb-10 bg-nippy-obsidian border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
          <Link
            to={`/creator/${post.creator?._id}`}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden border border-gray-600 group-hover:border-emerald-500 transition-colors">
              {post
                .creator
                ?.profileImage ? (
                <img
                  src={
                    post
                      .creator
                      .profileImage
                  }
                  alt="Creator"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-bold text-gray-300 group-hover:text-white">
                  {post.creator?.username
                    ?.charAt(
                      0,
                    )
                    .toUpperCase() ||
                    "U"}
                </span>
              )}
            </div>
            <div>
              <div className="font-bold text-slate-200 group-hover:text-emerald-500 transition-colors">
                {post
                  .creator
                  ?.username ||
                  "Unknown"}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(
                  post.createdAt,
                ).toLocaleDateString()}
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {post.isPaywalled &&
              !isFreeContent && (
                <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20 text-xs font-bold">
                  <BadgeDollarSign
                    size={
                      14
                    }
                  />{" "}
                  PPV
                </div>
              )}
            <button
              onClick={() =>
                handleFollowToggle(
                  post
                    .creator
                    ?._id,
                )
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                post
                  .creator
                  ?.isFollowed
                  ? "bg-transparent text-gray-400 border-gray-700 hover:border-rose-500 hover:text-rose-500"
                  : "bg-white text-black border-transparent hover:bg-gray-200"
              }`}
            >
              {post
                .creator
                ?.isFollowed ? (
                <>
                  <UserCheck
                    size={
                      14
                    }
                  />{" "}
                  Following
                </>
              ) : (
                <>
                  <UserPlus
                    size={
                      14
                    }
                  />{" "}
                  Follow
                </>
              )}
            </button>
          </div>
        </div>

        <div className="relative bg-black w-full min-h-[300px] max-h-[600px] flex items-center justify-center overflow-hidden">
          {post.isLocked &&
          !isFreeContent ? (
            <video
              src={
                post.teaserUrl
              }
              autoPlay
              loop
              muted
              playsInline
              onContextMenu={(
                e,
              ) =>
                e.preventDefault()
              }
              className="w-full h-auto max-h-[600px] object-cover blur-3xl scale-[1.2] opacity-70 pointer-events-none select-none"
            />
          ) : (
            <>
              {post.mediaUrl
                ?.toLowerCase()
                .match(
                  /\.(jpg|jpeg|png|gif|webp)/i,
                ) ||
              post.fileType?.includes(
                "image",
              ) ||
              post.mediaType?.includes(
                "image",
              ) ? (
                <img
                  src={
                    post.mediaUrl
                  }
                  alt={
                    post.title ||
                    "Unlocked content"
                  }
                  onContextMenu={(
                    e,
                  ) =>
                    e.preventDefault()
                  }
                  draggable="false"
                  className="w-full h-auto max-h-[600px] object-contain select-none"
                />
              ) : (
                <video
                  src={
                    post.mediaUrl
                  }
                  controls
                  controlsList="nodownload noplaybackrate"
                  disablePictureInPicture
                  onContextMenu={(
                    e,
                  ) =>
                    e.preventDefault()
                  }
                  className="w-full h-auto max-h-[600px] object-contain"
                />
              )}
            </>
          )}

          {post.isLocked &&
            !isFreeContent && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-6">
                <Lock className="w-12 h-12 text-white/70 mb-3" />
                <h3 className="text-2xl font-extrabold text-white mb-1 shadow-black drop-shadow-md">
                  Content
                  Locked
                </h3>
                <p className="text-gray-200 text-sm mb-6 font-medium drop-shadow-md text-center max-w-xs">
                  Unlock
                  this
                  content
                  to
                  view
                  the
                  full
                  resolution
                  media.
                </p>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <button
                    onClick={() =>
                      openPaymentModal(
                        post,
                        ppvPriceData,
                      )
                    }
                    disabled={
                      priceLoading
                    }
                    className="bg-white hover:bg-gray-200 text-black font-bold py-3 px-6 rounded-full flex items-center justify-center gap-2 transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {priceLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-slate-800" />
                    ) : (
                      <BadgeDollarSign
                        size={
                          20
                        }
                      />
                    )}
                    {priceLoading
                      ? "Calculating..."
                      : `Unlock for ${fanPrice.toFixed(2)} ${fanCurrency}`}
                  </button>

                  <Link
                    to={`/creator/${post.creator?._id}`}
                    className="bg-black/60 hover:bg-black/80 text-white font-bold py-3 px-6 rounded-full border border-gray-600 flex items-center justify-center transition-colors shadow-lg backdrop-blur-md"
                  >
                    Subscribe
                    to
                    Creator
                  </Link>
                </div>
              </div>
            )}
        </div>

        <div className="p-4">
          <h2 className="text-lg font-bold text-slate-200 mb-1">
            {
              post.title
            }
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            {
              post.description
            }
          </p>

          {post.isPaywalled &&
            !isFreeContent && (
              <div className="flex items-center justify-between mt-3 mb-4">
                <span className="text-xs text-slate-400">
                  Paywalled
                  Content
                </span>
                <span className="text-sm font-bold text-emerald-400 font-mono flex items-center gap-2">
                  {priceLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    `${fanCurrency} ${fanPrice.toFixed(2)}`
                  )}
                </span>
              </div>
            )}

          <div className="flex items-center justify-between border-t border-gray-800/50 pt-4">
            <div className="flex items-center gap-6">
              <button
                onClick={() =>
                  handleLike(
                    post._id,
                  )
                }
                className="flex items-center gap-2 group"
              >
                <Heart
                  size={
                    22
                  }
                  className={`transition-all ${
                    post.isLiked
                      ? "text-rose-500 fill-current scale-110"
                      : "text-gray-400 group-hover:text-rose-500"
                  }`}
                />
                <span className="text-sm text-gray-400 font-medium">
                  {post.likesCount ||
                    0}
                </span>
              </button>
              <button
                onClick={() =>
                  setActiveCommentPostId(
                    activeCommentPostId ===
                      post._id
                      ? null
                      : post._id,
                  )
                }
                className="flex items-center gap-2 group"
              >
                <MessageCircle
                  size={
                    22
                  }
                  className="text-gray-400 group-hover:text-blue-400"
                />
                <span className="text-sm text-gray-400 font-medium">
                  {post.commentsCount ||
                    0}
                </span>
              </button>
              <div className="flex items-center gap-2 text-gray-500">
                <Eye
                  size={
                    22
                  }
                />
                <span className="text-sm font-medium">
                  {post.viewsCount ||
                    0}
                </span>
              </div>
            </div>
            <button
              onClick={() =>
                handleBookmark(
                  post._id,
                )
              }
            >
              <Bookmark
                size={
                  22
                }
                className="text-white fill-current hover:text-red-500 hover:fill-none transition-all"
              />
            </button>
          </div>
        </div>

        {activeCommentPostId ===
          post._id && (
          <div className="bg-slate-900 border-t border-gray-800 p-4 animate-in slide-in-from-top-2">
            <div className="max-h-48 overflow-y-auto mb-4 space-y-3 scrollbar-thin">
              {post.comments &&
              post
                .comments
                .length >
                0 ? (
                post.comments.map(
                  (
                    comment,
                  ) => (
                    <div
                      key={
                        comment._id
                      }
                      className="text-sm"
                    >
                      <span className="font-bold text-slate-300 mr-2">
                        {
                          comment
                            .user
                            .username
                        }
                      </span>
                      <span className="text-gray-400">
                        {
                          comment.text
                        }
                      </span>
                    </div>
                  ),
                )
              ) : (
                <p className="text-xs text-gray-500 text-center italic">
                  No
                  comments
                  yet.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 relative">
              <input
                type="text"
                value={
                  commentText
                }
                onChange={(
                  e,
                ) =>
                  setCommentText(
                    e
                      .target
                      .value,
                  )
                }
                onKeyDown={(
                  e,
                ) =>
                  e.key ===
                    "Enter" &&
                  submitComment(
                    post._id,
                  )
                }
                placeholder="Write a comment..."
                className="w-full bg-black border border-gray-700 text-white text-sm rounded-full py-2 pl-4 pr-12 focus:border-emerald-500 outline-none"
              />
              <button
                onClick={() =>
                  submitComment(
                    post._id,
                  )
                }
                disabled={
                  !commentText.trim() ||
                  submittingComment
                }
                className="absolute right-2 text-emerald-500 p-1 disabled:opacity-50"
              >
                <Send
                  size={
                    18
                  }
                />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

// --- MAIN COMPONENT ---
const BookmarksFeed =
  () => {
    const [
      feed,
      setFeed,
    ] =
      useState(
        [],
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

    // --- 2. ADDED AGE VERIFICATION STATES ---
    const [
      showAgeGate,
      setShowAgeGate,
    ] =
      useState(
        false,
      );
    const [
      pendingRestrictedPost,
      setPendingRestrictedPost,
    ] =
      useState(
        null,
      );

    // Pull current user to check verification status locally
    const currentUser =
      JSON.parse(
        localStorage.getItem(
          "nippy_user",
        ) ||
          "{}",
      );
    // ----------------------------------------

    // PRICING ENGINE STATES
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

    const [
      activeCommentPostId,
      setActiveCommentPostId,
    ] =
      useState(
        null,
      );
    const [
      commentText,
      setCommentText,
    ] =
      useState(
        "",
      );
    const [
      submittingComment,
      setSubmittingComment,
    ] =
      useState(
        false,
      );

    // PAYMENT MODAL STATES
    const [
      paymentModalPost,
      setPaymentModalPost,
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

    // THE FIX: Ironclad Fallback Rates
    const FALLBACK_RATES =
      {
        USD: 1,
        NGN: 1500,
        EUR: 0.92,
        GBP: 0.79,
        GHS: 14.5,
      };

    useEffect(() => {
      fetchBookmarksAndRates();
    }, []);

    const fetchBookmarksAndRates =
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
            feedRes,
            ratesRes,
          ] =
            await Promise.all(
              [
                api.get(
                  "/content/bookmarked",
                ),
                // THE FIX: Protect the app against 404s/timeouts
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

          setFeed(
            feedRes.data,
          );
          setExchangeRates(
            ratesRes.data ||
              FALLBACK_RATES,
          );
        } catch (error) {
          console.error(
            "Failed to load bookmarks",
            error,
          );
        } finally {
          setLoading(
            false,
          );
        }
      };

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

        const exactUSD =
          creatorPrice /
          toUSD;
        const exactFanPrice =
          exactUSD *
          toFan;

        // THE SKIM: Unconditionally round UP to the nearest $0.50 interval
        const roundedPrice =
          Math.ceil(
            exactFanPrice *
              2,
          ) /
          2;

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
      async (
        creatorId,
      ) => {
        setFeed(
          (
            prevFeed,
          ) =>
            prevFeed.map(
              (
                post,
              ) => {
                if (
                  post
                    .creator
                    ?._id ===
                  creatorId
                ) {
                  return {
                    ...post,
                    creator:
                      {
                        ...post.creator,
                        isFollowed:
                          !post
                            .creator
                            .isFollowed,
                      },
                  };
                }
                return post;
              },
            ),
        );
        try {
          await api.post(
            `/users/${creatorId}/follow`,
          );
        } catch (error) {
          console.error(
            "Failed to sync follow state",
            error,
          );
        }
      };

    const handleBookmark =
      async (
        postId,
      ) => {
        setFeed(
          (
            prevFeed,
          ) =>
            prevFeed.filter(
              (
                post,
              ) =>
                post._id !==
                postId,
            ),
        );
        try {
          await api.post(
            `/content/${postId}/bookmark`,
          );
        } catch (error) {
          console.error(
            "Failed to remove bookmark",
          );
          fetchBookmarksAndRates();
        }
      };

    const handleLike =
      async (
        postId,
      ) => {
        setFeed(
          (
            prevFeed,
          ) =>
            prevFeed.map(
              (
                post,
              ) => {
                if (
                  post._id ===
                  postId
                ) {
                  const isLiked =
                    !post.isLiked;
                  return {
                    ...post,
                    isLiked,
                    likesCount:
                      isLiked
                        ? (post.likesCount ||
                            0) +
                          1
                        : Math.max(
                            0,
                            (post.likesCount ||
                              1) -
                              1,
                          ),
                  };
                }
                return post;
              },
            ),
        );
        try {
          await api.post(
            `/content/${postId}/like`,
          );
        } catch (error) {
          console.error(
            "Failed to sync like",
            error,
          );
        }
      };

    const submitComment =
      async (
        postId,
      ) => {
        if (
          !commentText.trim()
        )
          return;
        setSubmittingComment(
          true,
        );
        try {
          const response =
            await api.post(
              `/content/${postId}/comment`,
              {
                text: commentText,
              },
            );
          setFeed(
            (
              prevFeed,
            ) =>
              prevFeed.map(
                (
                  post,
                ) => {
                  if (
                    post._id ===
                    postId
                  ) {
                    return {
                      ...post,
                      commentsCount:
                        (post.commentsCount ||
                          0) +
                        1,
                      comments:
                        [
                          ...(post.comments ||
                            []),
                          response
                            .data
                            .comment,
                        ],
                    };
                  }
                  return post;
                },
              ),
          );
          setCommentText(
            "",
          );
        } catch (error) {
          alert(
            "Could not post comment. Try again.",
          );
        } finally {
          setSubmittingComment(
            false,
          );
        }
      };

    // --- 3. THE WIRE: INTERCEPTING THE CHECKOUT FLOW ---
    const openPaymentModal =
      (
        post,
        ppvPriceData,
      ) => {
        // Intercept NSFW content if unverified
        if (
          post.isNsfw &&
          !currentUser.isAgeVerified
        ) {
          setPendingRestrictedPost(
            {
              post,
              ppvPriceData,
            },
          );
          setShowAgeGate(
            true,
          );
          return; // STOP! Do not open the payment modal.
        }

        // Normal execution
        setPaymentModalPost(
          {
            ...post,
            fanPrice:
              ppvPriceData.price,
            fanCurrency:
              ppvPriceData.currency,
            creatorRawPrice:
              ppvPriceData.raw,
            creatorCurrency:
              ppvPriceData.rawCurrency,
          },
        );
        setPaymentMethod(
          null,
        );
        setCryptoQuote(
          null,
        );
      };

    const closeModal =
      () => {
        setPaymentModalPost(
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
          // Convert Fan's padded price back to USD for the quote
          const toFanRate =
            exchangeRates[
              paymentModalPost
                .fanCurrency
            ] ||
            1;
          const fanPriceInUSD =
            paymentModalPost.fanPrice /
            toFanRate;

          // Convert Creator's true raw price to USD for the quote
          const toRawRate =
            exchangeRates[
              paymentModalPost
                .creatorCurrency
            ] ||
            1;
          const rawPriceInUSD =
            paymentModalPost.creatorRawPrice /
            toRawRate;

          const {
            data,
          } =
            await api.post(
              "/purchases/crypto-quote",
              {
                amountUSD:
                  fanPriceInUSD,
                rawAmountUSD:
                  rawPriceInUSD, // <--- We send the raw amount here
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
          !paymentModalPost ||
          !paymentMethod
        )
          return;

        if (
          paymentMethod ===
          "CARD"
        ) {
          // --- WEB2 EXECUTION (DYNAMIC FIAT) ---
          // THE FIX: Gateway strictly requires the native merchant currency (NGN).
          // We calculate the exact NGN equivalent of the Fan's dynamic display price.
          const fanRate =
            exchangeRates[
              paymentModalPost
                .fanCurrency
            ] ||
            1;
          const ngnRate =
            exchangeRates[
              "NGN"
            ] ||
            1500; // Fallback rate safeguard

          // Reverse engineer the USD base price, then convert to NGN
          const priceInUSD =
            paymentModalPost.fanPrice /
            fanRate;
          const priceInNGN =
            priceInUSD *
            ngnRate;

          // Gateway expects subunits (Kobo)
          const amountInSubunits =
            Math.round(
              priceInNGN *
                100,
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
                    amountInSubunits,
                  currency:
                    "NGN", // Hardcoded to match your merchant gateway compliance
                },
              onSuccess:
                async (
                  reference,
                ) => {
                  setProcessingId(
                    paymentModalPost._id,
                  );
                  try {
                    // The backend verifyPayment expects the exact currency/amount you just charged
                    await api.post(
                      "/purchases/verify",
                      {
                        reference:
                          reference.reference,
                        paymentMethod:
                          "FIAT",
                        creatorId:
                          paymentModalPost
                            .creator
                            ._id,
                        contentId:
                          paymentModalPost._id,
                        purchaseType:
                          "PPV", // Feed items are always PPV
                        subscriptionTier:
                          null,

                        // Aligning charge payload with actual Gateway execution to pass fraud checks
                        chargeAmount:
                          priceInNGN,
                        chargeCurrency:
                          "NGN",

                        // Creator ledger relies strictly on raw amounts for the 80% platform split
                        rawAmount:
                          paymentModalPost.creatorRawPrice,
                        rawCurrency:
                          paymentModalPost.creatorCurrency,
                      },
                    );

                    // Refresh the feed to show the unlocked content
                    await pollForNewPosts();
                    closeModal();
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
            paymentModalPost._id,
          );

          if (
            !paymentModalPost
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

          // THE FIX: We pass BOTH the Fan's bloated price and the Creator's raw base price!
          const txHash =
            await transferUSDT(
              paymentModalPost
                .creator
                .walletAddress,
              cryptoQuote.requiredUSDT, // e.g., 3.50 USDT (Fan pays)
              cryptoQuote.rawUSDT, // e.g., 3.33 USDT (Contract Skim split)
              paymentModalPost._id,
            );

          if (
            !txHash
          )
            throw new Error(
              "Transaction completed but no hash was returned.",
            );

          // The backend uses rawAmount to credit the Creator's Wallet
          await api.post(
            "/purchases/verify",
            {
              txHash:
                txHash,
              paymentMethod:
                "CRYPTO",
              creatorId:
                paymentModalPost
                  .creator
                  ._id,
              contentId:
                paymentModalPost._id,
              purchaseType:
                "PPV", // Feed items are always PPV
              subscriptionTier:
                null,
              chargeAmount:
                paymentModalPost.fanPrice,
              chargeCurrency:
                paymentModalPost.fanCurrency,
              rawAmount:
                paymentModalPost.creatorRawPrice,
              rawCurrency:
                paymentModalPost.creatorCurrency,
            },
          );

          // Pull fresh feed data to remove the lock
          await pollForNewPosts();
          closeModal();
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
        <div className="flex justify-center items-center h-64 text-emerald-500 animate-pulse font-medium">
          <Loader2 className="w-6 h-6 mr-2 animate-spin" />{" "}
          Loading
          vault...
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8 border-b border-gray-800 pb-4">
          <Bookmark
            size={
              28
            }
            className="text-emerald-500 fill-current"
          />
          <h1 className="text-2xl font-bold text-slate-200">
            Your
            Saved
            Vault
          </h1>
        </div>

        {feed.length ===
        0 ? (
          <div className="text-center mt-20 flex flex-col items-center">
            <BookmarkMinus
              size={
                64
              }
              className="text-gray-700 mb-4"
            />
            <p className="text-gray-400 font-medium text-lg">
              Your
              vault
              is
              empty.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Content
              you
              bookmark
              from
              the
              feed
              will
              appear
              here.
            </p>
          </div>
        ) : (
          feed.map(
            (
              post,
            ) => {
              // THE FIX: Deep extraction from Creator Profile settings if post currency is missing
              const rawPostPrice =
                post.actualPrice !==
                undefined
                  ? post.actualPrice
                  : post.price ||
                    0;
              const rawPostCurrency =
                post.priceCurrency ||
                post
                  .creator
                  ?.monetizationSettings
                  ?.priceCurrency ||
                post
                  .creator
                  ?.preferredCurrency ||
                "USD";

              const ppvPriceData =
                getFanPrice(
                  rawPostPrice,
                  rawPostCurrency,
                );

              return (
                <FeedPostItem
                  key={
                    post._id
                  }
                  post={
                    post
                  }
                  ppvPriceData={
                    ppvPriceData
                  }
                  isRatesLoading={
                    !exchangeRates
                  }
                  handleFollowToggle={
                    handleFollowToggle
                  }
                  handleBookmark={
                    handleBookmark
                  }
                  handleLike={
                    handleLike
                  }
                  activeCommentPostId={
                    activeCommentPostId
                  }
                  setActiveCommentPostId={
                    setActiveCommentPostId
                  }
                  commentText={
                    commentText
                  }
                  setCommentText={
                    setCommentText
                  }
                  submitComment={
                    submitComment
                  }
                  submittingComment={
                    submittingComment
                  }
                  openPaymentModal={
                    openPaymentModal
                  }
                />
              );
            },
          )
        )}

        {/* --- 4. THE NEW AGE GATE UI COMPONENT --- */}
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

        {/* REUSABLE CHECKOUT MODAL */}
        {paymentModalPost && (
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
                    closeModal
                  }
                  className="text-gray-400 hover:text-white transition-colors"
                  disabled={
                    processingId ===
                    paymentModalPost._id
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
                <p className="text-sm text-gray-400 text-center leading-relaxed">
                  You
                  are
                  unlocking
                  content
                  from{" "}
                  <span className="text-white font-bold">
                    {
                      paymentModalPost
                        .creator
                        ?.username
                    }
                  </span>{" "}
                  for{" "}
                  <span className="text-emerald-500 font-bold">
                    {paymentModalPost.fanPrice.toFixed(
                      2,
                    )}{" "}
                    {
                      paymentModalPost.fanCurrency
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
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
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
                    <div className="mt-2 p-3 flex flex-col items-center justify-center text-sm text-emerald-500 animate-pulse font-medium">
                      <Loader2 className="w-5 h-5 mb-2 animate-spin" />{" "}
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
                      <p className="text-sm text-gray-400 mb-1">
                        Total:{" "}
                        <span className="text-white">
                          {paymentModalPost.fanPrice.toFixed(
                            2,
                          )}{" "}
                          {
                            paymentModalPost.fanCurrency
                          }
                        </span>
                      </p>
                      <p className="text-xl font-bold text-emerald-400">
                        Due:{" "}
                        {
                          cryptoQuote.requiredUSDT
                        }{" "}
                        USDT
                      </p>
                      <p className="text-xs text-emerald-500/70 mt-2 flex items-center justify-center gap-1 font-medium">
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
                    processingId ===
                      paymentModalPost._id
                  }
                  className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
                >
                  {processingId ===
                  paymentModalPost._id ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />{" "}
                      Processing...
                    </>
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

export default BookmarksFeed;
