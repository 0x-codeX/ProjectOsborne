import React, {
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  DollarSign,
  Film,
  Image as ImageIcon,
  AlertCircle,
  X,
  Check,
  ShieldAlert,
  Search,
  Plus,
  RefreshCw,
} from "lucide-react";

const CreatorVault =
  () => {
    const navigate =
      useNavigate();

    // Core Data & UI States
    const [
      contents,
      setContents,
    ] =
      useState(
        [],
      );
    const [
      isLoading,
      setIsLoading,
    ] =
      useState(
        true,
      );
    const [
      error,
      setError,
    ] =
      useState(
        "",
      );
    const [
      searchTerm,
      setSearchTerm,
    ] =
      useState(
        "",
      );
    const [
      filterType,
      setFilterType,
    ] =
      useState(
        "all",
      ); // 'all', 'ppv', 'free', 'nsfw'

    // Edit Modal State
    const [
      editingPost,
      setEditingPost,
    ] =
      useState(
        null,
      );
    const [
      editFormData,
      setEditFormData,
    ] =
      useState(
        {
          title:
            "",
          description:
            "",
          priceInUSDT: 0,
          isNsfw: false,
          isActive: true,
        },
      );
    const [
      isSaving,
      setIsSaving,
    ] =
      useState(
        false,
      );

    // Delete Confirmation State
    const [
      deletingPostId,
      setDeletingPostId,
    ] =
      useState(
        null,
      );
    const [
      isDeleting,
      setIsDeleting,
    ] =
      useState(
        false,
      );

    const getAuthToken =
      () => {
        return (
          localStorage.getItem(
            "nippy_token",
          ) ||
          localStorage.getItem(
            "token",
          )
        );
      };

    // 1. Fetch Creator's Uploaded Content
    const fetchVaultContent =
      async () => {
        setIsLoading(
          true,
        );
        setError(
          "",
        );
        try {
          const token =
            getAuthToken();
          if (
            !token
          ) {
            navigate(
              "/auth/login",
            );
            return;
          }

          const response =
            await fetch(
              "http://localhost:5000/api/content/vault",
              {
                method:
                  "GET",
                headers:
                  {
                    "Content-Type":
                      "application/json",
                    Authorization: `Bearer ${token}`,
                  },
              },
            );

          if (
            !response.ok
          ) {
            const data =
              await response.json();
            throw new Error(
              data.message ||
                "Failed to fetch vault items.",
            );
          }

          const data =
            await response.json();
          setContents(
            data,
          );
        } catch (err) {
          console.error(
            "--- FRONTEND FETCH FAILED ---",
          );
          console.error(
            "Error Details:",
            err,
          );
          setError(
            err.message ||
              "Could not load vault contents.",
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      };

    useEffect(() => {
      fetchVaultContent();
    }, []);

    // 2. Open Edit Modal
    const handleOpenEdit =
      (
        post,
      ) => {
        setEditingPost(
          post,
        );
        setEditFormData(
          {
            title:
              post.title ||
              "",
            description:
              post.description ||
              "",
            priceInUSDT:
              post.priceInUSDT !==
              undefined
                ? post.priceInUSDT
                : 0,
            isNsfw:
              post.isNsfw ||
              false,
            isActive:
              post.isActive !==
              undefined
                ? post.isActive
                : true,
          },
        );
      };

    // 3. Save Edited Post
    const handleSaveEdit =
      async (
        e,
      ) => {
        e.preventDefault();
        if (
          !editingPost
        )
          return;

        setIsSaving(
          true,
        );
        setError(
          "",
        );

        try {
          const token =
            getAuthToken();
          const response =
            await fetch(
              `http://localhost:5000/api/content/${editingPost._id}`,
              {
                method:
                  "PUT",
                headers:
                  {
                    "Content-Type":
                      "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                body: JSON.stringify(
                  editFormData,
                ),
              },
            );

          const data =
            await response.json();

          if (
            !response.ok
          ) {
            throw new Error(
              data.message ||
                "Failed to update post.",
            );
          }

          // Update local state instantly
          setContents(
            (
              prev,
            ) =>
              prev.map(
                (
                  item,
                ) =>
                  item._id ===
                  editingPost._id
                    ? data.content
                    : item,
              ),
          );

          setEditingPost(
            null,
          );
        } catch (err) {
          console.error(
            "Update post error:",
            err,
          );
          setError(
            err.message ||
              "Failed to save changes.",
          );
        } finally {
          setIsSaving(
            false,
          );
        }
      };

    // 4. Confirm & Execute Deletion
    const handleDeletePost =
      async () => {
        if (
          !deletingPostId
        )
          return;

        setIsDeleting(
          true,
        );
        setError(
          "",
        );

        try {
          const token =
            getAuthToken();
          const response =
            await fetch(
              `http://localhost:5000/api/content/${deletingPostId}`,
              {
                method:
                  "DELETE",
                headers:
                  {
                    "Content-Type":
                      "application/json",
                    Authorization: `Bearer ${token}`,
                  },
              },
            );

          const data =
            await response.json();

          if (
            !response.ok
          ) {
            throw new Error(
              data.message ||
                "Failed to delete post.",
            );
          }

          // Remove item from state
          setContents(
            (
              prev,
            ) =>
              prev.filter(
                (
                  item,
                ) =>
                  item._id !==
                  deletingPostId,
              ),
          );
          setDeletingPostId(
            null,
          );
        } catch (err) {
          console.error(
            "Delete post error:",
            err,
          );
          setError(
            err.message ||
              "Failed to delete post.",
          );
        } finally {
          setIsDeleting(
            false,
          );
        }
      };

    // Client-side Filter Logic
    const filteredContents =
      contents.filter(
        (
          item,
        ) => {
          const matchesSearch =
            item.title
              ?.toLowerCase()
              .includes(
                searchTerm.toLowerCase(),
              ) ||
            item.description
              ?.toLowerCase()
              .includes(
                searchTerm.toLowerCase(),
              );

          if (
            !matchesSearch
          )
            return false;

          if (
            filterType ===
            "ppv"
          )
            return (
              item.priceInUSDT >
              0
            );
          if (
            filterType ===
            "free"
          )
            return (
              item.priceInUSDT ===
              0
            );
          if (
            filterType ===
            "nsfw"
          )
            return (
              item.isNsfw ===
              true
            );

          return true;
        },
      );

    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-200 font-sans relative">
        <div className="max-w-7xl mx-auto">
          {/* TOP NAVIGATION & HEADER */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <button
                onClick={() =>
                  navigate(
                    "/creator/dashboard",
                  )
                }
                className="flex items-center text-slate-400 hover:text-white transition-colors mb-2 text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
                to
                Dashboard
              </button>
              <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                Creator
                Vault
                <span className="text-xs bg-slate-800 text-slate-400 border border-slate-700 px-3 py-1 rounded-full font-mono">
                  {
                    contents.length
                  }{" "}
                  Items
                </span>
              </h1>
            </div>

            <button
              onClick={() =>
                navigate(
                  "/creator/dashboard",
                )
              }
              className="flex items-center justify-center px-4 py-2.5 bg-[#FF5757] hover:bg-[#ff3d3d] text-white font-bold rounded-xl transition-colors shadow-lg shadow-[#FF5757]/10 text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload
              New
              Content
            </button>
          </div>

          {/* ERROR DISPLAY */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center text-red-500 text-sm">
              <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
              <span>
                {
                  error
                }
              </span>
            </div>
          )}

          {/* FILTER & SEARCH BAR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search uploads..."
                value={
                  searchTerm
                }
                onChange={(
                  e,
                ) =>
                  setSearchTerm(
                    e
                      .target
                      .value,
                  )
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-slate-700"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              {[
                {
                  id: "all",
                  label:
                    "All Items",
                },
                {
                  id: "ppv",
                  label:
                    "Pay-Per-View",
                },
                {
                  id: "free",
                  label:
                    "Free Content",
                },
                {
                  id: "nsfw",
                  label:
                    "NSFW (18+)",
                },
              ].map(
                (
                  tab,
                ) => (
                  <button
                    key={
                      tab.id
                    }
                    onClick={() =>
                      setFilterType(
                        tab.id,
                      )
                    }
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      filterType ===
                      tab.id
                        ? "bg-slate-800 text-white border border-slate-700"
                        : "text-slate-400 hover:text-white hover:bg-slate-950"
                    }`}
                  >
                    {
                      tab.label
                    }
                  </button>
                ),
              )}

              <button
                onClick={
                  fetchVaultContent
                }
                title="Refresh Vault"
                className="p-2 text-slate-400 hover:text-white bg-slate-950 border border-slate-800 rounded-lg transition-colors ml-auto md:ml-2"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* VAULT GRID */}
          {isLoading ? (
            <div className="min-h-[300px] flex items-center justify-center text-slate-500 animate-pulse">
              Retrieving
              Vault
              Items...
            </div>
          ) : filteredContents.length ===
            0 ? (
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-12 text-center max-w-lg mx-auto my-12">
              <Film className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">
                No
                Content
                Found
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                {contents.length ===
                0
                  ? "You haven't uploaded any media or posts to your Vault yet."
                  : "No items match your active search and filter options."}
              </p>
              {contents.length ===
                0 && (
                <button
                  onClick={() =>
                    navigate(
                      "/creator/dashboard",
                    )
                  }
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-sm transition-colors"
                >
                  Go
                  to
                  Dashboard
                  Uploader
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContents.map(
                (
                  post,
                ) => {
                  const isVideo =
                    post.fileType?.includes(
                      "video",
                    );

                  return (
                    <div
                      key={
                        post._id
                      }
                      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700 transition-all flex flex-col"
                    >
                      {/* MEDIA THUMBNAIL / KEY PREVIEW */}
                      <div className="relative aspect-video bg-slate-950 flex items-center justify-center border-b border-slate-800 overflow-hidden group">
                        {post.previewKey ? (
                          <img
                            src={`https://pub-cloudflare.com/${post.previewKey}`} // Replace with your domain/gateway logic if needed
                            alt={
                              post.title
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-600">
                            {isVideo ? (
                              <Film className="w-10 h-10 mb-2" />
                            ) : (
                              <ImageIcon className="w-10 h-10 mb-2" />
                            )}
                            <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
                              {post.fileType ||
                                "Media File"}
                            </span>
                          </div>
                        )}

                        {/* PRICE BADGE */}
                        <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-slate-700 px-3 py-1 rounded-full text-xs font-mono font-bold text-emerald-400 flex items-center gap-1 shadow-lg">
                          {post.priceInUSDT >
                          0 ? (
                            <>
                              <Lock className="w-3 h-3 text-amber-400" />
                              <span>
                                {
                                  post.priceInUSDT
                                }{" "}
                                USDT
                              </span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3 text-emerald-400" />
                              <span>
                                FREE
                              </span>
                            </>
                          )}
                        </div>

                        {/* NSFW BADGE */}
                        {post.isNsfw && (
                          <div className="absolute top-3 right-3 bg-red-500/90 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">
                            18+
                            NSFW
                          </div>
                        )}
                      </div>

                      {/* POST CONTENT BODY */}
                      <div className="p-5 flex-grow flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-white text-lg mb-1 truncate">
                            {
                              post.title
                            }
                          </h3>
                          <p className="text-slate-400 text-sm line-clamp-2 mb-4 leading-relaxed">
                            {post.description ||
                              "No description provided."}
                          </p>
                        </div>

                        {/* CARD FOOTER & METADATA */}
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-3 mb-4">
                            <span>
                              Uploaded:{" "}
                              {new Date(
                                post.createdAt,
                              ).toLocaleDateString()}
                            </span>
                            <span
                              className={`font-semibold ${
                                post.isActive
                                  ? "text-emerald-500"
                                  : "text-amber-500"
                              }`}
                            >
                              {post.isActive
                                ? "Published"
                                : "Draft/Hidden"}
                            </span>
                          </div>

                          {/* ACTION BUTTONS */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleOpenEdit(
                                  post,
                                )
                              }
                              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-xs flex items-center justify-center transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                              Edit
                              Details
                            </button>
                            <button
                              onClick={() =>
                                setDeletingPostId(
                                  post._id,
                                )
                              }
                              className="py-2 px-3 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/20 rounded-xl text-xs transition-colors flex items-center justify-center"
                              title="Delete Content"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}

          {/* EDIT MODAL OVERLAY */}
          {editingPost && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <Edit3 className="w-5 h-5 mr-2 text-amber-500" />
                    Edit
                    Content
                    Details
                  </h3>
                  <button
                    onClick={() =>
                      setEditingPost(
                        null,
                      )
                    }
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form
                  onSubmit={
                    handleSaveEdit
                  }
                  className="space-y-4"
                >
                  {/* Title Input */}
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1 block">
                      Post
                      Title
                    </label>
                    <input
                      type="text"
                      required
                      value={
                        editFormData.title
                      }
                      onChange={(
                        e,
                      ) =>
                        setEditFormData(
                          (
                            prev,
                          ) => ({
                            ...prev,
                            title:
                              e
                                .target
                                .value,
                          }),
                        )
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Description Input */}
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1 block">
                      Description
                    </label>
                    <textarea
                      rows={
                        3
                      }
                      value={
                        editFormData.description
                      }
                      onChange={(
                        e,
                      ) =>
                        setEditFormData(
                          (
                            prev,
                          ) => ({
                            ...prev,
                            description:
                              e
                                .target
                                .value,
                          }),
                        )
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-amber-500 resize-none"
                    />
                  </div>

                  {/* Price in USDT */}
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1 block">
                      Price
                      in
                      USDT
                      (Set
                      0
                      for
                      Free)
                    </label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={
                          editFormData.priceInUSDT
                        }
                        onChange={(
                          e,
                        ) =>
                          setEditFormData(
                            (
                              prev,
                            ) => ({
                              ...prev,
                              priceInUSDT:
                                parseFloat(
                                  e
                                    .target
                                    .value,
                                ) ||
                                0,
                            }),
                          )
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-white text-sm font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Checkboxes: NSFW & Active Status */}
                  <div className="pt-2 space-y-3">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          editFormData.isNsfw
                        }
                        onChange={(
                          e,
                        ) =>
                          setEditFormData(
                            (
                              prev,
                            ) => ({
                              ...prev,
                              isNsfw:
                                e
                                  .target
                                  .checked,
                            }),
                          )
                        }
                        className="sr-only"
                      />
                      <div
                        className={`w-9 h-5 rounded-full transition-colors relative ${
                          editFormData.isNsfw
                            ? "bg-red-500"
                            : "bg-slate-800"
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-transform ${
                            editFormData.isNsfw
                              ? "transform translate-x-4.5"
                              : "left-0.75"
                          }`}
                        ></div>
                      </div>
                      <span className="ml-3 text-sm text-slate-300 font-medium">
                        Flag
                        as
                        NSFW
                        (18+
                        Content)
                      </span>
                    </label>

                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          editFormData.isActive
                        }
                        onChange={(
                          e,
                        ) =>
                          setEditFormData(
                            (
                              prev,
                            ) => ({
                              ...prev,
                              isActive:
                                e
                                  .target
                                  .checked,
                            }),
                          )
                        }
                        className="sr-only"
                      />
                      <div
                        className={`w-9 h-5 rounded-full transition-colors relative ${
                          editFormData.isActive
                            ? "bg-emerald-500"
                            : "bg-slate-800"
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-transform ${
                            editFormData.isActive
                              ? "transform translate-x-4.5"
                              : "left-0.75"
                          }`}
                        ></div>
                      </div>
                      <span className="ml-3 text-sm text-slate-300 font-medium">
                        Publish
                        to
                        Feed
                        (Active)
                      </span>
                    </label>
                  </div>

                  {/* Form Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingPost(
                          null,
                        )
                      }
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        isSaving
                      }
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                    >
                      {isSaving
                        ? "Saving..."
                        : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* DELETE CONFIRMATION OVERLAY */}
          {deletingPostId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-red-500/30 p-8 rounded-3xl w-full max-w-md shadow-2xl relative text-center">
                <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                  <ShieldAlert className="w-7 h-7 text-red-500" />
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                  Delete
                  Content
                  Post?
                </h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  This
                  action
                  is
                  permanent
                  and
                  cannot
                  be
                  undone.
                  The
                  post
                  will
                  be
                  wiped
                  from
                  your
                  Creator
                  Vault
                  and
                  fan
                  feeds.
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={() =>
                      setDeletingPostId(
                        null,
                      )
                    }
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={
                      handleDeletePost
                    }
                    disabled={
                      isDeleting
                    }
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50"
                  >
                    {isDeleting
                      ? "Deleting..."
                      : "Delete Permanently"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

export default CreatorVault;
