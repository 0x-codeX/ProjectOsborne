import React, {
  useState,
} from "react";
import {
  TrendingUp,
  Lightbulb,
  Activity,
  Users,
  Eye,
  Bookmark,
  Zap,
} from "lucide-react";
import FanFeed from "./FanFeed";
import BookmarksFeed from "./BookmarksFeed";

// MOCK DATA: System-Generated Algorithm Insights matching your automated metrics request
const SYSTEM_INSIGHTS =
  [
    {
      id: 1,
      type: "Audience Trend",
      icon: Users,
      color:
        "text-blue-400",
      bgColor:
        "bg-blue-400/10",
      borderColor:
        "border-blue-400/20",
      title:
        "What Fans Are Watching",
      description:
        "Platform data shows a 45% increase in engagement for 'Behind-the-Scenes' and 'Process' videos this week. Fans are heavily engaging with unpolished, authentic content.",
      actionItem:
        "Try posting a raw, unedited behind-the-scenes clip to boost immediate views.",
    },
    {
      id: 2,
      type: "Conversion Tactic",
      icon: TrendingUp,
      color:
        "text-emerald-400",
      bgColor:
        "bg-emerald-400/10",
      borderColor:
        "border-emerald-400/20",
      title:
        "How to Get More Subscriptions",
      description:
        "Creators who offer a 7-day automated PPV discount immediately after a user follows them are seeing a 30% higher conversion rate into full monthly subscriptions.",
      actionItem:
        "Bundle your top 3 posts and pin them to the top of your profile for new followers.",
    },
    {
      id: 3,
      type: "Algorithm Alert",
      icon: Zap,
      color:
        "text-amber-400",
      bgColor:
        "bg-amber-400/10",
      borderColor:
        "border-amber-400/20",
      title:
        "Maximizing Feed Views",
      description:
        "The algorithm is currently prioritizing posts with active comment threads. Posts that receive at least 5 comments in the first hour are pushed to 3x more fan feeds.",
      actionItem:
        "End your next free teaser post with a direct question to encourage immediate comments.",
    },
  ];

const CreatorFeed =
  () => {
    // Toggle state: 'insights', 'marketplace', or 'bookmarks'
    const [
      feedMode,
      setFeedMode,
    ] =
      useState(
        "insights",
      );

    return (
      <div className="min-h-screen bg-transparent text-slate-200 p-4 md:p-8 max-w-4xl mx-auto">
        {/* HEADER & MASTER TOGGLE (Sticky underneath main layout header) */}
        <div className="sticky top-16 md:top-[4.5rem] z-40 mb-8 -mx-4 px-4 md:-mx-8 md:px-8 py-3 bg-[#050505]/90 backdrop-blur-md flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800/50 shadow-2xl">
          {/* The 3-Way Tab Toggle */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 overflow-x-auto custom-scrollbar w-full md:w-auto">
            <button
              onClick={() =>
                setFeedMode(
                  "insights",
                )
              }
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                feedMode ===
                "insights"
                  ? "bg-[#FF5757] text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Activity
                size={
                  16
                }
              />{" "}
              Platform
              Insights
            </button>
            <button
              onClick={() =>
                setFeedMode(
                  "marketplace",
                )
              }
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                feedMode ===
                "marketplace"
                  ? "bg-slate-700 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Eye
                size={
                  16
                }
              />{" "}
              Marketplace
              View
            </button>
            <button
              onClick={() =>
                setFeedMode(
                  "bookmarks",
                )
              }
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                feedMode ===
                "bookmarks"
                  ? "bg-emerald-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Bookmark
                size={
                  16
                }
              />{" "}
              Bookmarks
            </button>
          </div>
        </div>

        {/* RENDER CONTENT BASED ON TOGGLE */}
        <div className="pb-10">
          {feedMode ===
            "marketplace" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Seamlessly injects the existing FanFeed */}
              <FanFeed />
            </div>
          )}

          {feedMode ===
            "bookmarks" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Seamlessly injects the existing BookmarksFeed */}
              <BookmarksFeed />
            </div>
          )}

          {feedMode ===
            "insights" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {SYSTEM_INSIGHTS.map(
                (
                  insight,
                ) => {
                  const Icon =
                    insight.icon;
                  return (
                    <div
                      key={
                        insight.id
                      }
                      className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors backdrop-blur-sm relative overflow-hidden"
                    >
                      {/* Background Glow based on insight type */}
                      <div
                        className={`absolute -top-10 -right-10 w-32 h-32 ${insight.bgColor} rounded-full blur-3xl pointer-events-none`}
                      ></div>

                      <div className="flex items-start gap-4 mb-4">
                        <div
                          className={`p-3 rounded-xl ${insight.bgColor} ${insight.borderColor} border`}
                        >
                          <Icon
                            size={
                              24
                            }
                            className={
                              insight.color
                            }
                          />
                        </div>
                        <div>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${insight.color}`}
                          >
                            {
                              insight.type
                            }
                          </span>
                          <h2 className="text-xl font-bold text-white mt-1">
                            {
                              insight.title
                            }
                          </h2>
                        </div>
                      </div>

                      <p className="text-slate-300 text-sm leading-relaxed mb-6">
                        {
                          insight.description
                        }
                      </p>

                      <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1 block">
                            Suggested
                            Action
                          </span>
                          <p className="text-sm text-slate-200 font-medium">
                            {
                              insight.actionItem
                            }
                          </p>
                        </div>
                        <button className="whitespace-nowrap px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all border border-slate-700 hover:border-slate-500">
                          Got
                          it
                        </button>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

export default CreatorFeed;
