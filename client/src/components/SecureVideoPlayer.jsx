import React, {
  useState,
  useEffect,
} from "react";
import axios from "axios";

const SecureVideoPlayer =
  ({
    contentId,
    token,
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
            const response =
              await axios.get(
                `/api/content/${contentId}/payload`,
                {
                  headers:
                    {
                      Authorization: `Bearer ${token}`,
                    },
                },
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

      fetchPayload();
    }, [
      contentId,
      token,
    ]);

    if (
      error
    )
      return (
        <div className="text-red-500">
          {
            error
          }
        </div>
      );
    if (
      !videoUrl
    )
      return (
        <div>
          Unlocking
          content...
        </div>
      );

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
