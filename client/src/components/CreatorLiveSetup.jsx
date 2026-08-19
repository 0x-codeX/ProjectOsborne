import React, {
  useState,
} from "react";
import { useNavigate } from "react-router-dom"; // FIXED: Added missing import
import api from "../utils/api";
import {
  Video,
  AlertCircle,
  PlayCircle,
  ShieldCheck,
  Gift,
  Camera,
  Monitor,
} from "lucide-react";

const CreatorLiveSetup =
  () => {
    const [
      title,
      setTitle,
    ] =
      useState(
        "",
      );
    const [
      loading,
      setLoading,
    ] =
      useState(
        false,
      );
    const [
      error,
      setError,
    ] =
      useState(
        "",
      );
    const navigate =
      useNavigate(); // FIXED: Initialized navigate

    const handleCreateStream =
      async (
        e,
      ) => {
        e.preventDefault();
        setLoading(
          true,
        );
        setError(
          "",
        );

        try {
          // Provision the stream securely via the interceptor
          const res =
            await api.post(
              "/streams/create",
              {
                title,
              },
            );

          // ONE-CLICK GATEWAY: Instantly push them into the dual-mode studio.
          // We don't make them wait on an intermediate screen anymore.
          navigate(
            `/creator/studio/${res.data.streamId}`,
          );
        } catch (err) {
          setError(
            err
              .response
              ?.data
              ?.message ||
              "Failed to provision stream.",
          );
          setLoading(
            false,
          ); // Only stop loading if there is an error, otherwise let it ride to the next page
        }
      };

    return (
      <div className="max-w-2xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl mt-10 font-sans">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
          <div className="p-3 bg-red-500/10 rounded-xl">
            <Video
              className="text-red-500"
              size={
                24
              }
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              Live
              Broadcast
              Setup
            </h2>
            <p className="text-slate-400 text-sm">
              Go
              live
              instantly
              from
              your
              browser
              or
              use
              OBS
            </p>
          </div>
        </div>

        <form
          onSubmit={
            handleCreateStream
          }
          className="space-y-5"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3 animate-in fade-in">
              <AlertCircle
                className="text-red-500 shrink-0 mt-0.5"
                size={
                  18
                }
              />
              <p className="text-red-400 text-sm">
                {
                  error
                }
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Stream
              Title
            </label>
            <input
              type="text"
              required
              value={
                title
              }
              onChange={(
                e,
              ) =>
                setTitle(
                  e
                    .target
                    .value,
                )
              }
              placeholder="e.g., AMA & Behind the Scenes"
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          {/* Dynamic Capability Previews */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-start gap-3">
              <ShieldCheck
                className="text-emerald-500 shrink-0 mt-0.5"
                size={
                  18
                }
              />
              <div>
                <h4 className="text-sm font-bold text-slate-200">
                  Subscriber
                  Exclusive
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Only
                  fans
                  with
                  an
                  active
                  subscription
                  to
                  your
                  page
                  can
                  view
                  this
                  stream.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-start gap-3">
              <Gift
                className="text-purple-500 shrink-0 mt-0.5"
                size={
                  18
                }
              />
              <div>
                <h4 className="text-sm font-bold text-slate-200">
                  Gifting
                  Enabled
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Fans
                  can
                  send
                  you
                  crypto
                  or
                  fiat
                  gifts
                  in
                  real-time
                  while
                  you
                  are
                  live.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex items-center justify-between mt-4">
            <div className="flex items-center gap-4 text-slate-400">
              <div className="flex flex-col items-center gap-1">
                <Camera
                  size={
                    20
                  }
                />
                <span className="text-[10px] font-bold uppercase">
                  Webcam
                </span>
              </div>
              <span className="text-slate-600 font-bold">
                OR
              </span>
              <div className="flex flex-col items-center gap-1">
                <Monitor
                  size={
                    20
                  }
                />
                <span className="text-[10px] font-bold uppercase">
                  OBS
                  /
                  vMix
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-right max-w-[200px]">
              You
              will
              select
              your
              broadcast
              method
              inside
              the
              studio.
            </p>
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              !title.trim()
            }
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50 mt-6 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
          >
            {loading ? (
              "Provisioning Studio..."
            ) : (
              <>
                <PlayCircle
                  size={
                    20
                  }
                />{" "}
                Enter
                Live
                Studio
              </>
            )}
          </button>
        </form>
      </div>
    );
  };

export default CreatorLiveSetup;
