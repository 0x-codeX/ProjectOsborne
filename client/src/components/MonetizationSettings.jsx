import React, {
  useState,
  useEffect,
} from "react";
import axios from "axios";
import {
  Settings,
  Loader2,
  Save,
  AlertCircle,
  Edit3,
  MessageSquare,
} from "lucide-react";

const MonetizationSettings =
  () => {
    const [
      settings,
      setSettings,
    ] =
      useState(
        {
          defaultPPVPrice: 0,
          weeklySubscription: 0,
          monthlySubscription: 0,
          multiMonthDuration: 3,
          multiMonthPrice: 0,
          messageBundleSize: 5,
          messageBundlePrice: 0,
        },
      );

    const [
      status,
      setStatus,
    ] =
      useState(
        "loading",
      );
    const [
      message,
      setMessage,
    ] =
      useState(
        "",
      );
    const [
      isEditing,
      setIsEditing,
    ] =
      useState(
        false,
      );

    useEffect(() => {
      const fetchSettings =
        async () => {
          try {
            const token =
              localStorage.getItem(
                "nippy_token",
              ) ||
              localStorage.getItem(
                "token",
              );
            if (
              !token
            ) {
              setStatus(
                "error",
              );
              setMessage(
                "Authentication missing. Please log in again.",
              );
              return;
            }

            const res =
              await axios.get(
                "/api/users/settings/monetization",
                {
                  headers:
                    {
                      Authorization: `Bearer ${token}`,
                    },
                },
              );

            if (
              res.data
            ) {
              setSettings(
                {
                  defaultPPVPrice:
                    res
                      .data
                      .defaultPPVPrice ||
                    0,
                  weeklySubscription:
                    res
                      .data
                      .weeklySubscription ||
                    0,
                  monthlySubscription:
                    res
                      .data
                      .monthlySubscription ||
                    0,
                  multiMonthDuration:
                    res
                      .data
                      .multiMonthDuration ||
                    3,
                  multiMonthPrice:
                    res
                      .data
                      .multiMonthPrice ||
                    res
                      .data
                      .threeMonthBundle ||
                    0,
                  messageBundleSize:
                    res
                      .data
                      .messageBundleSize ||
                    5,
                  messageBundlePrice:
                    res
                      .data
                      .messageBundlePrice ||
                    0,
                },
              );

              const hasSetupTiers =
                Object.values(
                  res.data,
                ).some(
                  (
                    val,
                  ) =>
                    val >
                    0,
                );
              setIsEditing(
                !hasSetupTiers,
              );
            }
            setStatus(
              "idle",
            );
          } catch (error) {
            console.error(
              "Failed to fetch settings:",
              error,
            );
            setStatus(
              "error",
            );
            setMessage(
              "Failed to load current prices.",
            );
          }
        };

      fetchSettings();
    }, []);

    const handleChange =
      (
        e,
      ) => {
        const {
          name,
          value,
        } =
          e.target;
        setSettings(
          (
            prev,
          ) => ({
            ...prev,
            [name]:
              value ===
              ""
                ? ""
                : Number(
                    value,
                  ),
          }),
        );
      };

    const handleSave =
      async (
        e,
      ) => {
        e.preventDefault();
        setStatus(
          "saving",
        );
        setMessage(
          "",
        );

        // NEW VALIDATION: Must be 5 or higher, and perfectly divisible by 5
        if (
          settings.messageBundleSize <
            5 ||
          settings.messageBundleSize %
            5 !==
            0
        ) {
          setStatus(
            "error",
          );
          setMessage(
            "Message bundles must be in multiples of 5 (5, 10, 15, 20...).",
          );
          return;
        }

        try {
          const token =
            localStorage.getItem(
              "nippy_token",
            ) ||
            localStorage.getItem(
              "token",
            );
          await axios.put(
            "/api/users/settings/monetization",
            settings,
            {
              headers:
                {
                  Authorization: `Bearer ${token}`,
                },
            },
          );

          setStatus(
            "idle",
          );
          setIsEditing(
            false,
          );
        } catch (error) {
          setStatus(
            "error",
          );
          setMessage(
            error
              .response
              ?.data
              ?.message ||
              "Failed to update settings.",
          );
        }
      };

    if (
      status ===
      "loading"
    ) {
      return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 flex justify-center">
          <Loader2 className="w-8 h-8 text-[#FF5757] animate-spin" />
        </div>
      );
    }

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center">
            <div className="bg-slate-800 p-2 rounded-lg mr-4">
              <Settings className="w-6 h-6 text-[#FF5757]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Global
                Pricing
                Tiers
              </h2>
              <p className="text-sm text-slate-400">
                Account-level
                subscription,
                PPV,
                and
                Chat
                defaults.
              </p>
            </div>
          </div>

          {!isEditing && (
            <button
              onClick={() =>
                setIsEditing(
                  true,
                )
              }
              className="flex items-center text-sm bg-slate-800 hover:bg-slate-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4 mr-2" />{" "}
              Edit
              Prices
            </button>
          )}
        </div>

        {status ===
          "error" && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center text-red-400">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            {
              message
            }
          </div>
        )}

        {/* READ-ONLY SUMMARY VIEW */}
        {!isEditing ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <p className="text-sm text-slate-400 mb-1">
                Default
                PPV
              </p>
              <p className="text-xl font-bold text-white">
                {settings.defaultPPVPrice >
                0
                  ? `${settings.defaultPPVPrice} USDT`
                  : "Free"}
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <p className="text-sm text-slate-400 mb-1">
                Weekly
                Sub
              </p>
              <p className="text-xl font-bold text-white">
                {settings.weeklySubscription >
                0
                  ? `${settings.weeklySubscription} USDT`
                  : "Disabled"}
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <p className="text-sm text-slate-400 mb-1">
                Monthly
                Sub
              </p>
              <p className="text-xl font-bold text-white">
                {settings.monthlySubscription >
                0
                  ? `${settings.monthlySubscription} USDT`
                  : "Disabled"}
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <p className="text-sm text-slate-400 mb-1">
                {
                  settings.multiMonthDuration
                }
                -Month
                Sub
              </p>
              <p className="text-xl font-bold text-white">
                {settings.multiMonthPrice >
                0
                  ? `${settings.multiMonthPrice} USDT`
                  : "Disabled"}
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full blur-xl pointer-events-none"></div>
              <p className="text-sm text-emerald-400 mb-1 flex items-center justify-center gap-1">
                <MessageSquare
                  size={
                    14
                  }
                />{" "}
                Chat
                Bundle
              </p>
              <p className="text-xl font-bold text-white">
                {settings.messageBundlePrice >
                0
                  ? `${settings.messageBundlePrice} USDT`
                  : "Disabled"}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">
                Per{" "}
                {
                  settings.messageBundleSize
                }{" "}
                Messages
              </p>
            </div>
          </div>
        ) : (
          /* EDIT MODE FORM */
          <form
            onSubmit={
              handleSave
            }
            className="space-y-8"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                Content
                Access
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Default
                    PPV
                    (USDT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="defaultPPVPrice"
                    value={
                      settings.defaultPPVPrice
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#FF5757]"
                  />
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Weekly
                    Sub
                    (USDT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="weeklySubscription"
                    value={
                      settings.weeklySubscription
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#FF5757]"
                  />
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Monthly
                    Sub
                    (USDT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="monthlySubscription"
                    value={
                      settings.monthlySubscription
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#FF5757]"
                  />
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative">
                  <select
                    name="multiMonthDuration"
                    value={
                      settings.multiMonthDuration
                    }
                    onChange={
                      handleChange
                    }
                    className="block w-full bg-transparent text-sm font-medium text-slate-300 mb-2 focus:outline-none cursor-pointer border-b border-dashed border-slate-700 pb-1"
                  >
                    <option
                      value={
                        2
                      }
                      className="bg-slate-900"
                    >
                      2-Month
                      Sub
                      (USDT)
                    </option>
                    <option
                      value={
                        3
                      }
                      className="bg-slate-900"
                    >
                      3-Month
                      Sub
                      (USDT)
                    </option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="multiMonthPrice"
                    value={
                      settings.multiMonthPrice
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#FF5757]"
                  />
                </div>
              </div>
            </div>

            {/* Direct Messaging Tiers */}
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                Direct
                Messaging
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30">
                  <label className="block text-sm font-medium text-emerald-400 mb-2">
                    Bundle
                    Size
                    (Multiples
                    of
                    5)
                  </label>
                  {/* Notice the step="5" below! */}
                  <input
                    type="number"
                    step="5"
                    min="5"
                    name="messageBundleSize"
                    value={
                      settings.messageBundleSize
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold text-lg"
                  />
                  <p className="text-[10px] text-slate-500 mt-2">
                    Base
                    number
                    of
                    messages
                    the
                    fan
                    buys
                    at
                    once
                    (5,
                    10,
                    15...).
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30">
                  <label className="block text-sm font-medium text-emerald-400 mb-2">
                    Price
                    Per
                    Bundle
                    (USDT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="messageBundlePrice"
                    value={
                      settings.messageBundlePrice
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold text-lg"
                  />
                  <p className="text-[10px] text-slate-500 mt-2">
                    Cost
                    to
                    unlock{" "}
                    {settings.messageBundleSize ||
                      5}{" "}
                    messages.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={
                  status ===
                  "saving"
                }
                className="flex-1 md:flex-none px-8 py-3 bg-[#FF5757] hover:bg-rose-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center disabled:opacity-70"
              >
                {status ===
                "saving" ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />{" "}
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />{" "}
                    Lock
                    In
                    Prices
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  setIsEditing(
                    false,
                  )
                }
                className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    );
  };

export default MonetizationSettings;
