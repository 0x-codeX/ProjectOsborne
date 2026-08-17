import React, {
  createContext,
  useState,
  useContext,
} from "react";

const UploadContext =
  createContext();

export const useUpload =
  () =>
    useContext(
      UploadContext,
    );

export const UploadProvider =
  ({
    children,
  }) => {
    const [
      uploadState,
      setUploadState,
    ] =
      useState(
        {
          isUploading: false,
          progress: 0,
          fileName:
            "",
          status:
            "idle", // idle, uploading, complete, error
          errorMessage:
            "",
        },
      );

    const startUpload =
      (
        fileName,
      ) => {
        setUploadState(
          {
            isUploading: true,
            progress: 0,
            fileName,
            status:
              "uploading",
            errorMessage:
              "",
          },
        );
      };

    const updateProgress =
      (
        progress,
      ) => {
        setUploadState(
          (
            prev,
          ) => ({
            ...prev,
            progress,
          }),
        );
      };

    const completeUpload =
      () => {
        setUploadState(
          (
            prev,
          ) => ({
            ...prev,
            progress: 100,
            status:
              "complete",
          }),
        );
        // Auto-hide after 3 seconds
        setTimeout(
          () => {
            setUploadState(
              (
                prev,
              ) => ({
                ...prev,
                isUploading: false,
                status:
                  "idle",
              }),
            );
          },
          3000,
        );
      };

    const failUpload =
      (
        errorMessage,
      ) => {
        setUploadState(
          (
            prev,
          ) => ({
            ...prev,
            status:
              "error",
            errorMessage,
          }),
        );
        // Auto-hide after 5 seconds
        setTimeout(
          () => {
            setUploadState(
              (
                prev,
              ) => ({
                ...prev,
                isUploading: false,
                status:
                  "idle",
              }),
            );
          },
          5000,
        );
      };

    const clearUpload =
      () => {
        setUploadState(
          {
            isUploading: false,
            progress: 0,
            fileName:
              "",
            status:
              "idle",
            errorMessage:
              "",
          },
        );
      };

    return (
      <UploadContext.Provider
        value={{
          uploadState,
          startUpload,
          updateProgress,
          completeUpload,
          failUpload,
          clearUpload,
        }}
      >
        {
          children
        }
      </UploadContext.Provider>
    );
  };
