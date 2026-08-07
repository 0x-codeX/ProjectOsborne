import React, {
  useState,
} from "react";
import {
  TrendingUp,
  Lightbulb,
  Activity,
  Users,
  Eye,
  Repeat,
  Zap,
} from "lucide-react";
// Assuming you have a FanFeed component already. If not, this serves as the placeholder.
// import FanFeed from "../components/FanFeed";

// MOCK DATA: System-Generated Algorithm Insights (Anonymized & Actionable)
const SYSTEM_INSIGHTS =
  [
    {
      id: 1,
      type: "Platform Trend",
      icon: Activity,
      color:
        "text-blue-400",
      bgColor:
        "bg-blue-400/10",
      borderColor:
        "border-blue-400/20",
      title:
        "High Retention Posting Cadence",
      description:
        "Platform data shows that creators in the Web3 & Tech niches who post 2-3 times a week retain 85% of their subscribers month-over-month, compared to 40% for daily posters.",
      actionItem:
        "Schedule your content spacing. Don't burn out your audience.",
    },
    {
      id: 2,
      type: "Top Performing Format",
      icon: Zap,
      color:
        "text-amber-400",
      bgColor:
        "bg-amber-400/10",
      borderColor:
        "border-amber-400/20",
      title:
        "The 'Cliffhanger' Teaser",
      description:
        "A public post format is currently converting at 12% across the platform. It involves a 15-second free video that cuts off right before the core solution, with a CTA to unlock the Vault.",
      actionItem:
        "Try cutting your next free tutorial in half and paywalling the resolution.",
    },
    {
      id: 3,
      type: "Monetization Alert",
      icon: TrendingUp,
      color:
        "text-emerald-400",
      bgColor:
        "bg-emerald-400/10",
      borderColor:
        "border-emerald-400/20",
      title:
        "1-on-1 Chat Revenue Spikes",
      description:
        "The top 10% of earners this week generated over 40% of their total revenue solely through pay-per-message interactions rather than standard subscriptions.",
      actionItem:
        "Engage your high-tier fans in direct messages with exclusive advisory offers.",
    },
  ];

const CreatorFeed =
  () => {
    // Toggle state: 'insights' (Creator Analytics) or 'marketplace' (Fan View)
    const [
      feedMode,
      setFeedMode,
    ] =
      useState(
        "insights",
      );

    return (
      <div className="min-h-screen bg-transparent text-slate-200 p-4 md:p-8 max-w-4xl mx-auto">
        {/* HEADER & MASTER TOGGLE */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Lightbulb
                className="text-[#FF5757]"
                size={
                  32
                }
              />
              Creator
              Hub
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-md">
              Monitor
              platform
              trends
              or
              switch
              to
              the
              marketplace
              view
              to
              see
              how
              fans
              experience
              your
              content.
            </p>
          </div>

          {/* The Dual-View Toggle */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() =>
                setFeedMode(
                  "insights",
                )
              }
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
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
              />
              Platform
              Insights
            </button>
            <button
              onClick={() =>
                setFeedMode(
                  "marketplace",
                )
              }
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${
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
              />
              Marketplace
              View
            </button>
          </div>
        </div>

        {/* RENDER CONTENT BASED ON TOGGLE */}
        {feedMode ===
        "marketplace" ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur-sm">
            {/* If you have the FanFeed built, you would literally just render it here like: <FanFeed /> */}
            <Eye
              size={
                48
              }
              className="mx-auto text-slate-600 mb-4"
            />
            <h2 className="text-xl font-bold text-white mb-2">
              Marketplace
              View
            </h2>
            <p className="text-slate-400 max-w-sm mx-auto">
              This
              is
              exactly
              what
              the
              fans
              see.
              Scroll
              the
              public
              feed,
              check
              out
              the
              competition,
              and
              see
              how
              your
              posts
              look
              in
              the
              wild.
            </p>
            {/* Placeholder for the actual FanFeed component injection */}
            <div className="mt-8 border-t border-slate-800 border-dashed pt-8 text-slate-500 font-mono text-sm">
              [
              FanFeed.jsx
              Component
              Mounts
              Here
              ]
            </div>
          </div>
        ) : (
          <div className="space-y-6">
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
                        Apply
                        to
                        Next
                        Post
                      </button>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>
    );
  };

export default CreatorFeed;
