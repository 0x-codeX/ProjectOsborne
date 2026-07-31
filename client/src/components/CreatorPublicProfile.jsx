import React, {
  useState,
  useEffect,
} from "react";
import { useParams } from "react-router-dom";
import { ethers } from "ethers";
import {
  Lock,
  Unlock,
  PlayCircle,
  Star,
  ShieldCheck,
  Loader2,
} from "lucide-react";

const USDT_ABI =
  [
    "function transfer(address to, uint256 amount) returns (bool)",
  ];
const USDT_ADDRESS =
  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";

const CreatorPublicProfile =
  () => {
    const {
      id,
    } =
      useParams(); // Grabs the creator's ID from the URL
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

    const handleTransaction =
      async (
        type,
        post = null,
      ) => {
        try {
          setProcessingId(
            post
              ? post._id
              : "sub",
          );
          if (
            !window.ethereum
          )
            return alert(
              "Please install MetaMask.",
            );

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

          const amount =
            type ===
            "SUBSCRIPTION"
              ? profileData
                  .creator
                  .monetizationSettings
                  .monthlySubscription
              : post.actualPrice;

          const amountToPay =
            ethers.parseUnits(
              amount.toString(),
              6,
            );

          const tx =
            await usdtContract.transfer(
              profileData
                .creator
                .walletAddress,
              amountToPay,
            );
          await tx.wait();

          const token =
            localStorage.getItem(
              "nippy_token",
            );
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
                    post
                      ? post._id
                      : null,
                  creatorId:
                    id,
                  txHash:
                    tx.hash,
                  purchaseType:
                    type,
                },
              ),
            },
          );

          // Refresh to unlock content
          fetchProfile();
        } catch (error) {
          alert(
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
        <div className="flex justify-center items-center h-64 text-nippy-coral animate-pulse">
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
    } =
      profileData;
    const subPrice =
      creator
        .monetizationSettings
        ?.monthlySubscription ||
      0;

    return (
      <div className="max-w-4xl mx-auto pb-12">
        {/* Hero Banner */}
        <div className="h-48 bg-gradient-to-r from-gray-900 to-black border-b border-gray-800 relative">
          <div className="absolute -bottom-12 left-8 flex items-end gap-4">
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

          {/* Subscribe Button */}
          <div className="absolute -bottom-6 right-8">
            {isSubscribed ? (
              <button className="bg-gray-800 text-green-400 px-6 py-2 rounded-full font-bold flex items-center gap-2 border border-gray-700 cursor-default">
                <Unlock
                  size={
                    18
                  }
                />{" "}
                Subscribed
              </button>
            ) : subPrice >
              0 ? (
              <button
                onClick={() =>
                  handleTransaction(
                    "SUBSCRIPTION",
                  )
                }
                disabled={
                  processingId ===
                  "sub"
                }
                className="bg-nippy-coral text-white px-8 py-2 rounded-full font-bold hover:bg-nippy-coralHover transition-all flex items-center gap-2 shadow-lg"
              >
                {processingId ===
                "sub" ? (
                  <Loader2
                    size={
                      18
                    }
                    className="animate-spin"
                  />
                ) : (
                  <Star
                    size={
                      18
                    }
                  />
                )}
                Subscribe
                for
                $
                {
                  subPrice
                }
                /mo
              </button>
            ) : (
              <button className="bg-gray-800 text-white px-8 py-2 rounded-full font-bold border border-gray-700">
                Free
                Profile
              </button>
            )}
          </div>
        </div>

        {/* Content Grid */}
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
                  {/* Video Thumbnail / Locked State */}
                  <div className="bg-black aspect-square relative flex items-center justify-center border-b border-gray-800/50">
                    {post.isLocked ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4 text-center">
                        <Lock
                          size={
                            32
                          }
                          className="text-gray-500 mb-2"
                        />
                        <p className="text-white font-bold mb-3">
                          Locked
                          Content
                        </p>
                        <button
                          onClick={() =>
                            handleTransaction(
                              "PPV",
                              post,
                            )
                          }
                          disabled={
                            processingId ===
                            post._id
                          }
                          className="bg-nippy-coral/10 text-nippy-coral border border-nippy-coral/30 px-4 py-2 rounded-full text-sm font-bold hover:bg-nippy-coral transition-all hover:text-white"
                        >
                          {processingId ===
                          post._id
                            ? "Processing..."
                            : `Unlock for $${post.actualPrice}`}
                        </button>
                      </div>
                    ) : (
                      <div className="w-full h-full relative group">
                        <video
                          src={`https://pub-${import.meta.env.VITE_CLOUDFLARE_R2_DEV_DOMAIN}.r2.dev/${post.fileKey}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <PlayCircle
                            size={
                              48
                            }
                            className="text-white opacity-80"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
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
      </div>
    );
  };

export default CreatorPublicProfile;
