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
  Megaphone,
  ImagePlus,
  X,
  ChevronDown,
  ChevronUp,
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
      useNavigate();

    const [
      showPromo,
      setShowPromo,
    ] =
      useState(
        false,
      );
    const [
      promoText,
      setPromoText,
    ] =
      useState(
        "",
      );
    const [
      promoFile,
      setPromoFile,
    ] =
      useState(
        null,
      );
    const [
      promoPreview,
      setPromoPreview,
    ] =
      useState(
        null,
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
          // 1. Provision the stream securely via the interceptor
          const res =
            await api.post(
              "/streams/create",
              {
                title,
              },
            );
          const streamId =
            res
              .data
              .streamId;

          // 2. Fire the Promo Post if they opted in (Parallel Execution)
          if (
            showPromo &&
            promoFile
          ) {
            const formData =
              new FormData();
            formData.append(
              "media",
              promoFile,
            );
            formData.append(
              "title",
              "🔴 LIVE NOW",
            );
            formData.append(
              "description",
              promoText.trim() ||
                "Dropping into a live right now! Come hang out.",
            );

            // EXACT MATCH: Aligning with the backend requirements
            formData.append(
              "price",
              0, // Triggers the free content flow
            );
            formData.append(
              "priceCurrency",
              "USD",
            );
            formData.append(
              "isNsfw",
              false,
            );

            // EXACT MATCH: Using the verified endpoint from MediaUploader.jsx
            api
              .post(
                "/content/upload",
                formData,
                {
                  headers:
                    {
                      "Content-Type":
                        "multipart/form-data",
                    },
                },
              )
              .catch(
                (
                  err,
                ) =>
                  console.error(
                    "Promo post upload failed:",
                    err,
                  ),
              );
          }

          // 3. ONE-CLICK GATEWAY: Instantly push them into the dual-mode studio.
          navigate(
            `/creator/studio/${streamId}`,
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
          );
        }
      };

    const handleImageSelection =
      (
        e,
      ) => {
        const file =
          e
            .target
            .files[0];
        if (
          file
        ) {
          setPromoFile(
            file,
          );
          setPromoPreview(
            URL.createObjectURL(
              file,
            ),
          );
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

          {/* INJECTED: Feed Promo Toggle */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden transition-all duration-300">
            <button
              type="button"
              onClick={() =>
                setShowPromo(
                  !showPromo,
                )
              }
              className="w-full p-4 flex items-center justify-between hover:bg-slate-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Megaphone
                    className="text-blue-500"
                    size={
                      18
                    }
                  />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-slate-200">
                    Broadcast
                    to
                    FanFeed
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Drop
                    a
                    post
                    to
                    push
                    your
                    profile
                    to
                    the
                    top
                  </p>
                </div>
              </div>
              {showPromo ? (
                <ChevronUp
                  size={
                    20
                  }
                  className="text-slate-500"
                />
              ) : (
                <ChevronDown
                  size={
                    20
                  }
                  className="text-slate-500"
                />
              )}
            </button>

            {showPromo && (
              <div className="p-4 border-t border-slate-800 space-y-4 bg-slate-900/50 animate-in slide-in-from-top-2">
                {/* Image Uploader */}
                {!promoPreview ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImagePlus className="w-8 h-8 text-slate-500 mb-2 group-hover:text-blue-500 transition-colors" />
                      <p className="text-sm text-slate-400">
                        <span className="font-bold text-slate-200">
                          Click
                          to
                          upload
                        </span>{" "}
                        a
                        teaser
                        image
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={
                        handleImageSelection
                      }
                    />
                  </label>
                ) : (
                  <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-700">
                    <img
                      src={
                        promoPreview
                      }
                      alt="Promo preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPromoPreview(
                          null,
                        );
                        setPromoFile(
                          null,
                        );
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-500 transition-colors backdrop-blur-md"
                    >
                      <X
                        size={
                          16
                        }
                      />
                    </button>
                  </div>
                )}

                {/* Caption */}
                <div>
                  <textarea
                    value={
                      promoText
                    }
                    onChange={(
                      e,
                    ) =>
                      setPromoText(
                        e
                          .target
                          .value,
                      )
                    }
                    placeholder="Dropping into a live stream right now! Come hang out."
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-sm min-h-[80px] resize-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    If
                    left
                    blank,
                    a
                    default
                    message
                    will
                    be
                    used.
                  </p>
                </div>
              </div>
            )}
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
                  Camera
                  Access
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-right max-w-[200px]">
              Your
              camera
              will
              be
              securely
              initialized
              inside
              the
              live
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
