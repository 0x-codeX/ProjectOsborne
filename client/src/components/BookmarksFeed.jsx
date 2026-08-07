import React, {
  useState,
  useEffect,
} from "react";
import { useWeb3Transfer } from "../hooks/useWeb3Transfer";
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
} from "lucide-react";
import { Link } from "react-router-dom";

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
    const {
      transferUSDT,
    } =
      useWeb3Transfer();

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

    useEffect(() => {
      fetchBookmarks();
    }, []);

    const fetchBookmarks =
      async () => {
        try {
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const response =
            await fetch(
              "http://localhost:5000/api/content/bookmarked",
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
            setFeed(
              data,
            );
          }
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
            "Failed to remove bookmark",
          );
          fetchBookmarks();
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
            response.ok
          ) {
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
          }
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

    // --- FINAL EXECUTION HANDLER ---
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
          alert(
            "Paystack integration pending. Please use Web3 Crypto for now.",
          );
          return;
        }

        try {
          setProcessingId(
            paymentModalPost._id,
          );
          const txHash =
            await transferUSDT(
              paymentModalPost
                .creator
                .walletAddress,
              paymentModalPost.actualPrice,
              paymentModalPost._id,
            );

          await new Promise(
            (
              resolve,
            ) =>
              setTimeout(
                resolve,
                3000,
              ),
          );
          await fetchBookmarks();
          setPaymentModalPost(
            null,
          );
        } catch (error) {
          console.error(
            "Unlock failed:",
            error,
          );
          alert(
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
    ) {
      return (
        <div className="flex justify-center items-center h-64 text-emerald-500 animate-pulse">
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
            ) => (
              <div
                key={
                  post._id
                }
                className="mb-10 bg-nippy-obsidian border border-gray-800 rounded-2xl overflow-hidden shadow-xl"
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

                  {post.actualPrice >
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
                      className="w-full h-auto max-h-[600px] object-cover blur-3xl scale-[1.2] opacity-70 pointer-events-none select-none"
                    />
                  ) : (
                    <video
                      controls
                      className="w-full h-auto max-h-[600px] object-contain"
                      src={
                        post.mediaUrl
                      }
                    />
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
                        video.
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
                          for{" "}
                          {
                            post.actualPrice
                          }{" "}
                          USDT
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
                          !commentText.trim()
                        }
                        className="absolute right-2 text-emerald-500 p-1"
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
                  onClick={() =>
                    setPaymentModalPost(
                      null,
                    )
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
                    {
                      paymentModalPost.actualPrice
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
                <button
                  onClick={
                    executePayment
                  }
                  disabled={
                    !paymentMethod ||
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

export default BookmarksFeed;
