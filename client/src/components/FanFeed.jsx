import React, {
  useState,
  useEffect,
} from "react";
import { ethers } from "ethers";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Eye,
  Send,
  Lock,
  BadgeDollarSign,
} from "lucide-react";
import { Link } from "react-router-dom";

const USDT_ABI =
  [
    "function transfer(address to, uint256 amount) returns (bool)",
  ];
const USDT_ADDRESS =
  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; // Polygon Mainnet USDT

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

    useEffect(() => {
      fetchFeed();
    }, []);

    const fetchFeed =
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
            throw new Error(
              "Failed to load feed from server",
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

    // --- INTERACTION HANDLERS ---

    const handleLike =
      async (
        postId,
      ) => {
        // 1. Optimistic UI Update (Instant visual feedback)
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

        // 2. Background Backend Request
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
          // If you were being ruthless, you'd revert the UI state here if the fetch failed.
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

          // Replace the optimistic comment with the real one from the server (which includes the DB _id and username)
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
          ); // Clear the input field
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

    // --- PAYMENT HANDLER ---
    const handleUnlock =
      async (
        post,
      ) => {
        try {
          setProcessingId(
            post._id,
          );

          if (
            !window.ethereum
          ) {
            alert(
              "Please install MetaMask or another Web3 wallet.",
            );
            return;
          }

          const provider =
            new ethers.BrowserProvider(
              window.ethereum,
            );
          const signer =
            await provider.getSigner();
          const usdtContract =
            new ethers.Contract(
              USDT_ADDRESS,
              USDT_ABI,
              signer,
            );
          const amountToPay =
            ethers.parseUnits(
              post.actualPrice.toString(),
              6,
            );

          const tx =
            await usdtContract.transfer(
              post
                .creator
                .walletAddress,
              amountToPay,
            );
          await tx.wait();

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
                    Authorization: `Bearer ${token}`,
                    "Content-Type":
                      "application/json",
                  },
                body: JSON.stringify(
                  {
                    contentId:
                      post._id,
                    creatorId:
                      post
                        .creator
                        ._id,
                    txHash:
                      tx.hash,
                    purchaseType:
                      "PPV",
                  },
                ),
              },
            );

          if (
            !verifyResponse.ok
          )
            throw new Error(
              "Backend verification failed.",
            );

          await fetchFeed();
        } catch (error) {
          console.error(
            "Purchase failed:",
            error,
          );
          alert(
            "Transaction failed or was rejected.",
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
        <div className="flex justify-center items-center h-64 text-nippy-coral animate-pulse">
          Loading
          feed...
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
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
                className="mb-10 bg-nippy-obsidian border border-gray-800 rounded-2xl overflow-hidden shadow-xl"
              >
                {/* UPDATED: Clickable Creator Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
                  {/* WRAPPED IN A LINK WITH HOVER EFFECTS */}
                  <Link
                    to={`/creator/${post.creator?._id}`}
                    className="flex items-center gap-3 group cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden border border-gray-600 group-hover:border-nippy-coral transition-colors">
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
                      <div className="font-bold text-slate-200 group-hover:text-nippy-coral transition-colors">
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
                    <div className="flex items-center gap-1 bg-nippy-coral/10 text-nippy-coral px-3 py-1 rounded-full border border-nippy-coral/20 text-xs font-bold">
                      <BadgeDollarSign
                        size={
                          14
                        }
                      />{" "}
                      PPV
                    </div>
                  )}
                </div>

                {/* Media Area */}
                <div className="relative bg-black w-full min-h-[300px] flex items-center justify-center">
                  {post.isLocked ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6 text-center">
                      <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4 shadow-lg">
                        <Lock
                          size={
                            28
                          }
                          className="text-nippy-coral"
                        />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        Exclusive
                        Content
                        Locked
                      </h3>
                      <p className="text-sm text-gray-400 mb-6 max-w-sm">
                        {
                          post.title
                        }{" "}
                        —
                        Unlock
                        to
                        view
                        this
                        content
                        and
                        support
                        the
                        creator
                        directly.
                      </p>

                      <button
                        onClick={() =>
                          handleUnlock(
                            post,
                          )
                        }
                        disabled={
                          processingId ===
                          post._id
                        }
                        className="bg-nippy-coral text-white px-8 py-3 rounded-full font-bold hover:bg-nippy-coralHover disabled:opacity-50 transition-all shadow-lg shadow-nippy-coral/20"
                      >
                        {processingId ===
                        post._id
                          ? "Confirming in Web3..."
                          : `Unlock for $${post.actualPrice} USDT`}
                      </button>
                      <p className="text-xs text-gray-500 mt-4">
                        Protected
                        by
                        30-Day
                        Sunset
                        Escrow
                      </p>
                    </div>
                  ) : (
                    <video
                      controls
                      className="w-full h-auto max-h-[600px] object-contain"
                      src={`https://pub-${import.meta.env.VITE_CLOUDFLARE_R2_DEV_DOMAIN}.r2.dev/${post.fileKey}`}
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
                  )}
                </div>

                {/* Post Details & Action Bar */}
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

                  {/* Action Bar */}
                  <div className="flex items-center justify-between border-t border-gray-800/50 pt-4">
                    <div className="flex items-center gap-6">
                      {/* Like Button */}
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
                          className={`transition-all duration-200 ${post.isLiked ? "text-nippy-coral fill-current scale-110" : "text-gray-400 group-hover:text-nippy-coral"}`}
                        />
                        <span className="text-sm text-gray-400 font-medium">
                          {post.likesCount ||
                            0}
                        </span>
                      </button>

                      {/* Comment Toggle Button */}
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

                      {/* Views Count (Read Only) */}
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

                    {/* Bookmark Button */}
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

                {/* Inline Comment Box Dropdown */}
                {activeCommentPostId ===
                  post._id && (
                  <div className="bg-slate-900 border-t border-gray-800 p-4 animate-in slide-in-from-top-2">
                    {/* Existing Comments List */}
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

                    {/* Comment Input Field */}
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
                        className="w-full bg-black border border-gray-700 text-white text-sm rounded-full py-2 pl-4 pr-12 focus:outline-none focus:border-nippy-coral"
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
                        className="absolute right-2 text-nippy-coral hover:text-white disabled:opacity-50 transition-colors p-1"
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
      </div>
    );
  };

export default FanFeed;
