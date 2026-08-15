import React, {
  useState,
  useEffect,
  useRef,
} from "react";
import { Link } from "react-router-dom";
import { usePaystackPayment } from "react-paystack";
import { useWeb3Transfer } from "../hooks/useWeb3Transfer";
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
} from "lucide-react";

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
    const {
      transferUSDT,
    } =
      useWeb3Transfer();

    // Current User for Fiat Checkout
    const currentUser =
      JSON.parse(
        localStorage.getItem(
          "nippy_user",
        ) ||
          "{}",
      );

    // Paystack Initialization
    const initializePayment =
      usePaystackPayment(
        {
          publicKey:
            import.meta
              .env
              .VITE_PAYSTACK_PUBLIC_KEY,
        },
      );

    // Staging Area for new posts
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

    // Interaction States
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

    useEffect(() => {
      feedRef.current =
        feed;
    }, [
      feed,
    ]);

    // ==========================================
    // 1. VIEW TRACKING LOGIC (INTERSECTION OBSERVER)
    // ==========================================
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
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          await fetch(
            `http://localhost:5000/api/content/${postId}/view`,
            {
              method:
                "POST",
              headers:
                {
                  Authorization: `Bearer ${token}`,
                },
            },
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

    // Silent Polling Architecture
    useEffect(() => {
      fetchFeed();
      const pollInterval =
        setInterval(
          () => {
            pollForNewPosts();
          },
          15000,
        );

      return () =>
        clearInterval(
          pollInterval,
        );
    }, []);

    const fetchFeed =
      async () => {
        setLoading(
          true,
        );
        try {
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const response =
            await fetch(
              "http://localhost:5000/api/content/feed",
              {
                method:
                  "GET",
                headers:
                  {
                    Authorization: `Bearer ${token}`,
                    "Content-Type":
                      "application/json",
                  },
              },
            );

          if (
            !response.ok
          )
            throw new Error(
              "Failed to load feed",
            );
          const data =
            await response.json();
          setFeed(
            data,
          );
        } catch (error) {
          console.error(
            "Failed to load feed",
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
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const response =
            await fetch(
              "http://localhost:5000/api/content/feed",
              {
                method:
                  "GET",
                headers:
                  {
                    Authorization: `Bearer ${token}`,
                    "Content-Type":
                      "application/json",
                  },
              },
            );

          if (
            !response.ok
          )
            return;
          const freshData =
            await response.json();
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
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          await fetch(
            `http://localhost:5000/api/users/${creatorId}/follow`,
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
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          await fetch(
            `http://localhost:5000/api/content/${postId}/like`,
            {
              method:
                "POST",
              headers:
                {
                  Authorization: `Bearer ${token}`,
                },
            },
          );
        } catch (error) {
          console.error(
            "Failed to sync like with server",
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
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          await fetch(
            `http://localhost:5000/api/content/${postId}/bookmark`,
            {
              method:
                "POST",
              headers:
                {
                  Authorization: `Bearer ${token}`,
                },
            },
          );
        } catch (error) {
          console.error(
            "Failed to sync bookmark with server",
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
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const response =
            await fetch(
              `http://localhost:5000/api/content/${postId}/comment`,
              {
                method:
                  "POST",
                headers:
                  {
                    Authorization: `Bearer ${token}`,
                    "Content-Type":
                      "application/json",
                  },
                body: JSON.stringify(
                  {
                    text: commentText,
                  },
                ),
              },
            );

          if (
            !response.ok
          )
            throw new Error(
              "Failed to post comment",
            );
          const data =
            await response.json();

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
                          data.comment,
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
          console.error(
            "Failed to post comment",
          );
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
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const baseAmountUSD =
            paymentModalPost.displayPrice ||
            paymentModalPost.actualPrice ||
            0;

          const res =
            await fetch(
              "http://localhost:5000/api/purchases/crypto-quote",
              {
                method:
                  "POST",
                headers:
                  {
                    Authorization: `Bearer ${token}`,
                    "Content-Type":
                      "application/json",
                  },
                body: JSON.stringify(
                  {
                    amountUSD:
                      baseAmountUSD,
                  },
                ),
              },
            );

          if (
            !res.ok
          )
            throw new Error(
              "Failed to fetch quote",
            );
          const data =
            await res.json();
          setCryptoQuote(
            data,
          );
        } catch (error) {
          console.error(
            "Quote error:",
            error,
          );
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

    // UNIFIED PAYMENT ROUTER
    const executePayment =
      async () => {
        if (
          !paymentModalPost ||
          !paymentMethod
        )
          return;
        const creatorId =
          paymentModalPost
            .creator
            ?._id;
        const baseAmountUSD =
          paymentModalPost.displayPrice ||
          paymentModalPost.actualPrice;

        if (
          paymentMethod ===
          "CARD"
        ) {
          const exchangeRate = 1500; // Can be fetched from settings later
          const amountInKobo =
            Math.round(
              baseAmountUSD *
                exchangeRate *
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
                    amountInKobo,
                },
              onSuccess:
                async (
                  reference,
                ) => {
                  setProcessingId(
                    paymentModalPost._id,
                  );
                  try {
                    const token =
                      localStorage.getItem(
                        "nippy_token",
                      );
                    const res =
                      await fetch(
                        "http://localhost:5000/api/purchases/verify",
                        {
                          method:
                            "POST",
                          headers:
                            {
                              Authorization: `Bearer ${token}`,
                              "Content-Type":
                                "application/json",
                            },
                          body: JSON.stringify(
                            {
                              reference:
                                reference.reference,
                              paymentMethod:
                                "FIAT",
                              creatorId:
                                creatorId,
                              contentId:
                                paymentModalPost._id,
                              purchaseType:
                                "PPV",
                            },
                          ),
                        },
                      );

                    if (
                      !res.ok
                    ) {
                      const errData =
                        await res.json();
                      throw new Error(
                        errData.message ||
                          "Verification failed on backend.",
                      );
                    }

                    await fetchFeed();
                    closeModal();
                  } catch (error) {
                    console.error(
                      "Fiat Error:",
                      error,
                    );
                    alert(
                      error.message ||
                        "Fiat verification failed.",
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

        // WEB3 CRYPTO EXECUTION (Using the dynamic quote)
        try {
          setProcessingId(
            paymentModalPost._id,
          );

          if (
            !paymentModalPost
              .creator
              ?.walletAddress
          ) {
            throw new Error(
              "This creator has not set up their Web3 wallet address yet!",
            );
          }

          if (
            !cryptoQuote ||
            !cryptoQuote.requiredUSDT
          ) {
            throw new Error(
              "Missing crypto quote. Please re-select the payment method.",
            );
          }

          const txHash =
            await transferUSDT(
              paymentModalPost
                .creator
                .walletAddress,
              cryptoQuote.requiredUSDT,
              paymentModalPost._id,
            );

          if (
            !txHash
          )
            throw new Error(
              "Transaction completed but no hash returned.",
            );

          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const res =
            await fetch(
              "http://localhost:5000/api/purchases/verify",
              {
                method:
                  "POST",
                headers:
                  {
                    Authorization: `Bearer ${token}`,
                    "Content-Type":
                      "application/json",
                  },
                body: JSON.stringify(
                  {
                    txHash,
                    paymentMethod:
                      "CRYPTO",
                    creatorId:
                      creatorId,
                    contentId:
                      paymentModalPost._id,
                    purchaseType:
                      "PPV",
                  },
                ),
              },
            );

          if (
            !res.ok
          ) {
            const errData =
              await res.json();
            throw new Error(
              errData.message ||
                "Backend verification failed.",
            );
          }

          await fetchFeed();
          closeModal();
        } catch (error) {
          console.error(
            "Unlock Error Trace:",
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
    ) {
      return (
        <div className="flex justify-center items-center h-64 text-emerald-500 animate-pulse">
          Loading
          feed...
        </div>
      );
    }

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
            ) => (
              <div
                key={
                  post._id
                }
                data-post-id={
                  post._id
                }
                className="feed-post-card mb-10 bg-nippy-obsidian/80 backdrop-blur-md border border-gray-800/60 rounded-2xl overflow-hidden shadow-xl"
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
                  <Link
                    to={`/creator/${post.creator?._id}`}
                    className="flex items-center gap-3 group cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden border border-gray-600 group-hover:border-emerald-500 transition-colors">
                      <span className="font-bold text-gray-300 group-hover:text-white">
                        {post.creator?.username
                          ?.charAt(
                            0,
                          )
                          .toUpperCase() ||
                          "U"}
                      </span>
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
                    {post.displayPrice >
                      0 && (
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
                  {post.isLocked ? (
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

                  {post.isLocked && (
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
                          onClick={() => {
                            setPaymentModalPost(
                              post,
                            );
                            setPaymentMethod(
                              null,
                            );
                          }}
                          className="bg-white hover:bg-gray-200 text-black font-bold py-3 px-6 rounded-full flex items-center justify-center gap-2 transition-colors shadow-lg"
                        >
                          <BadgeDollarSign
                            size={
                              20
                            }
                          />
                          Unlock
                          for
                          $
                          {post.displayPrice?.toFixed(
                            2,
                          ) ||
                            post.actualPrice}{" "}
                          USD
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
                    !post.isUnlocked && (
                      <button
                        onClick={() => {
                          setPaymentModalPost(
                            post,
                          );
                          setPaymentMethod(
                            null,
                          );
                        }}
                        className="px-4 py-2 mb-4 bg-[#FF5757] text-white rounded-lg font-bold text-sm hover:bg-rose-600 transition-colors"
                      >
                        Unlock
                        for
                        USD{" "}
                        {post.displayPrice?.toFixed(
                          2,
                        ) ||
                          post.actualPrice}
                      </button>
                    )}

                  <div className="flex items-center justify-between border-t border-gray-800/50 pt-4">
                    <div className="flex items-center gap-6">
                      <button
                        onClick={() =>
                          handleLike(
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
                        handleBookmark(
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
            ),
          )
        )}

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
                    $
                    {paymentModalPost.displayPrice ||
                      paymentModalPost.actualPrice}{" "}
                    USD
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

                {/* DYNAMIC CRYPTO QUOTE DISPLAY */}
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
                    processingId ===
                      paymentModalPost._id
                  }
                  className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
                >
                  {processingId ===
                  paymentModalPost._id ? (
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

export default FanFeed;
