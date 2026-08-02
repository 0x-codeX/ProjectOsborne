// client/src/components/LandingPage.jsx
import React, {
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  User,
  Star,
} from "lucide-react";
import { ethers } from "ethers";
import { useGoogleLogin } from "@react-oauth/google";
import landingBackground from "../assets/background7.jpg"; // Ensure this path is correct

const LandingPage =
  () => {
    const navigate =
      useNavigate();

    // View states: 'login' | 'signup-select' | 'signup-form'
    const [
      view,
      setView,
    ] =
      useState(
        "login",
      );
    const [
      selectedRole,
      setSelectedRole,
    ] =
      useState(
        null,
      ); // 'fan' | 'creator'

    const [
      email,
      setEmail,
    ] =
      useState(
        "",
      );
    const [
      password,
      setPassword,
    ] =
      useState(
        "",
      );
    const [
      error,
      setError,
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

    const resetForm =
      () => {
        setEmail(
          "",
        );
        setPassword(
          "",
        );
        setError(
          "",
        );
      };

    const handleEmailSubmit =
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

        const isLogin =
          view ===
          "login";
        const endpoint =
          isLogin
            ? "/api/auth/login"
            : "/api/auth/register";
        const payload =
          isLogin
            ? {
                email,
                password,
              }
            : {
                email,
                password,
                role: selectedRole,
              };

        try {
          const response =
            await fetch(
              `http://localhost:5000${endpoint}`,
              {
                method:
                  "POST",
                headers:
                  {
                    "Content-Type":
                      "application/json",
                  },
                body: JSON.stringify(
                  payload,
                ),
              },
            );

          const data =
            await response.json();

          if (
            response.ok
          ) {
            localStorage.setItem(
              "nippy_token",
              data.token,
            );
            const userObj =
              data.user ||
              data;
            localStorage.setItem(
              "nippy_user",
              JSON.stringify(
                userObj,
              ),
            );

            if (
              userObj.role ===
              "creator"
            ) {
              if (
                !isLogin ||
                userObj.hasCompletedBioData ===
                  false
              ) {
                navigate(
                  "/auth/creator/biodata",
                );
              } else {
                navigate(
                  "/creator/dashboard",
                );
              }
            } else {
              if (
                !isLogin ||
                !userObj.isAgeVerified
              ) {
                navigate(
                  "/fan-setup",
                );
              } else {
                navigate(
                  "/feed",
                );
              }
            }
          } else {
            setError(
              data.message ||
                "Authentication failed",
            );
          }
        } catch (err) {
          setError(
            "Server connection error. Ensure backend is running.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      };

    const handleWeb3Auth =
      async () => {
        try {
          setError(
            "",
          );
          if (
            !window.ethereum
          ) {
            setError(
              "No crypto wallet detected. Please install MetaMask.",
            );
            return;
          }

          setLoading(
            true,
          );
          const isLogin =
            view ===
            "login";

          let targetProvider =
            window.ethereum;
          if (
            window
              .ethereum
              .providers
              ?.length
          ) {
            targetProvider =
              window.ethereum.providers.find(
                (
                  p,
                ) =>
                  p.isMetaMask,
              ) ||
              window
                .ethereum
                .providers[0];
          }

          const provider =
            new ethers.BrowserProvider(
              targetProvider,
            );
          const signer =
            await provider.getSigner();
          const walletAddress =
            await signer.getAddress();

          const nonceRes =
            await fetch(
              `http://localhost:5000/api/auth/web3-nonce?walletAddress=${walletAddress}`,
            );
          if (
            !nonceRes.ok
          )
            throw new Error(
              "Failed to secure login challenge.",
            );

          const nonceData =
            await nonceRes.json();
          const serverMessage =
            typeof nonceData ===
            "string"
              ? nonceData
              : nonceData.message;
          const signature =
            await signer.signMessage(
              serverMessage,
            );

          const payload =
            {
              walletAddress,
              signature,
              ...(!isLogin && {
                role: selectedRole,
              }),
            };

          const response =
            await fetch(
              "http://localhost:5000/api/auth/web3-login",
              {
                method:
                  "POST",
                headers:
                  {
                    "Content-Type":
                      "application/json",
                  },
                body: JSON.stringify(
                  payload,
                ),
              },
            );

          const data =
            await response.json();

          if (
            response.ok
          ) {
            localStorage.setItem(
              "nippy_token",
              data.token,
            );
            const userObj =
              data.user ||
              data;
            localStorage.setItem(
              "nippy_user",
              JSON.stringify(
                userObj,
              ),
            );

            if (
              userObj.role ===
              "creator"
            ) {
              if (
                data.isNewUser ||
                userObj.hasCompletedBioData ===
                  false
              ) {
                navigate(
                  "/auth/creator/biodata",
                );
              } else {
                navigate(
                  "/creator/dashboard",
                );
              }
            } else {
              if (
                data.isNewUser ||
                !userObj.isAgeVerified
              ) {
                navigate(
                  "/fan-setup",
                );
              } else {
                navigate(
                  "/feed",
                );
              }
            }
          } else {
            setError(
              data.message ||
                "Web3 Authentication failed",
            );
          }
        } catch (err) {
          console.error(
            "Web3 Error:",
            err,
          );
          setError(
            err.message ||
              "Wallet connection failed.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      };

    const loginWithGoogle =
      useGoogleLogin(
        {
          onSuccess:
            async (
              tokenResponse,
            ) => {
              try {
                setLoading(
                  true,
                );
                setError(
                  "",
                );
                const isLogin =
                  view ===
                  "login";

                // Google returns an access_token here. We send it to our backend.
                const payload =
                  {
                    credential:
                      tokenResponse.access_token,
                    ...(!isLogin && {
                      role: selectedRole,
                    }),
                  };

                const response =
                  await fetch(
                    "http://localhost:5000/api/auth/google",
                    {
                      method:
                        "POST",
                      headers:
                        {
                          "Content-Type":
                            "application/json",
                        },
                      body: JSON.stringify(
                        payload,
                      ),
                    },
                  );

                const data =
                  await response.json();

                if (
                  response.ok
                ) {
                  localStorage.setItem(
                    "nippy_token",
                    data.token,
                  );
                  const userObj =
                    data.user ||
                    data;
                  localStorage.setItem(
                    "nippy_user",
                    JSON.stringify(
                      userObj,
                    ),
                  );

                  // Exact same routing logic as your Web3 setup
                  if (
                    userObj.role ===
                    "creator"
                  ) {
                    if (
                      data.isNewUser ||
                      userObj.hasCompletedBioData ===
                        false
                    ) {
                      navigate(
                        "/auth/creator/biodata",
                      );
                    } else {
                      navigate(
                        "/creator/dashboard",
                      );
                    }
                  } else {
                    if (
                      data.isNewUser ||
                      !userObj.isAgeVerified
                    ) {
                      navigate(
                        "/fan-setup",
                      );
                    } else {
                      navigate(
                        "/feed",
                      );
                    }
                  }
                } else {
                  setError(
                    data.message ||
                      "Google Authentication failed on server",
                  );
                }
              } catch (err) {
                setError(
                  "Network error communicating with server.",
                );
              } finally {
                setLoading(
                  false,
                );
              }
            },
          onError:
            () =>
              setError(
                "Google login popup failed or was closed.",
              ),
        },
      );

    // Social Auth Handlers
    const handleGoogleAuth =
      () => {
        window.location.href =
          "http://localhost:5000/api/auth/google";
      };

    const handleXAuth =
      () => {
        window.location.href =
          "http://localhost:5000/api/auth/x";
      };

    return (
      <div className="h-screen w-full flex overflow-hidden bg-slate-900 font-sans text-slate-100">
        {/* Background - Visible on ALL screens, perfectly static */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-slate-900/40 z-10"></div>
          {/* Drop your actual image URL here */}
          <img
            src={
              landingBackground
            }
            alt="Creator Background"
            className="w-full h-full object-cover grayscale-[20%]"
          />
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 w-full h-full flex items-center justify-center lg:justify-between lg:pl-16 lg:pr-6">
          {/* Left Side - Hero Text (Hidden on small screens) */}
          <div className="hidden lg:block w-1/2">
            <span className="text-4xl font-black tracking-tighter text-emerald-500 block mb-6">
              NIPPY.
            </span>
            <h1 className="text-6xl font-black text-white mb-4 tracking-tight drop-shadow-2xl leading-tight">
              Own
              your
              audience.{" "}
              <br />{" "}
              Keep
              your
              revenue.
            </h1>
            <p className="text-lg text-slate-300 font-medium max-w-md drop-shadow-md">
              The
              Web3
              monetization
              platform
              built
              for
              creators
              who
              want
              instant
              payouts
              and
              total
              control.
            </p>
          </div>

          {/* Right Side - Auth Panel */}
          <div className="w-[92%] sm:w-[450px] h-auto max-h-[90vh] bg-slate-900/80 backdrop-blur-2xl border border-slate-700/50 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col justify-center px-6 sm:px-12 py-8 lg:translate-x-4 overflow-y-auto">
            {/* Mobile Logo */}
            <div className="lg:hidden mb-6 text-center">
              <span className="text-3xl font-black tracking-tighter text-emerald-500">
                NIPPY.
              </span>
            </div>

            <div className="w-full">
              {/* ---------------- LOGIN VIEW ---------------- */}
              {view ===
                "login" && (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                    Welcome
                    Back
                  </h2>
                  <p className="text-slate-400 mb-6">
                    Log
                    in
                    to
                    access
                    your
                    account.
                  </p>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm">
                      {
                        error
                      }
                    </div>
                  )}

                  <form
                    onSubmit={
                      handleEmailSubmit
                    }
                    className="space-y-4"
                  >
                    <div className="relative">
                      <Mail
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                        size={
                          18
                        }
                      />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={
                          email
                        }
                        onChange={(
                          e,
                        ) =>
                          setEmail(
                            e
                              .target
                              .value,
                          )
                        }
                        className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-500"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Lock
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                        size={
                          18
                        }
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={
                          password
                        }
                        onChange={(
                          e,
                        ) =>
                          setPassword(
                            e
                              .target
                              .value,
                          )
                        }
                        className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-500"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={
                        loading
                      }
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      {loading
                        ? "Processing..."
                        : "Log In"}
                      {!loading && (
                        <ArrowRight
                          size={
                            18
                          }
                        />
                      )}
                    </button>
                  </form>

                  {/* Web2 Socials Grouped with Email */}
                  <div className="flex gap-3 mt-3">
                    <button
                      type="button"
                      onClick={
                        handleGoogleAuth
                      }
                      disabled={
                        loading
                      }
                      className="flex-1 bg-slate-800/50 hover:bg-slate-700/80 border border-slate-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Google
                    </button>
                  </div>

                  <div className="my-6 flex items-center text-slate-500 text-xs font-bold tracking-widest before:flex-1 before:border-t before:border-slate-700 before:mr-4 after:flex-1 after:border-t after:border-slate-700 after:ml-4">
                    OR
                  </div>

                  {/* Web3 Isolated */}
                  <button
                    onClick={
                      handleWeb3Auth
                    }
                    disabled={
                      loading
                    }
                    className="w-full bg-slate-800/50 hover:bg-slate-700/80 border border-slate-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-3"
                  >
                    <Wallet
                      size={
                        20
                      }
                      className="text-emerald-400"
                    />
                    Continue
                    with
                    Web3
                  </button>

                  <p className="mt-6 text-center text-slate-400 text-sm">
                    Don't
                    have
                    an
                    account?{" "}
                    <button
                      onClick={() => {
                        setView(
                          "signup-select",
                        );
                        resetForm();
                      }}
                      className="text-emerald-500 font-bold hover:underline"
                    >
                      Sign
                      up
                    </button>
                  </p>
                </div>
              )}

              {/* ---------------- SIGNUP: ROLE SELECTION VIEW ---------------- */}
              {view ===
                "signup-select" && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                    Join
                    Nippy
                  </h2>
                  <p className="text-slate-400 mb-6">
                    How
                    do
                    you
                    want
                    to
                    use
                    the
                    platform?
                  </p>

                  <div className="space-y-4">
                    <button
                      onClick={() => {
                        setSelectedRole(
                          "fan",
                        );
                        setView(
                          "signup-form",
                        );
                      }}
                      className="w-full bg-slate-950/40 hover:bg-slate-800/80 border border-slate-700 text-white p-5 rounded-2xl transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-slate-800/50 p-3 rounded-xl group-hover:text-emerald-500 group-hover:bg-emerald-500/10 transition-colors">
                          <User
                            size={
                              24
                            }
                          />
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-lg">
                            Sign
                            up
                            as
                            a
                            Fan
                          </h3>
                          <p className="text-sm text-slate-400">
                            Unlock
                            exclusive
                            content.
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        size={
                          20
                        }
                        className="text-slate-600 group-hover:text-emerald-500 transition-colors"
                      />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedRole(
                          "creator",
                        );
                        setView(
                          "signup-form",
                        );
                      }}
                      className="w-full bg-slate-950/40 hover:bg-slate-800/80 border border-slate-700 text-white p-5 rounded-2xl transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-slate-800/50 p-3 rounded-xl group-hover:text-emerald-500 group-hover:bg-emerald-500/10 transition-colors">
                          <Star
                            size={
                              24
                            }
                          />
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-lg">
                            Sign
                            up
                            as
                            a
                            Creator
                          </h3>
                          <p className="text-sm text-slate-400">
                            Monetize
                            instantly.
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        size={
                          20
                        }
                        className="text-slate-600 group-hover:text-emerald-500 transition-colors"
                      />
                    </button>
                  </div>

                  <p className="mt-6 text-center text-slate-400 text-sm">
                    Already
                    have
                    an
                    account?{" "}
                    <button
                      onClick={() =>
                        setView(
                          "login",
                        )
                      }
                      className="text-emerald-500 font-bold hover:underline"
                    >
                      Log
                      in
                    </button>
                  </p>
                </div>
              )}

              {/* ---------------- SIGNUP: FORM VIEW ---------------- */}
              {view ===
                "signup-form" && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <button
                    onClick={() => {
                      setView(
                        "signup-select",
                      );
                      resetForm();
                    }}
                    className="text-slate-400 hover:text-white mb-4 flex items-center gap-2 text-sm font-medium transition-colors"
                  >
                    <ArrowLeft
                      size={
                        16
                      }
                    />{" "}
                    Back
                  </button>

                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                    Create{" "}
                    {selectedRole ===
                    "creator"
                      ? "Creator"
                      : "Fan"}{" "}
                    Account
                  </h2>
                  <p className="text-slate-400 mb-6">
                    Enter
                    your
                    details
                    to
                    get
                    started.
                  </p>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm">
                      {
                        error
                      }
                    </div>
                  )}

                  <form
                    onSubmit={
                      handleEmailSubmit
                    }
                    className="space-y-4"
                  >
                    <div className="relative">
                      <Mail
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                        size={
                          18
                        }
                      />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={
                          email
                        }
                        onChange={(
                          e,
                        ) =>
                          setEmail(
                            e
                              .target
                              .value,
                          )
                        }
                        className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-500"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Lock
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                        size={
                          18
                        }
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={
                          password
                        }
                        onChange={(
                          e,
                        ) =>
                          setPassword(
                            e
                              .target
                              .value,
                          )
                        }
                        className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-500"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={
                        loading
                      }
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      {loading
                        ? "Processing..."
                        : "Create Account"}
                      {!loading && (
                        <ArrowRight
                          size={
                            18
                          }
                        />
                      )}
                    </button>
                  </form>

                  {/* Web2 Social Grouped with Email */}
                  <div className="flex gap-3 mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        loginWithGoogle()
                      }
                      disabled={
                        loading
                      }
                      className="w-full bg-slate-800/50 hover:bg-slate-700/80 border border-slate-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Continue
                      with
                      Google
                    </button>
                  </div>

                  <div className="my-6 flex items-center text-slate-500 text-xs font-bold tracking-widest before:flex-1 before:border-t before:border-slate-700 before:mr-4 after:flex-1 after:border-t after:border-slate-700 after:ml-4">
                    OR
                  </div>

                  {/* Web3 Isolated */}
                  <button
                    onClick={
                      handleWeb3Auth
                    }
                    disabled={
                      loading
                    }
                    className="w-full bg-slate-800/50 hover:bg-slate-700/80 border border-slate-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-3"
                  >
                    <Wallet
                      size={
                        20
                      }
                      className="text-emerald-400"
                    />
                    Sign
                    Up
                    with
                    Web3
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

export default LandingPage;
