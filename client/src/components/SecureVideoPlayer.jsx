import React, {
  useState,
  useEffect,
} from "react";
import api from "../utils/api"; // Make sure this path matches where you saved api.js

// 1. Removed 'token' from props. The interceptor handles it now.
const SecureVideoPlayer =
  ({
    contentId,
  }) => {
    const [
      videoUrl,
      setVideoUrl,
    ] =
      useState(
        null,
      );
    const [
      error,
      setError,
    ] =
      useState(
        null,
      );

    useEffect(() => {
      const fetchPayload =
        async () => {
          try {
            // 2. Clean, single-line request. No headers, no manual tokens!
            const response =
              await api.get(
                `/content/${contentId}/payload`,
              );

            // This is the 60-second presigned URL
            setVideoUrl(
              response
                .data
                .mediaUrl,
            );
          } catch (err) {
            setError(
              err
                .response
                ?.data
                ?.error ||
                "Failed to load media",
            );
          }
        };

      if (
        contentId
      ) {
        fetchPayload();
      }
    }, [
      contentId,
    ]); // 3. Removed 'token' from the dependency array

    if (
      error
    ) {
      return (
        <div className="text-red-500">
          {
            error
          }
        </div>
      );
    }

    if (
      !videoUrl
    ) {
      return (
        <div>
          Unlocking
          content...
        </div>
      );
    }

    return (
      <video
        controls
        controlsList="nodownload" // Disables the native HTML5 download button
        onContextMenu={(
          e,
        ) =>
          e.preventDefault()
        } // Disables right-click menu
        className="w-full rounded-lg shadow-lg"
      >
        <source
          src={
            videoUrl
          }
          type="video/mp4"
        />
        Your
        browser
        does
        not
        support
        secure
        video
        playback.
      </video>
    );
  };

export default SecureVideoPlayer;
