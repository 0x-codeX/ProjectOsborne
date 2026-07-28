import React, {
  useState,
} from "react";
import {
  Lock,
  PlayCircle,
  Unlock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { ethers } from "ethers";
import axios from "axios";

const FeedPost =
  ({
    post,
  }) => {
    // 1. Props Destructuring
    const {
      title,
      description,
      creator,
      isLocked,
      actualPrice,
    } =
      post;
    const subPrice =
      creator
        ?.monetizationSettings
        ?.monthlySubscription;

    // 2. Hooks MUST be at the top level
    const [
      streamUrl,
      setStreamUrl,
    ] =
      useState(
        null,
      );
    const [
      isFetchingStream,
      setIsFetchingStream,
    ] =
      useState(
        false,
      );
    const [
      streamError,
      setStreamError,
    ] =
      useState(
        "",
      );

    // 3. Purchase Logic
    const handlePurchase =
      async (
        type,
      ) => {
        try {
          if (
            !window.ethereum
          )
            throw new Error(
              "Please install a Web3 wallet like MetaMask.",
            );

          const provider =
            new ethers.BrowserProvider(
              window.ethereum,
            );
          const signer =
            await provider.getSigner();

          const USDT_ADDRESS =
            "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
          const minABI =
            [
              "function transfer(address to, uint256 amount) public returns (bool)",
            ];
          const usdtContract =
            new ethers.Contract(
              USDT_ADDRESS,
              minABI,
              signer,
            );

          const recipientWallet =
            creator.walletAddress;
          const amountInWei =
            ethers.parseUnits(
              actualPrice.toString(),
              6,
            );

          console.log(
            "Waiting for user approval...",
          );
          const tx =
            await usdtContract.transfer(
              recipientWallet,
              amountInWei,
            );

          console.log(
            "Transaction submitted! Hash:",
            tx.hash,
          );
          console.log(
            "Waiting for block confirmation...",
          );

          const receipt =
            await tx.wait();
          if (
            receipt.status !==
            1
          )
            throw new Error(
              "Transaction reverted by the blockchain.",
            );

          const storedUser =
            JSON.parse(
              localStorage.getItem(
                "nippy_user",
              ),
            );
          const response =
            await axios.post(
              "/api/purchases/verify",
              {
                contentId:
                  post._id,
                txHash:
                  tx.hash,
                purchaseType:
                  type,
              },
              {
                headers:
                  {
                    Authorization: `Bearer ${storedUser.token}`,
                  },
              },
            );

          alert(
            "Payment verified! Content unlocked.",
          );
          window.location.reload();
        } catch (error) {
          console.error(
            "Payment flow failed:",
            error,
          );
          alert(
            error.message ||
              "Payment failed or was rejected.",
          );
        }
      };

    // 4. Secure Video Stream Logic
    const handlePlayVideo =
      async () => {
        setIsFetchingStream(
          true,
        );
        setStreamError(
          "",
        );

        try {
          const storedUser =
            JSON.parse(
              localStorage.getItem(
                "nippy_user",
              ),
            );
          const res =
            await axios.get(
              `/api/media/stream/${post._id}`,
              {
                headers:
                  {
                    Authorization: `Bearer ${storedUser.token}`,
                  },
              },
            );

          setStreamUrl(
            res
              .data
              .streamUrl,
          );
        } catch (error) {
          console.error(
            "Failed to fetch stream:",
            error,
          );
          setStreamError(
            error
              .response
              ?.data
              ?.message ||
              "Failed to load video.",
          );
        } finally {
          setIsFetchingStream(
            false,
          );
        }
      };

    // 5. The SINGLE Return Statement
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl mb-8">
        {/* Header */}
        <div className="p-4 flex items-center border-b border-slate-800/50">
          <div className="w-10 h-10 bg-slate-700 rounded-full mr-3"></div>
          <div>
            <h3 className="text-white font-bold">
              @
              {
                creator.username
              }
            </h3>
            <p className="text-xs text-slate-400">
              2
              hours
              ago
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {isLocked ? (
            // --- LOCKED STATE (PAYWALL) ---
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md bg-slate-900/60 z-10">
              <div className="bg-slate-800/80 p-4 rounded-full mb-4">
                <Lock className="w-8 h-8 text-[#FF5757]" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Content
                Locked
              </h2>
              <p className="text-slate-300 mb-6 max-w-sm">
                {
                  title
                }
              </p>

              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                {/* PPV Button */}
                {actualPrice >
                  0 && (
                  <button
                    onClick={() =>
                      handlePurchase(
                        "PPV",
                      )
                    }
                    className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 px-4 rounded-xl transition-colors flex flex-col items-center justify-center"
                  >
                    <span className="text-sm text-slate-400 mb-1">
                      Unlock
                      Video
                    </span>
                    <span className="text-[#FF5757]">
                      {
                        actualPrice
                      }{" "}
                      USDT
                    </span>
                  </button>
                )}

                {/* Sub Button */}
                {subPrice >
                  0 && (
                  <button
                    onClick={() =>
                      handlePurchase(
                        "SUB",
                      )
                    }
                    className="flex-1 bg-[#FF5757] hover:bg-rose-600 text-white font-bold py-3 px-4 rounded-xl transition-colors flex flex-col items-center justify-center"
                  >
                    <span className="text-sm opacity-90 mb-1">
                      Subscribe
                      &
                      Unlock
                      All
                    </span>
                    <span>
                      {
                        subPrice
                      }{" "}
                      USDT/mo
                    </span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            // --- UNLOCKED STATE (VIDEO PLAYER) ---
            <div className="w-full h-full relative">
              {streamUrl ? (
                <video
                  src={
                    streamUrl
                  }
                  controls
                  controlsList="nodownload"
                  onContextMenu={(
                    e,
                  ) =>
                    e.preventDefault()
                  }
                  className="w-full h-full object-contain"
                  autoPlay
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
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950">
                  {isFetchingStream ? (
                    <Loader2 className="w-12 h-12 text-[#FF5757] animate-spin" />
                  ) : streamError ? (
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-2" />
                      <p className="text-rose-400">
                        {
                          streamError
                        }
                      </p>
                    </div>
                  ) : (
                    <div
                      className="text-center group cursor-pointer"
                      onClick={
                        handlePlayVideo
                      }
                    >
                      <PlayCircle className="w-16 h-16 text-[#FF5757] group-hover:scale-110 transition-transform mx-auto mb-2" />
                      <p className="text-slate-400 font-medium">
                        Play
                        Secure
                        Stream
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Metadata */}
        <div className="p-6">
          <h2 className="text-lg font-bold text-white mb-2">
            {
              title
            }
          </h2>
          <p className="text-slate-400 text-sm whitespace-pre-wrap">
            {
              description
            }
          </p>
          {isLocked && (
            <div className="mt-4 inline-flex items-center text-xs font-medium bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full border border-rose-500/20">
              <Lock className="w-3 h-3 mr-1" />{" "}
              Paywall
              Protected
            </div>
          )}
        </div>
      </div>
    );
  };

export default FeedPost;
