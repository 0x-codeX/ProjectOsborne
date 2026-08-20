import React, {
  useState,
  useEffect,
} from "react";
import api from "../utils/api";
import {
  Settings,
  Loader2,
  Save,
  AlertCircle,
  Edit3,
  MessageSquare,
  Globe,
  Lock,
  AlertTriangle,
} from "lucide-react";

const MonetizationSettings =
  () => {
    const [
      settings,
      setSettings,
    ] =
      useState(
        {
          priceCurrency:
            "USD",
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

    // NEW: State to trigger the migration alert
    const [
      migrationAlert,
      setMigrationAlert,
    ] =
      useState(
        "",
      );

    useEffect(() => {
      const fetchSettings =
        async () => {
          try {
            const storedUser =
              JSON.parse(
                localStorage.getItem(
                  "nippy_user",
                ) ||
                  "{}",
              );
            // What they WANT their currency to be (from Creator Settings)
            const universalCurrencyPref =
              storedUser.preferredCurrency ||
              "USD";

            const res =
              await api.get(
                "/users/settings/monetization",
              );

            if (
              res.data
            ) {
              // What their currency CURRENTLY IS in the active database
              const activeDBPricingCurrency =
                res
                  .data
                  .priceCurrency ||
                "USD";

              // THE TRAP: Did they just change their currency in profile settings?
              if (
                universalCurrencyPref !==
                activeDBPricingCurrency
              ) {
                // 1. Wipe the form to 0
                setSettings(
                  {
                    priceCurrency:
                      universalCurrencyPref,
                    defaultPPVPrice: 0,
                    weeklySubscription: 0,
                    monthlySubscription: 0,
                    multiMonthDuration: 3,
                    multiMonthPrice: 0,
                    messageBundleSize: 5,
                    messageBundlePrice: 0,
                  },
                );

                // 2. Force the edit window open and lock it
                setIsEditing(
                  true,
                );

                // 3. Display the warning
                setMigrationAlert(
                  `You updated your profile currency to ${universalCurrencyPref}. Your old ${activeDBPricingCurrency} prices are still live for your fans. You must enter your new ${universalCurrencyPref} prices below and click Save to complete the transition.`,
                );
              } else {
                // Currencies match. Load normally.
                setSettings(
                  {
                    priceCurrency:
                      activeDBPricingCurrency,
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
                  Object.keys(
                    res.data,
                  ).some(
                    (
                      key,
                    ) =>
                      key.includes(
                        "Price",
                      ) ||
                      key.includes(
                        "Subscription",
                      )
                        ? res
                            .data[
                            key
                          ] >
                          0
                        : false,
                  );
                setIsEditing(
                  !hasSetupTiers,
                );
              }
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

        // Keep the exact price the creator entered. No rounding here!
        const exactPrice =
          (
            price,
          ) => {
            const raw =
              parseFloat(
                price,
              );
            return !isNaN(
              raw,
            ) &&
              raw >
                0
              ? raw
              : 0;
          };

        const sanitizedPayload =
          {
            ...settings,
            defaultPPVPrice:
              exactPrice(
                settings.defaultPPVPrice,
              ),
            weeklySubscription:
              exactPrice(
                settings.weeklySubscription,
              ),
            monthlySubscription:
              exactPrice(
                settings.monthlySubscription,
              ),
            multiMonthPrice:
              exactPrice(
                settings.multiMonthPrice,
              ),
            messageBundlePrice:
              exactPrice(
                settings.messageBundlePrice,
              ),
          };

        try {
          await api.put(
            "/users/settings/monetization",
            sanitizedPayload,
          );
          setSettings(
            sanitizedPayload,
          );
          setStatus(
            "idle",
          );
          setIsEditing(
            false,
          );
          setMigrationAlert(
            "",
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
        <div className="flex flex-col items-center justify-center mb-8 border-b border-slate-800 pb-6 relative">
          <div className="bg-slate-800 p-3 rounded-xl mb-3 shadow-lg">
            <Settings className="w-8 h-8 text-[#FF5757]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            Global
            Pricing
            Tiers
          </h2>
          <p className="text-sm text-slate-400 text-center max-w-md">
            Set
            your
            base
            prices.
            Fans
            will
            automatically
            see
            conversions
            in
            their
            local
            fiat.
          </p>
          {/* MIGRATION WARNING BANNER */}
          {migrationAlert && (
            <div className="mb-8 p-6 bg-amber-500/10 border-2 border-amber-500/50 rounded-xl flex flex-col items-center text-center animate-in fade-in slide-in-from-top-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-amber-400 mb-2">
                Currency
                Update
                Pending
              </h3>
              <p className="text-amber-200/80 text-sm max-w-xl leading-relaxed">
                {
                  migrationAlert
                }
              </p>
            </div>
          )}

          {!isEditing &&
            !migrationAlert && (
              <button
                onClick={() =>
                  setIsEditing(
                    true,
                  )
                }
                className="mt-4 flex items-center text-sm bg-slate-800 hover:bg-slate-700 text-white py-2 px-4 rounded-lg transition-colors shadow-md"
              >
                <Edit3 className="w-4 h-4 mr-2" />{" "}
                Edit
                Prices
              </button>
            )}
        </div>

        {status ===
          "error" &&
          !migrationAlert && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center text-center text-red-400">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              {
                message
              }
            </div>
          )}

        {/* THE FIX: MIGRATION WARNING BANNER */}
        {migrationAlert && (
          <div className="mb-8 p-6 bg-amber-500/10 border-2 border-amber-500/50 rounded-xl flex flex-col items-center text-center animate-in fade-in slide-in-from-top-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-amber-400 mb-2">
              Currency
              Update
              Pending
            </h3>
            <p className="text-amber-200/80 text-sm max-w-xl leading-relaxed">
              {
                migrationAlert
              }
            </p>
          </div>
        )}

        {!isEditing &&
        !migrationAlert ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center flex flex-col justify-center">
              <p className="text-sm text-slate-400 mb-1 text-center">
                Default
                PPV
              </p>
              <p className="text-xl font-bold text-white text-center">
                {settings.defaultPPVPrice >
                0
                  ? `${settings.defaultPPVPrice.toFixed(2)} ${settings.priceCurrency}`
                  : "Free"}
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center flex flex-col justify-center">
              <p className="text-sm text-slate-400 mb-1 text-center">
                Weekly
                Sub
              </p>
              <p className="text-xl font-bold text-white text-center">
                {settings.weeklySubscription >
                0
                  ? `${settings.weeklySubscription.toFixed(2)} ${settings.priceCurrency}`
                  : "Disabled"}
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center flex flex-col justify-center">
              <p className="text-sm text-slate-400 mb-1 text-center">
                Monthly
                Sub
              </p>
              <p className="text-xl font-bold text-white text-center">
                {settings.monthlySubscription >
                0
                  ? `${settings.monthlySubscription.toFixed(2)} ${settings.priceCurrency}`
                  : "Disabled"}
              </p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center flex flex-col justify-center">
              <p className="text-sm text-slate-400 mb-1 text-center">
                {
                  settings.multiMonthDuration
                }
                -Month
                Sub
              </p>
              <p className="text-xl font-bold text-white text-center">
                {settings.multiMonthPrice >
                0
                  ? `${settings.multiMonthPrice.toFixed(2)} ${settings.priceCurrency}`
                  : "Disabled"}
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 text-center relative overflow-hidden flex flex-col justify-center">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full blur-xl pointer-events-none"></div>
              <p className="text-sm text-emerald-400 mb-1 flex items-center justify-center gap-1 text-center">
                <MessageSquare
                  size={
                    14
                  }
                />{" "}
                Chat
                Bundle
              </p>
              <p className="text-xl font-bold text-white text-center">
                {settings.messageBundlePrice >
                0
                  ? `${settings.messageBundlePrice.toFixed(2)} ${settings.priceCurrency}`
                  : "Disabled"}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold text-center">
                Per{" "}
                {
                  settings.messageBundleSize
                }{" "}
                Messages
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={
              handleSave
            }
            className="space-y-8"
          >
            <div
              className={`border p-6 rounded-xl flex flex-col items-center text-center gap-4 ${migrationAlert ? "bg-amber-500/5 border-amber-500/20" : "bg-blue-500/10 border-blue-500/20"}`}
            >
              <Globe
                className={`w-8 h-8 flex-shrink-0 ${migrationAlert ? "text-amber-500" : "text-blue-400"}`}
              />
              <div className="w-full flex flex-col items-center">
                <label
                  className={`block text-lg font-bold mb-2 text-center ${migrationAlert ? "text-amber-500" : "text-blue-400"}`}
                >
                  Your
                  Base
                  Pricing
                  Currency
                </label>
                <p
                  className={`text-xs mb-4 max-w-md text-center ${migrationAlert ? "text-amber-200/70" : "text-blue-300/70"}`}
                >
                  {migrationAlert
                    ? "Set your brand new prices based on the currency you just selected."
                    : "Your content prices are firmly tied to your main profile settings. Whenever fans browse your content, they will automatically see real-time conversions."}
                </p>

                <div
                  className={`bg-slate-950 border rounded-lg px-8 py-3 text-white font-bold text-xl flex items-center justify-center gap-3 ${migrationAlert ? "border-amber-500/30" : "border-blue-500/30"}`}
                >
                  <Lock
                    className={`w-5 h-5 ${migrationAlert ? "text-amber-500" : "text-blue-400"}`}
                  />
                  {
                    settings.priceCurrency
                  }
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 text-center">
                Content
                Access
                Prices
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div
                  className={`bg-slate-950 p-4 rounded-xl border ${migrationAlert ? "border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : "border-slate-800"}`}
                >
                  <label className="block text-sm font-medium text-slate-300 mb-2 text-center">
                    Default
                    PPV
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm font-bold">
                      {
                        settings.priceCurrency
                      }
                    </span>
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-14 pr-4 py-2 text-white focus:outline-none focus:border-[#FF5757]"
                    />
                  </div>
                </div>
                <div
                  className={`bg-slate-950 p-4 rounded-xl border ${migrationAlert ? "border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : "border-slate-800"}`}
                >
                  <label className="block text-sm font-medium text-slate-300 mb-2 text-center">
                    Weekly
                    Sub
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm font-bold">
                      {
                        settings.priceCurrency
                      }
                    </span>
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-14 pr-4 py-2 text-white focus:outline-none focus:border-[#FF5757]"
                    />
                  </div>
                </div>
                <div
                  className={`bg-slate-950 p-4 rounded-xl border ${migrationAlert ? "border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : "border-slate-800"}`}
                >
                  <label className="block text-sm font-medium text-slate-300 mb-2 text-center">
                    Monthly
                    Sub
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm font-bold">
                      {
                        settings.priceCurrency
                      }
                    </span>
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-14 pr-4 py-2 text-white focus:outline-none focus:border-[#FF5757]"
                    />
                  </div>
                </div>
                <div
                  className={`bg-slate-950 p-4 rounded-xl border relative flex flex-col justify-center items-center ${migrationAlert ? "border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : "border-slate-800"}`}
                >
                  <select
                    name="multiMonthDuration"
                    value={
                      settings.multiMonthDuration
                    }
                    onChange={
                      handleChange
                    }
                    className="block w-full bg-transparent text-sm font-medium text-slate-300 mb-2 focus:outline-none cursor-pointer border-b border-dashed border-slate-700 pb-1 text-center"
                  >
                    <option
                      value={
                        2
                      }
                      className="bg-slate-900"
                    >
                      2-Month
                      Sub
                    </option>
                    <option
                      value={
                        3
                      }
                      className="bg-slate-900"
                    >
                      3-Month
                      Sub
                    </option>
                  </select>
                  <div className="relative w-full">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm font-bold">
                      {
                        settings.priceCurrency
                      }
                    </span>
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-14 pr-4 py-2 text-white focus:outline-none focus:border-[#FF5757]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 text-center">
                Direct
                Messaging
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div
                  className={`bg-slate-950 p-4 rounded-xl flex flex-col items-center border ${migrationAlert ? "border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : "border-emerald-500/30"}`}
                >
                  <label
                    className={`block text-sm font-medium mb-2 text-center ${migrationAlert ? "text-amber-400" : "text-emerald-400"}`}
                  >
                    Bundle
                    Size
                    (Multiples
                    of
                    5)
                  </label>
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
                    className={`w-full max-w-[200px] bg-slate-900 rounded-lg px-4 py-2 text-white focus:outline-none font-bold text-lg text-center border ${migrationAlert ? "border-amber-500/50 focus:border-amber-500" : "border-emerald-500/50 focus:border-emerald-500"}`}
                  />
                  <p className="text-[10px] text-slate-500 mt-2 text-center">
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

                <div
                  className={`bg-slate-950 p-4 rounded-xl flex flex-col items-center border ${migrationAlert ? "border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : "border-emerald-500/30"}`}
                >
                  <label
                    className={`block text-sm font-medium mb-2 text-center ${migrationAlert ? "text-amber-400" : "text-emerald-400"}`}
                  >
                    Price
                    Per
                    Bundle
                  </label>
                  <div className="relative w-full max-w-[200px]">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-lg font-bold">
                      {
                        settings.priceCurrency
                      }
                    </span>
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
                      className={`w-full bg-slate-900 rounded-lg pl-14 pr-4 py-2 text-white focus:outline-none font-bold text-lg border ${migrationAlert ? "border-amber-500/50 focus:border-amber-500" : "border-emerald-500/50 focus:border-emerald-500"}`}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 text-center">
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

            <div className="flex justify-center gap-4 pt-4">
              <button
                type="submit"
                disabled={
                  status ===
                  "saving"
                }
                className={`px-10 py-3 text-white font-bold rounded-lg transition-colors flex items-center justify-center disabled:opacity-70 shadow-lg ${migrationAlert ? "bg-amber-600 hover:bg-amber-500" : "bg-[#FF5757] hover:bg-rose-600"}`}
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

              {/* Hide cancel button if they are forced into migration */}
              {!migrationAlert && (
                <button
                  type="button"
                  onClick={() =>
                    setIsEditing(
                      false,
                    )
                  }
                  className="px-10 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    );
  };

export default MonetizationSettings;
