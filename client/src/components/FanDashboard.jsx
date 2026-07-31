import React, {
  useState,
  useEffect,
} from "react";
import {
  LayoutDashboard,
  Users,
  PlaySquare,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

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
      ); // or "PPV"

    useEffect(() => {
      fetchDashboardData();
    }, []);

    const fetchDashboardData =
      async () => {
        try {
          const token =
            localStorage.getItem(
              "nippy_token",
            );
          const response =
            await fetch(
              "http://localhost:5000/api/purchases/dashboard",
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
            const result =
              await response.json();
            setData(
              result,
            );
          }
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
        <div className="flex justify-center items-center h-64 text-nippy-coral animate-pulse">
          Loading
          dashboard...
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 border-b border-gray-800 pb-4">
          <LayoutDashboard
            size={
              28
            }
            className="text-nippy-coral"
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
                ? "bg-gray-800 text-nippy-coral shadow-lg border border-gray-700"
                : "bg-nippy-obsidian text-gray-500 hover:bg-gray-900 border border-transparent"
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
                ? "bg-gray-800 text-nippy-coral shadow-lg border border-gray-700"
                : "bg-nippy-obsidian text-gray-500 hover:bg-gray-900 border border-transparent"
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
              .length ===
            0 ? (
              <p className="text-center text-gray-500 mt-10">
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
                    className="bg-nippy-obsidian border border-gray-800 rounded-xl p-4 flex items-center justify-between shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center font-bold text-lg border border-gray-600">
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
                    {/* 
                  NOTE: When you build the Creator Profile view for fans, 
                  you will change this Link to point to `/creator/${sub.creator._id}` 
                */}
                    <Link
                      to={`/creator/${sub.creator._id}`}
                      className="flex items-center gap-1 text-sm font-medium text-gray-400 hover:text-white transition-colors"
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
              .length ===
            0 ? (
              <p className="text-center text-gray-500 mt-10 col-span-2">
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
                ) => (
                  <div
                    key={
                      item._id
                    }
                    className="bg-nippy-obsidian border border-gray-800 rounded-xl overflow-hidden shadow-md flex flex-col"
                  >
                    <div className="bg-black aspect-video flex items-center justify-center">
                      {/* Render the unlocked video */}
                      <video
                        controls
                        className="w-full h-full object-contain"
                        src={`https://pub-${import.meta.env.VITE_CLOUDFLARE_R2_DEV_DOMAIN}.r2.dev/${item.content?.fileKey}`}
                      >
                        Unsupported
                        browser.
                      </video>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-white mb-1">
                          {item
                            .content
                            ?.title ||
                            "Deleted Content"}
                        </h3>
                        <p className="text-xs text-gray-500 mb-3">
                          By{" "}
                          {
                            item
                              .creator
                              ?.username
                          }
                        </p>
                      </div>
                      <div className="text-xs font-medium bg-nippy-coral/10 text-nippy-coral inline-block px-3 py-1 rounded-full self-start">
                        Purchased
                        on{" "}
                        {new Date(
                          item.createdAt,
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        )}
      </div>
    );
  };

export default FanDashboard;
