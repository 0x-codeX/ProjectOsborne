import React, {
  useState,
  useEffect,
  useRef,
} from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import { usePaystackPayment } from "react-paystack";
import { useWeb3Transfer } from "../hooks/useWeb3Transfer";
import AgeVerificationGate from "./AgeVerificationGate";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Eye,
  Send,
  Lock,
  BadgeDollarSign,
  Wallet,
  CreditCard,
  X,
  UserPlus,
  UserCheck,
  Radio,
  PlayCircle,
  Loader2,
} from "lucide-react";
import api from "../utils/api";

// ==========================================
// INDIVIDUAL POST COMPONENT
// ==========================================
const FeedPostItem =
  ({
    post,
    onFollowToggle,
    onLike,
    onBookmark,
    activeCommentPostId,
    setActiveCommentPostId,
    commentText,
    setCommentText,
    submitComment,
    submittingComment,
    openPaymentModal,
    exchangeRates,
    fanCurrency,
  }) => {
    // Extract Raw Creator Data
    const creatorRawPrice =
      post.actualPrice !==
      undefined
        ? post.actualPrice
        : post.price ||
          0;
    const creatorCurrency =
      post.priceCurrency ||
      post.creator?.monetizationSettings?.priceCurrency || post.creator?.preferredCurrency || "USD";
    const isFreeContent =
      creatorRawPrice <=
      0;

    // --- THE PROFIT ENGINE (Synchronous Skim) ---
    const getFanPrice =
      (
        creatorPrice,
        cCurr = "USD",
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
              cCurr,
          };
        }
        const toUSD =
          exchangeRates[
            cCurr
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
        // The Skim: Round UP to the nearest 0.50 interval
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
            cCurr,
        };
      };

    const ppvPriceData =
      getFanPrice(
        creatorRawPrice,
        creatorCurrency,
      );

    return (
      <div
        data-post-id={
          post._id
        }
        className="feed-post-card mb-10 bg-nippy-obsidian/80 backdrop-blur-md border border-gray-800/60 rounded-2xl overflow-hidden shadow-xl"
      >
        {/* Creator Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
          <Link
            to={`/creator/${post.creator?._id}`}
            className="flex items-center gap-3 group cursor-pointer"
          >
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
                className="w-10 h-10 rounded-full object-cover border border-gray-700 group-hover:border-emerald-500 transition-colors"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center border border-gray-600 group-hover:border-emerald-500 transition-colors">
                <span className="font-bold text-gray-300 group-hover:text-white">
                  {post.creator?.username
                    ?.charAt(
                      0,
                    )
                    .toUpperCase() ||
                    "U"}
                </span>
              </div>
            )}
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
                onFollowToggle(
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

        {/* Media Container */}
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

          {/* Lock Overlay */}
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
                    disabled={
                      !exchangeRates
                    }
                    onClick={() => {
                      openPaymentModal(
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
                    }}
                    className="bg-white hover:bg-gray-200 text-black font-bold py-3 px-6 rounded-full flex items-center justify-center gap-2 transition-colors shadow-lg disabled:opacity-70"
                  >
                    {!exchangeRates ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <BadgeDollarSign
                        size={
                          20
                        }
                      />
                    )}
                    {!exchangeRates
                      ? "Calculating..."
                      : `Unlock for ${ppvPriceData.price.toFixed(2)} ${ppvPriceData.currency}`}
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

        {/* Content Details */}
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
            !post.isLocked &&
            !isFreeContent && (
              <div className="inline-flex px-4 py-2 mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg font-bold text-sm">
                Purchased
              </div>
            )}

          <div className="flex items-center justify-between border-t border-gray-800/50 pt-4">
            <div className="flex items-center gap-6">
              <button
                onClick={() =>
                  onLike(
                    post._id,
                  )
                }
                className="flex items-center gap-2 group transition-colors"
              >
                <Heart
                  size={
                    22
                  }
                  className={`transition-all duration-200 ${
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
                className="flex items-center gap-2 group transition-colors"
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
                onBookmark(
                  post._id,
                )
              }
              className="transition-colors"
            >
              <Bookmark
                size={
                  22
                }
                className={
                  post.isBookmarked
                    ? "fill-white text-white"
                    : "text-gray-400 hover:text-white"
                }
              />
            </button>
          </div>
        </div>

        {/* Comments Section */}
        {activeCommentPostId ===
          post._id && (
          <div className="bg-slate-900/80 backdrop-blur-md border-t border-gray-800/60 p-4 animate-in slide-in-from-top-2">
            <div className="max-h-48 overflow-y-auto mb-4 space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-700">
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
                  Be
                  the
                  first!
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
                placeholder="Write a comment..."
                onKeyDown={(
                  e,
                ) =>
                  e.key ===
                    "Enter" &&
                  submitComment(
                    post._id,
                  )
                }
                className="w-full bg-black border border-gray-700 text-white text-sm rounded-full py-2 pl-4 pr-12 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() =>
                  submitComment(
                    post._id,
                  )
                }
                disabled={
                  submittingComment ||
                  !commentText.trim()
                }
                className="absolute right-2 text-emerald-500 hover:text-emerald-400 disabled:opacity-50 transition-colors p-1"
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

// ==========================================
// MAIN FEED COMPONENT
// ==========================================
const FanFeed =
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

    // --- GLOBAL PRICING STATES ---
    const [
      exchangeRates,
      setExchangeRates,
    ] =
      useState(
        null,
      );
    const [
      fanCurrency,
      setFanCurrency,
    ] =
      useState(
        "USD",
      );

    const {
      transferUSDT,
    } =
      useWeb3Transfer();
    const navigate =
      useNavigate();

    const currentUser =
      JSON.parse(
        localStorage.getItem(
          "nippy_user",
        ) ||
          "{}",
      );
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
      pendingPosts,
      setPendingPosts,
    ] =
      useState(
        [],
      );
    const feedRef =
      useRef(
        [],
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
    const [
      fetchingQuote,
      setFetchingQuote,
    ] =
      useState(
        false,
      );

    // --- THE NEW AGE VERIFICATION INTERCEPTOR (THE WIRE) ---
    const openPaymentModal =
      (
        modalData,
      ) => {
        // Intercept NSFW content if the fan is unverified
        if (
          modalData.isNsfw &&
          !currentUser.isAgeVerified
        ) {
          setPendingRestrictedPost(
            modalData,
          );
          setShowAgeGate(
            true,
          );
          return; // STOP! Do not open the payment modal.
        }

        // Normal execution if they are verified or it's SFW
        setPaymentModalPost(
          modalData,
        );
        setPaymentMethod(
          null,
        );
        setCryptoQuote(
          null,
        );
      };

    useEffect(() => {
      feedRef.current =
        feed;
    }, [
      feed,
    ]);

    const viewedPosts =
      useRef(
        new Set(),
      );
    const recordView =
      async (
        postId,
      ) => {
        if (
          viewedPosts.current.has(
            postId,
          )
        )
          return;
        viewedPosts.current.add(
          postId,
        );
        try {
          await api.post(
            `/content/${postId}/view`,
          );
        } catch (error) {
          console.error(
            "Failed to record view",
          );
        }
      };

    useEffect(() => {
      const observer =
        new IntersectionObserver(
          (
            entries,
          ) => {
            entries.forEach(
              (
                entry,
              ) => {
                if (
                  entry.isIntersecting
                ) {
                  const postId =
                    entry.target.getAttribute(
                      "data-post-id",
                    );
                  if (
                    postId
                  ) {
                    recordView(
                      postId,
                    );
                    observer.unobserve(
                      entry.target,
                    );
                  }
                }
              },
            );
          },
          {
            threshold: 0.6,
          },
        );
      const elements =
        document.querySelectorAll(
          ".feed-post-card",
        );
      elements.forEach(
        (
          el,
        ) =>
          observer.observe(
            el,
          ),
      );
      return () =>
        observer.disconnect();
    }, [
      feed,
    ]);

    useEffect(() => {
      fetchFeedAndRates();
      const pollInterval =
        setInterval(
          () =>
            pollForNewPosts(),
          15000,
        );
      return () =>
        clearInterval(
          pollInterval,
        );
    }, []);

    const FALLBACK_RATES =
      {
        USD: 1,
        NGN: 1500,
        EUR: 0.92,
        GBP: 0.79,
        GHS: 14.5,
      };

    const fetchFeedAndRates =
      async () => {
        setLoading(
          true,
        );
        try {
          // Set local currency immediately from local storage
          setFanCurrency(
            currentUser?.preferredCurrency ||
              "USD",
          );

          // Fetch feed and exchange rates simultaneously
          const [
            feedRes,
            ratesRes,
          ] =
            await Promise.all(
              [
                api.get(
                  "/content/feed",
                ),
                // If the API fails, it falls back to realistic rates, NOT just { USD: 1 }
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
            "Failed to load feed and rates",
            error,
          );
        } finally {
          setLoading(
            false,
          );
        }
      };

    const pollForNewPosts =
      async () => {
        try {
          const response =
            await api.get(
              "/content/feed",
            );
          const freshData =
            response.data;
          const currentFeed =
            feedRef.current;
          if (
            currentFeed.length ===
            0
          )
            return;

          const existingIds =
            new Set(
              currentFeed.map(
                (
                  post,
                ) =>
                  post._id,
              ),
            );
          const newPosts =
            freshData.filter(
              (
                post,
              ) =>
                !existingIds.has(
                  post._id,
                ),
            );

          if (
            newPosts.length >
            0
          ) {
            setPendingPosts(
              (
                prev,
              ) => {
                const pendingIds =
                  new Set(
                    prev.map(
                      (
                        p,
                      ) =>
                        p._id,
                    ),
                  );
                const trulyNew =
                  newPosts.filter(
                    (
                      p,
                    ) =>
                      !pendingIds.has(
                        p._id,
                      ),
                  );
                return [
                  ...trulyNew,
                  ...prev,
                ];
              },
            );
          }
        } catch (error) {
          console.error(
            "Silent poll failed",
            error,
          );
        }
      };

    const injectPendingPosts =
      () => {
        setFeed(
          (
            prev,
          ) => [
            ...pendingPosts,
            ...prev,
          ],
        );
        setPendingPosts(
          [],
        );
        window.scrollTo(
          {
            top: 0,
            behavior:
              "smooth",
          },
        );
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
        } catch (error) {}
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
        } catch (error) {}
      };

    const handleBookmark =
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
              ) =>
                post._id ===
                postId
                  ? {
                      ...post,
                      isBookmarked:
                        !post.isBookmarked,
                    }
                  : post,
            ),
        );
        try {
          await api.post(
            `/content/${postId}/bookmark`,
          );
        } catch (error) {}
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
      loading
    )
      return (
        <div className="flex justify-center items-center h-64 text-emerald-500 animate-pulse font-bold">
          Loading
          feed...
        </div>
      );

    return (
      <div className="max-w-2xl mx-auto py-8 px-4 relative">
        {pendingPosts.length >
          0 && (
          <div className="sticky top-4 z-50 flex justify-center mb-6 animate-in slide-in-from-top-2 duration-300">
            <button
              onClick={
                injectPendingPosts
              }
              className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold py-2.5 px-6 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-2 transition-all transform hover:scale-105 border border-emerald-400/50"
            >
              ↑{" "}
              {
                pendingPosts.length
              }{" "}
              New
              Post
              {pendingPosts.length >
              1
                ? "s"
                : ""}
            </button>
          </div>
        )}

        {feed.length ===
        0 ? (
          <p className="text-center text-gray-500 mt-10">
            No
            content
            available.
          </p>
        ) : (
          feed.map(
            (
              post,
            ) => {
              if (
                post.type ===
                "LIVE_STREAM"
              ) {
                return (
                  <div
                    key={
                      post._id
                    }
                    data-post-id={
                      post._id
                    }
                    className="feed-post-card mb-10 bg-red-950/20 backdrop-blur-md border border-red-500/40 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(239,68,68,0.15)] relative"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-rose-500 animate-pulse"></div>
                    <div className="flex items-center justify-between p-4 border-b border-red-500/20">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={
                              post
                                .creator
                                ?.profileImage ||
                              "https://placehold.co/100x100"
                            }
                            alt={
                              post
                                .creator
                                ?.username
                            }
                            className="w-12 h-12 rounded-full object-cover border-2 border-red-500 animate-pulse"
                          />
                          <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1 border border-black">
                            <Radio
                              size={
                                10
                              }
                              className="text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-white text-lg">
                            {
                              post
                                .creator
                                ?.username
                            }
                          </div>
                          <div className="text-xs text-red-400 font-bold flex items-center gap-1 tracking-wider uppercase">
                            LIVE
                            NOW
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-8 text-center bg-black/40">
                      <h2 className="text-2xl font-black text-white mb-3">
                        {
                          post.title
                        }
                      </h2>
                      <p className="text-gray-400 mb-8 max-w-md mx-auto">
                        {
                          post
                            .creator
                            ?.username
                        }{" "}
                        is
                        broadcasting
                        live
                        right
                        now.
                        Join
                        the
                        room
                        to
                        watch,
                        chat,
                        and
                        send
                        gifts.
                      </p>
                      {post.hasAccess ? (
                        <button
                          onClick={() =>
                            navigate(
                              `/live/${post._id}`,
                            )
                          }
                          className="inline-flex items-center justify-center w-full max-w-xs gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 px-8 rounded-xl transition-all hover:scale-105 shadow-lg shadow-red-500/30"
                        >
                          <PlayCircle
                            size={
                              20
                            }
                          />{" "}
                          Join
                          Stream
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            navigate(
                              `/creator/${post.creator._id}`,
                            )
                          }
                          className="inline-flex items-center justify-center w-full max-w-xs gap-2 bg-white hover:bg-gray-200 text-black font-bold py-3.5 px-8 rounded-xl transition-all hover:scale-105 shadow-lg"
                        >
                          <Lock
                            size={
                              20
                            }
                          />{" "}
                          Subscribe
                          Profile
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <FeedPostItem
                  key={
                    post._id
                  }
                  post={
                    post
                  }
                  exchangeRates={
                    exchangeRates
                  }
                  fanCurrency={
                    fanCurrency
                  }
                  onFollowToggle={
                    handleFollowToggle
                  }
                  onLike={
                    handleLike
                  }
                  onBookmark={
                    handleBookmark
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
                  openPaymentModal={(
                    modalData,
                  ) => {
                    setPaymentModalPost(
                      modalData,
                    );
                    setPaymentMethod(
                      null,
                    );
                  }}
                />
              );
            },
          )
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
                <p className="text-sm text-gray-400 text-center">
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
                    {paymentModalPost.fanPrice?.toFixed(
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
                      <p className="text-sm text-gray-400 mb-1">
                        Total:{" "}
                        <span className="text-white">
                          {paymentModalPost.fanPrice?.toFixed(
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
                    processingId ===
                      paymentModalPost._id
                  }
                  className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
                >
                  {processingId ===
                  paymentModalPost._id ? (
                    <span className="animate-pulse flex items-center gap-2">
                      <Loader2
                        size={
                          18
                        }
                        className="animate-spin"
                      />{" "}
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
  };;

export default FanFeed;
