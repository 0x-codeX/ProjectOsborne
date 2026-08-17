import React, {
  useState,
} from "react";
import api from "../utils/api"; // Importing the ironclad interceptor
import {
  Video,
  Copy,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  ShieldCheck,
  Gift,
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
    const [
      streamData,
      setStreamData,
    ] =
      useState(
        null,
      );
    const [
      copiedKey,
      setCopiedKey,
    ] =
      useState(
        false,
      );

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
          // 1. STRESS-TEST FIX: No local storage, no headers, no hardcoded localhost!
          // The api interceptor handles everything securely in the background.
          const res =
            await api.post(
              "/streams/create",
              {
                title,
              },
            );

          setStreamData(
            res.data,
          );
        } catch (err) {
          setError(
            err
              .response
              ?.data
              ?.message ||
              "Failed to provision stream.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      };

    const copyToClipboard =
      (
        text,
      ) => {
        navigator.clipboard.writeText(
          text,
        );
        setCopiedKey(
          true,
        );
        setTimeout(
          () =>
            setCopiedKey(
              false,
            ),
          2000,
        );
      };

    return (
      <div className="max-w-2xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl mt-10">
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
              Go
              Live
            </h2>
            <p className="text-slate-400 text-sm">
              Provision
              a
              secure
              RTMP
              stream
              for
              OBS
            </p>
          </div>
        </div>

        {!streamData ? (
          <form
            onSubmit={
              handleCreateStream
            }
            className="space-y-5"
          >
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
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
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Stream Settings Status Cards */}
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

            <button
              type="submit"
              disabled={
                loading
              }
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50 mt-4"
            >
              {loading ? (
                "Provisioning Server..."
              ) : (
                <>
                  <PlayCircle
                    size={
                      20
                    }
                  />
                  Generate
                  Stream
                  Keys
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
              <h3 className="text-emerald-400 font-bold mb-1">
                Stream
                Provisioned!
              </h3>
              <p className="text-slate-300 text-sm">
                Copy
                these
                details
                into
                your
                broadcasting
                software
                (like
                OBS)
                and
                hit
                "Start
                Streaming".
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  RTMP
                  Ingest
                  URL
                </label>
                <div className="flex bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <input
                    type="text"
                    readOnly
                    value={
                      streamData.rtmpIngestUrl
                    }
                    className="w-full bg-transparent text-slate-300 px-4 py-3 outline-none font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Secret
                  Stream
                  Key
                </label>
                <div className="flex bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <input
                    type="password"
                    readOnly
                    value={
                      streamData.streamKey
                    }
                    className="w-full bg-transparent text-slate-300 px-4 py-3 outline-none font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        streamData.streamKey,
                      )
                    }
                    className="bg-slate-800 hover:bg-slate-700 px-4 flex items-center justify-center transition-colors border-l border-slate-800"
                  >
                    {copiedKey ? (
                      <CheckCircle
                        className="text-emerald-500"
                        size={
                          18
                        }
                      />
                    ) : (
                      <Copy
                        className="text-slate-400"
                        size={
                          18
                        }
                      />
                    )}
                  </button>
                </div>
                <p className="text-xs text-red-400 mt-2 font-medium">
                  ⚠️
                  Never
                  share
                  this
                  key.
                  Anyone
                  with
                  it
                  can
                  stream
                  to
                  your
                  account.
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                navigate(
                  `/creator/studio/${streamData._id}`,
                )
              }
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse"
            >
              Enter
              Live
              Studio
            </button>
          </div>
        )}
      </div>
    );
  };

export default CreatorLiveSetup;
