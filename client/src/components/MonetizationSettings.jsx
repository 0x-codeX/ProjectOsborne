import React, {
  useState,
  useEffect,
} from "react";
import axios from "axios";
import {
  Settings,
  Loader2,
  Save,
  CheckCircle,
  AlertCircle,
  Edit3,
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
          threeMonthBundle: 0,
        },
      );

    const [
      status,
      setStatus,
    ] =
      useState(
        "loading",
      ); // loading, idle, saving, error
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
      ); // Controls View vs Edit mode

    useEffect(() => {
      const fetchSettings =
        async () => {
          try {
            // 1. Grab the isolated token directly
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
                      Authorization: `Bearer ${token}`, // 2. Use isolated token
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
                  threeMonthBundle:
                    res
                      .data
                      .threeMonthBundle ||
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

        try {
          // 1. Grab the isolated token
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
            throw new Error(
              "Authentication missing. Please log in again.",
            );
          }

          await axios.put(
            "/api/users/settings/monetization",
            settings,
            {
              headers:
                {
                  Authorization: `Bearer ${token}`, // 2. Use isolated token
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
          console.error(
            "Save failed:",
            error,
          );
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
                subscription
                and
                PPV
                defaults.
              </p>
            </div>
          </div>

          {/* Edit Button - Only shows when NOT editing */}
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
            <AlertCircle className="w-5 h-5 mr-2" />
            {
              message
            }
          </div>
        )}

        {/* READ-ONLY SUMMARY VIEW */}
        {!isEditing ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                3-Month
                Bundle
              </p>
              <p className="text-xl font-bold text-white">
                {settings.threeMonthBundle >
                0
                  ? `${settings.threeMonthBundle} USDT`
                  : "Disabled"}
              </p>
            </div>
          </div>
        ) : (
          /* EDIT MODE FORM */
          <form
            onSubmit={
              handleSave
            }
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Default
                  PPV
                  Unlock
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
                  Subscription
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
                  Subscription
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

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  3-Month
                  Bundle
                  (USDT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="threeMonthBundle"
                  value={
                    settings.threeMonthBundle
                  }
                  onChange={
                    handleChange
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#FF5757]"
                />
              </div>
            </div>

            <div className="flex gap-4">
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

              {/* Cancel Button */}
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
