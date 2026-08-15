import React, {
  useCallback,
  useState,
  useEffect,
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
  Video,
  Image as ImageIcon,
  HelpCircle,
} from "lucide-react";
import { useUpload } from "../context/UploadContext";

const MediaUploader =
  () => {
    // Upload State
    const [
      status,
      setStatus,
    ] =
      useState(
        "idle",
      ); // idle, file_selected, uploading, complete, error
    const [
      progress,
      setProgress,
    ] =
      useState(
        0,
      );
    const [
      errorMessage,
      setErrorMessage,
    ] =
      useState(
        "",
      );

    // File State
    const [
      selectedFile,
      setSelectedFile,
    ] =
      useState(
        null,
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
      ); // Reverted to priceInUSDT to match backend
    const [
      isFree,
      setIsFree,
    ] =
      useState(
        false,
      );
    const [
      isNsfw,
      setIsNsfw,
    ] =
      useState(
        false,
      );
    const {
      startUpload,
      updateProgress,
      completeUpload,
      failUpload,
    } =
      useUpload();

    // Fetch the Global Default PPV on component mount
    const fetchDefaultPPV =
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
          )
            return;

          const res =
            await axios.get(
              "http://localhost:5000/api/users/settings/monetization",
              {
                headers:
                  {
                    Authorization: `Bearer ${token}`,
                  },
              },
            );

          if (
            res.data &&
            res
              .data
              .defaultPPVPrice
          ) {
            setPriceInUSDT(
              res.data.defaultPPVPrice.toString(),
            );
          }
        } catch (error) {
          console.error(
            "Failed to fetch default PPV settings:",
            error,
          );
          // Fail silently. The box will just remain empty for manual entry.
        }
      };

    useEffect(() => {
      fetchDefaultPPV();
    }, []);

    const onDrop =
      useCallback(
        (
          acceptedFiles,
        ) => {
          const file =
            acceptedFiles[0];
          if (
            !file
          )
            return;

          setSelectedFile(
            file,
          );
          setStatus(
            "file_selected",
          );
        },
        [],
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
                [
                  ".mp4",
                  ".mov",
                  ".webm",
                  ".avi",
                  ".mkv",
                ], // Expanded top video formats
              "image/*":
                [
                  ".jpg",
                  ".jpeg",
                  ".png",
                  ".webp",
                  ".gif",
                ], // Expanded top image formats
            },
          maxFiles: 1,
        },
      );

    const handlePublish =
      async (
        e,
      ) => {
        e.preventDefault();
        if (
          !selectedFile
        )
          return;

        setStatus(
          "uploading",
        );
        setProgress(
          0,
        );
        setErrorMessage(
          "",
        );

        // 3. TRIGGER GLOBAL BACKGROUND UPLOAD
        startUpload(
          selectedFile.name,
        );

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
          )
            throw new Error(
              "Authentication missing. Please log in again.",
            );

          const formData =
            new FormData();
          formData.append(
            "media",
            selectedFile,
          );
          formData.append(
            "title",
            title,
          );
          formData.append(
            "description",
            description,
          );

          const finalPrice =
            isFree
              ? 0
              : priceInUSDT ===
                  ""
                ? 0
                : Number(
                    priceInUSDT,
                  );
          formData.append(
            "priceInUSDT",
            finalPrice,
          );
          formData.append(
            "isNsfw",
            isNsfw,
          );

          await axios.post(
            "http://localhost:5000/api/content/upload",
            formData,
            {
              headers:
                {
                  Authorization: `Bearer ${token}`,
                  "Content-Type":
                    "multipart/form-data",
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
                  const cappedPercent =
                    Math.min(
                      percent,
                      90,
                    );

                  setProgress(
                    cappedPercent,
                  ); // Update local UI
                  updateProgress(
                    cappedPercent,
                  ); // Update global background UI
                },
            },
          );

          // 4. ON SUCCESS: Complete global, and instantly reset local so they can upload again
          completeUpload();
          resetUploader();
        } catch (error) {
          console.error(
            "Upload failed:",
            error,
          );
          const errorMsg =
            error
              .response
              ?.data
              ?.message ||
            "Server rejected the upload.";

          setErrorMessage(
            errorMsg,
          );
          setStatus(
            "error",
          );

          // 5. ON FAIL: Trigger global error
          failUpload(
            errorMsg,
          );
        }
      };

    const resetUploader =
      () => {
        setStatus(
          "idle",
        );
        setSelectedFile(
          null,
        );
        setTitle(
          "",
        );
        setDescription(
          "",
        );
        setIsFree(
          false,
        );
        setIsNsfw(
          false,
        );
        setProgress(
          0,
        );
        fetchDefaultPPV();
      };

    // Determine if the selected file is an image or video for UI logic
    const isImageFile =
      selectedFile &&
      selectedFile.type.startsWith(
        "image/",
      );

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl p-8">
        {/* STAGE 1: FILE SELECTION */}
        {status ===
          "idle" && (
          <div
            {...getRootProps()}
            className={`p-12 text-center transition-all cursor-pointer flex flex-col items-center group border-2 border-dashed m-4 rounded-2xl ${
              isDragActive
                ? "border-[#FF5757] bg-slate-800/50"
                : "border-slate-700 hover:border-[#FF5757]"
            }`}
          >
            <input
              {...getInputProps()}
            />
            <div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-[#FF5757]" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2 text-center">
              Select
              Media
            </h2>
            <p className="text-slate-400 mb-6 max-w-md text-center">
              Upload
              high-quality
              Videos
              or
              Photos
              to
              securely
              paywall
              them
              or
              post
              as
              free
              promo
              content.
            </p>
            <button className="bg-slate-800 text-white font-semibold py-2 px-6 rounded-lg pointer-events-none">
              Browse
              Files
            </button>
          </div>
        )}

        {/* STAGE 2: METADATA FORM & UPLOAD */}
        {(status ===
          "file_selected" ||
          status ===
            "uploading") && (
          <div>
            <div className="flex flex-col items-center mb-6 border-b border-slate-800 pb-4 text-center">
              <div className="flex items-center text-emerald-400 justify-center mb-2">
                {isImageFile ? (
                  <ImageIcon className="w-6 h-6 mr-2" />
                ) : (
                  <Video className="w-6 h-6 mr-2" />
                )}
                <span className="font-medium truncate max-w-[200px]">
                  {
                    selectedFile?.name
                  }
                </span>
              </div>
              {status !==
                "uploading" && (
                <button
                  onClick={
                    resetUploader
                  }
                  className="text-slate-400 hover:text-white text-sm"
                >
                  Change
                  File
                </button>
              )}
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
                  disabled={
                    status ===
                    "uploading"
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5757] disabled:opacity-50"
                  placeholder={
                    isImageFile
                      ? "E.g., Exclusive Photoshoot Preview"
                      : "E.g., Exclusive Behind the Scenes"
                  }
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
                  disabled={
                    status ===
                    "uploading"
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5757] disabled:opacity-50"
                  placeholder="Tell your fans what to expect..."
                ></textarea>
              </div>

              {/* PRICING SECTION */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isFree"
                    checked={
                      isFree
                    }
                    onChange={(
                      e,
                    ) =>
                      setIsFree(
                        e
                          .target
                          .checked,
                      )
                    }
                    disabled={
                      status ===
                      "uploading"
                    }
                    className="w-4 h-4 text-[#FF5757] bg-slate-900 border-slate-700 rounded focus:ring-[#FF5757] focus:ring-2 cursor-pointer"
                  />
                  <label
                    htmlFor="isFree"
                    className="ml-2 text-sm font-bold text-white cursor-pointer"
                  >
                    Post
                    as
                    Free
                    Promo
                    Content
                  </label>

                  <div className="relative group ml-2 flex items-center">
                    <HelpCircle className="w-4 h-4 text-slate-400 cursor-help hover:text-white transition-colors" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-slate-800 text-xs text-slate-300 rounded-lg shadow-xl border border-slate-700 z-10 text-center leading-relaxed">
                      Free
                      content
                      acts
                      as
                      a
                      promo{" "}
                      {isImageFile
                        ? "photo"
                        : "video"}
                      .
                      It
                      displays
                      directly
                      on
                      the
                      feed
                      for
                      everyone,
                      generating
                      likes,
                      comments,
                      and
                      engagement
                      to
                      entice
                      fans
                      to
                      buy
                      subscriptions
                      or
                      PPV
                      content.
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-slate-800"></div>
                    </div>
                  </div>
                </div>

                {/* PPV Price Input */}
                <div>
                  <label
                    className={`flex items-center text-sm font-medium mb-1 transition-colors ${isFree ? "text-slate-600" : "text-slate-300"}`}
                  >
                    <Tag
                      className={`w-4 h-4 mr-2 transition-colors ${isFree ? "text-slate-600" : "text-[#FF5757]"}`}
                    />
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
                      isFree
                        ? ""
                        : priceInUSDT
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
                    disabled={
                      isFree ||
                      status ===
                        "uploading"
                    }
                    className={`w-full border rounded-lg px-4 py-3 text-white focus:outline-none transition-all ${
                      isFree
                        ? "bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed"
                        : "bg-slate-950 border-slate-700 focus:border-[#FF5757]"
                    }`}
                    placeholder={
                      isFree
                        ? "Content is set to Free"
                        : "Enter price in USDT"
                    }
                  />
                </div>
              </div>

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
                    controls.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={
                    status ===
                    "uploading"
                  }
                  onClick={() =>
                    setIsNsfw(
                      !isNsfw,
                    )
                  }
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${isNsfw ? "bg-[#FF5757]" : "bg-slate-700"}`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isNsfw ? "translate-x-6" : "translate-x-0"}`}
                  />
                </button>
              </div>

              {/* UPLOAD PROGRESS BAR */}
              {status ===
                "uploading" && (
                <div className="w-full pt-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-300 text-sm font-medium">
                      {progress <
                      90
                        ? "Uploading to Server..."
                        : "Processing & Encrypting Media..."}
                    </span>
                    <span className="text-[#FF5757] font-bold">
                      {
                        progress
                      }
                      %
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-[#FF5757] h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${progress}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* DYNAMIC SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={
                  status ===
                  "uploading"
                }
                className="w-full bg-[#FF5757] hover:bg-rose-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center mt-6 disabled:opacity-50"
              >
                {status ===
                "uploading" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />{" "}
                    Processing...
                  </>
                ) : isFree ? (
                  "Upload Free Content"
                ) : (
                  "Upload Paywall Content"
                )}
              </button>
            </form>
          </div>
        )}

        {/* STAGE 3: ERROR OR COMPLETE */}
        {status ===
          "error" && (
          <div className="py-6 flex flex-col items-center text-center">
            <XCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2 text-center">
              Upload
              Failed
            </h2>
            <p className="text-slate-400 mb-6 text-center">
              {
                errorMessage
              }
            </p>
            <button
              onClick={
                resetUploader
              }
              className="bg-slate-800 text-white py-2 px-6 rounded-lg hover:bg-slate-700"
            >
              Try
              Again
            </button>
          </div>
        )}

        {status ===
          "complete" && (
          <div className="py-8 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              Live
              on
              the
              Platform
            </h2>
            <p className="text-slate-400 mb-8 text-center">
              Content
              processed
              and
              configured
              successfully.
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
