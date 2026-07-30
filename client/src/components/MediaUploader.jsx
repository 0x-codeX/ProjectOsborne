import React, {
  useCallback,
  useState,
} from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import {
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Tag,
  AlignLeft,
  Type,
} from "lucide-react";

const MediaUploader =
  () => {
    // Upload State
    const [
      progress,
      setProgress,
    ] =
      useState(
        0,
      );
    const [
      status,
      setStatus,
    ] =
      useState(
        "idle",
      ); // idle, requesting, uploading, success, publishing, complete, error
    const [
      fileData,
      setFileData,
    ] =
      useState(
        {
          key: "",
          type: "",
        },
      );
      const [
        isNsfw,
        setIsNsfw,
      ] =
        useState(
          false,
        );
    const [
      errorMessage,
      setErrorMessage,
    ] =
      useState(
        "",
      );

    // Form State
    const [
      title,
      setTitle,
    ] =
      useState(
        "",
      );
    const [
      description,
      setDescription,
    ] =
      useState(
        "",
      );
    const [
      priceInUSDT,
      setPriceInUSDT,
    ] =
      useState(
        "",
      );

    const onDrop =
      useCallback(
        async (
          acceptedFiles,
        ) => {
          const file =
            acceptedFiles[0];
          if (
            !file
          )
            return;

          setStatus(
            "requesting",
          );
          setProgress(
            0,
          );
          setErrorMessage(
            "",
          );

          try {
            const token = localStorage.getItem("nippy_token") || localStorage.getItem("token");
            
            if (!token) {
              throw new Error("Authentication missing. Please log in again.");
            }

            // 1. Get Ticket
            const ticketRes =
              await axios.post(
                "http://localhost:5000/api/media/upload-ticket",
                {
                  fileName:
                    file.name,
                  fileType:
                    file.type,
                },
                {
                  headers:
                    {
                      Authorization: `Bearer ${token}`,
                    },
                },
              );

            const {
              uploadUrl,
              fileKey,
            } =
              ticketRes.data;

            // 2. Upload to Cloudflare
            setStatus(
              "uploading",
            );
            await axios.put(
              uploadUrl,
              file,
              {
                headers:
                  {
                    "Content-Type":
                      file.type,
                  },
                onUploadProgress:
                  (
                    progressEvent,
                  ) => {
                    const percent =
                      Math.round(
                        (progressEvent.loaded *
                          100) /
                          progressEvent.total,
                      );
                    setProgress(
                      percent,
                    );
                  },
              },
            );

            // 3. Save key for the next step and transition to form
            setFileData(
              {
                key: fileKey,
                type: file.type,
              },
            );
            setStatus(
              "success",
            );
          } catch (error) {
            console.error(
              "Upload pipeline failed:",
              error,
            );
            setErrorMessage(
              error
                .response
                ?.data
                ?.message ||
                "Cloudflare rejected the upload.",
            );
            setStatus(
              "error",
            );
          }
        }
        ,
      );

    const {
      getRootProps,
      getInputProps,
      isDragActive,
    } =
      useDropzone(
        {
          onDrop,
          accept:
            {
              "video/*":
                [],
              "image/*":
                [],
            },
          maxFiles: 1,
        },
      );

    // 4. Submit Metadata to MongoDB
    const handlePublish =
      async (
        e,
      ) => {
        e.preventDefault();
        setStatus(
          "publishing",
        );

        try {
          const token = localStorage.getItem("nippy_token") || localStorage.getItem("token");

          await axios.post(
            "http://localhost:5000/api/content",
            {
              title,
              description,
              priceInUSDT:
                priceInUSDT ===
                ""
                  ? 0
                  : Number(
                      priceInUSDT,
                    ),
              fileKey:
                fileData.key,
              fileType:
                fileData.type,
              isNsfw,
            },
            {
              headers:
                {
                  Authorization: `Bearer ${token}`, // Use isolated token
                },
            },
          );

          setStatus(
            "complete",
          );
        } catch (error) {
          console.error(
            "Publish failed:",
            error,
          );
          setErrorMessage(
            error
              .response
              ?.data
              ?.message ||
              "Failed to save post to database.",
          );
          setStatus(
            "error",
          );
        }
      };

    // Reset component to upload another file
    const resetUploader =
      () => {
        setStatus(
          "idle",
        );
        setTitle(
          "",
        );
        setDescription(
          "",
        );
        setPriceInUSDT(
          "",
        );
        setFileData(
          {
            key: "",
            type: "",
          },
        );
        setIsNsfw(
          false,
        );
      };

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {/* STAGE 1: THE DROPZONE (Shows during idle, requesting, uploading, error) */}
        {[
          "idle",
          "requesting",
          "uploading",
          "error",
        ].includes(
          status,
        ) && (
          <div
            {...getRootProps()}
            className={`p-12 text-center transition-all cursor-pointer group border-2 border-dashed m-4 rounded-2xl
                        ${isDragActive ? "border-[#FF5757] bg-slate-800/50" : "border-slate-700 hover:border-[#FF5757]"}`}
          >
            <input
              {...getInputProps()}
              disabled={
                status !==
                  "idle" &&
                status !==
                  "error"
              }
            />

            {status ===
              "idle" && (
              <>
                <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-[#FF5757]" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Upload
                  Encrypted
                  Media
                </h2>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  MP4,
                  JPG,
                  or
                  PNG.
                  Files
                  are
                  securely
                  hosted
                  and
                  paywalled
                  via
                  smart
                  contract.
                </p>
                <button className="bg-slate-800 text-white font-semibold py-2 px-6 rounded-lg pointer-events-none">
                  Browse
                  Files
                </button>
              </>
            )}

            {status ===
              "requesting" && (
              <div className="py-6">
                <Loader2 className="w-12 h-12 text-[#FF5757] animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white">
                  Minting
                  Vault
                  Ticket...
                </h2>
              </div>
            )}

            {status ===
              "uploading" && (
              <div className="w-full max-w-md mx-auto py-6">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-300 font-medium">
                    Encrypting
                    &
                    Uploading...
                  </span>
                  <span className="text-[#FF5757] font-bold">
                    {
                      progress
                    }

                    %
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3">
                  <div
                    className="bg-[#FF5757] h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}

            {status ===
              "error" && (
              <div className="py-6">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">
                  Upload
                  Failed
                </h2>
                <p className="text-slate-400 mb-6">
                  {
                    errorMessage
                  }
                </p>
                <button
                  onClick={(
                    e,
                  ) => {
                    e.stopPropagation();
                    resetUploader();
                  }}
                  className="bg-slate-800 text-white py-2 px-6 rounded-lg hover:bg-slate-700"
                >
                  Try
                  Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* STAGE 2: THE METADATA FORM (Shows ONLY after successful upload to Cloudflare) */}
        {[
          "success",
          "publishing",
        ].includes(
          status,
        ) && (
          <div className="p-8">
            <div className="flex items-center mb-6 border-b border-slate-800 pb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500 mr-3" />
              <div>
                <h2 className="text-xl font-bold text-white">
                  Media
                  Secured
                  in
                  Vault
                </h2>
                <p className="text-sm text-slate-400">
                  Set
                  your
                  paywall
                  details
                  below
                  to
                  publish.
                </p>
              </div>
            </div>

            <form
              onSubmit={
                handlePublish
              }
              className="space-y-5"
            >
              <div>
                <label className="flex items-center text-sm font-medium text-slate-300 mb-1">
                  <Type className="w-4 h-4 mr-2 text-[#FF5757]" />{" "}
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5757]"
                  placeholder="E.g., Exclusive Behind the Scenes"
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-slate-300 mb-1">
                  <AlignLeft className="w-4 h-4 mr-2 text-[#FF5757]" />{" "}
                  Description
                </label>
                <textarea
                  rows="3"
                  value={
                    description
                  }
                  onChange={(
                    e,
                  ) =>
                    setDescription(
                      e
                        .target
                        .value,
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5757]"
                  placeholder="Tell your fans what to expect..."
                ></textarea>
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-slate-300 mb-1">
                  <Tag className="w-4 h-4 mr-2 text-[#FF5757]" />{" "}
                  PPV
                  Unlock
                  Price
                  (USDT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    priceInUSDT
                  }
                  onChange={(
                    e,
                  ) =>
                    setPriceInUSDT(
                      e
                        .target
                        .value,
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5757]"
                  placeholder="Leave blank to use your Global PPV Default, or enter 0 for Free"
                />
              </div>
              {/* NSFW Toggle */}
              <div className="flex items-center justify-between bg-slate-950 border border-slate-700 p-4 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white">
                    Contains
                    Adult
                    /
                    NSFW
                    Content
                  </p>
                  <p className="text-xs text-slate-400">
                    Enforces
                    §
                    2257
                    blur
                    controls
                    on
                    public
                    feeds.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setIsNsfw(
                      !isNsfw,
                    )
                  }
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    isNsfw
                      ? "bg-[#FF5757]"
                      : "bg-slate-700"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      isNsfw
                        ? "translate-x-6"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <button
                type="submit"
                disabled={
                  status ===
                  "publishing"
                }
                className="w-full bg-[#FF5757] hover:bg-rose-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center mt-6"
              >
                {status ===
                "publishing" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Publish to Paywall"
                )}
              </button>
            </form>
          </div>
        )}

        {/* STAGE 3: COMPLETE */}
        {status ===
          "complete" && (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Live
              on
              the
              Blockchain
            </h2>
            <p className="text-slate-400 mb-8">
              Your
              content
              is
              encrypted
              and
              successfully
              paywalled.
            </p>
            <button
              onClick={
                resetUploader
              }
              className="bg-slate-800 text-white py-2 px-8 rounded-lg hover:bg-slate-700 font-semibold transition-colors"
            >
              Upload
              Another
            </button>
          </div>
        )}
      </div>
    );
  };

export default MediaUploader;
