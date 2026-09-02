import React, {
  useState,
  useEffect,
} from "react";
import {
  LayoutDashboard,
  Users,
  PlaySquare,
  ChevronRight,
  Image as ImageIcon,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../utils/api";


const FanDashboard =
  () => {
    const [
      data,
      setData,
    ] =
      useState(
        {
          subscriptions:
            [],
          ppv: [],
        },
      );
    const [
      loading,
      setLoading,
    ] =
      useState(
        true,
      );
    const [
      activeTab,
      setActiveTab,
    ] =
      useState(
        "SUBSCRIPTIONS",
      );

    useEffect(() => {
      fetchDashboardData();
    }, []);

    const fetchDashboardData =
      async () => {
        try {
          const response =
            await api.get(
              "/purchases/dashboard",
            );
          setData(
            response.data,
          );
        } catch (error) {
          console.error(
            "Failed to load dashboard",
            error,
          );
        } finally {
          setLoading(
            false,
          );
        }
      };

    if (
      loading
    ) {
      return (
        <div className="flex justify-center items-center h-64 text-emerald-500 animate-pulse">
          Loading
          dashboard...
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-4 mt-4 md:mt-0">
          <Link
            to="/fan/profile"
            className="md:hidden text-slate-400 hover:text-white mr-2 bg-slate-800/50 p-2 rounded-full"
          >
            <ArrowLeft
              size={
                20
              }
            />
          </Link>
          <LayoutDashboard
            size={
              28
            }
            className="text-emerald-500"
          />
          <h1 className="text-2xl font-bold text-slate-200">
            Your
            Dashboard
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() =>
              setActiveTab(
                "SUBSCRIPTIONS",
              )
            }
            className={`flex-1 py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab ===
              "SUBSCRIPTIONS"
                ? "bg-slate-800 text-emerald-500 shadow-lg border border-slate-700"
                : "bg-slate-900 text-slate-500 hover:bg-slate-900 border border-transparent"
            }`}
          >
            <Users
              size={
                20
              }
            />{" "}
            Active
            Subscriptions
          </button>
          <button
            onClick={() =>
              setActiveTab(
                "PPV",
              )
            }
            className={`flex-1 py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab ===
              "PPV"
                ? "bg-slate-800 text-emerald-500 shadow-lg border border-slate-700"
                : "bg-slate-900 text-slate-500 hover:bg-slate-900 border border-transparent"
            }`}
          >
            <PlaySquare
              size={
                20
              }
            />{" "}
            Unlocked
            Content
          </button>
        </div>

        {/* Tab Content: Subscriptions */}
        {activeTab ===
          "SUBSCRIPTIONS" && (
          <div className="space-y-4">
            {data
              .subscriptions
              ?.length ===
            0 ? (
              <p className="text-center text-slate-500 mt-10">
                You
                aren't
                subscribed
                to
                any
                creators
                yet.
              </p>
            ) : (
              data.subscriptions.map(
                (
                  sub,
                ) => (
                  <div
                    key={
                      sub._id
                    }
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center font-bold text-lg border border-slate-600">
                        {sub.creator?.username
                          ?.charAt(
                            0,
                          )
                          .toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">
                          {
                            sub
                              .creator
                              ?.username
                          }
                        </h3>
                        <p className="text-sm text-green-400">
                          Active
                          Subscription
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/creator/${sub.creator._id}`}
                      className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                      View
                      Profile{" "}
                      <ChevronRight
                        size={
                          16
                        }
                      />
                    </Link>
                  </div>
                ),
              )
            )}
          </div>
        )}

        {/* Tab Content: PPV Unlocks */}
        {activeTab ===
          "PPV" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data
              .ppv
              ?.length ===
            0 ? (
              <p className="text-center text-slate-500 mt-10 col-span-2">
                No
                PPV
                content
                unlocked
                yet.
              </p>
            ) : (
              data.ppv.map(
                (
                  item,
                ) => {
                  // 1. Extract the nested content object from the Purchase record
                  const contentObj =
                    item.content;

                  // If for some reason the content was deleted from the DB but the purchase remains, fail gracefully
                  if (
                    !contentObj
                  )
                    return null;

                  // 2. Safely grab the media URL from the nested object
                  const mediaSource =
                    contentObj.mediaUrl ||
                    `https://pub-${import.meta.env.VITE_CLOUDFLARE_R2_DEV_DOMAIN}.r2.dev/${contentObj.fileKey}`;

                  // 3. Robust image checking using the same logic from FanFeed
                  const isImage =
                    contentObj.fileType?.includes(
                      "image",
                    ) ||
                    contentObj.mediaType?.includes(
                      "image",
                    ) ||
                    mediaSource
                      ?.toLowerCase()
                      .match(
                        /\.(jpg|jpeg|png|gif|webp)/i,
                      );

                  return (
                    <div
                      key={
                        item._id
                      }
                      className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md flex flex-col"
                    >
                      <div className="bg-black aspect-video flex items-center justify-center relative overflow-hidden">
                        {isImage ? (
                          <img
                            src={
                              mediaSource
                            }
                            alt={
                              contentObj.title ||
                              "Unlocked Content"
                            }
                            onContextMenu={(
                              e,
                            ) =>
                              e.preventDefault()
                            }
                            draggable="false"
                            className="w-full h-full object-contain select-none"
                          />
                        ) : (
                          <video
                            src={
                              mediaSource
                            }
                            controls
                            controlsList="nodownload noplaybackrate"
                            disablePictureInPicture
                            onContextMenu={(
                              e,
                            ) =>
                              e.preventDefault()
                            }
                            className="w-full h-full object-contain"
                          >
                            Unsupported
                            browser.
                          </video>
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                            {isImage ? (
                              <ImageIcon
                                size={
                                  16
                                }
                                className="text-slate-400"
                              />
                            ) : (
                              <PlaySquare
                                size={
                                  16
                                }
                                className="text-slate-400"
                              />
                            )}
                            {contentObj.title ||
                              "Deleted Content"}
                          </h3>
                          <p className="text-xs text-slate-500 mb-3">
                            By{" "}
                            {item
                              .creator
                              ?.username ||
                              "Unknown"}
                          </p>
                        </div>
                        <div className="text-xs font-medium bg-emerald-500/10 text-emerald-500 inline-block px-3 py-1 rounded-full self-start border border-emerald-500/20">
                          Purchased
                          on{" "}
                          {new Date(
                            item.createdAt,
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                },
              )
            )}
          </div>
        )}
      </div>
    );
  };

export default FanDashboard;
