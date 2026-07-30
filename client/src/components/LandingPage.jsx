// client/src/components/LandingPage.jsx
import React, {
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  PlayCircle,
  Wallet,
  Mail,
  Lock,
  ArrowRight,
  X,
} from "lucide-react";
import { ethers } from "ethers";

const LandingPage =
  () => {
    const navigate =
      useNavigate();
    const [
      authModalRole,
      setAuthModalRole,
    ] =
      useState(
        null,
      ); // 'fan' | 'creator' | null
    const [
      isLogin,
      setIsLogin,
    ] =
      useState(
        true,
      );
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

    // Handle Email Auth inside Modal
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
                role: authModalRole,
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
              // THE FIX: If they are registering OR explicitly flagged as incomplete, go to biodata.
              // Otherwise, default to dashboard. This prevents the infinite redirect trap.
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

    // Handle Web3 MetaMask Auth inside Modal
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
                  {
                    walletAddress,
                    signature,
                    role:
                      authModalRole ||
                      "fan",
                  },
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
              // THE FIX: Same protective logic for Web3 users.
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

    return (
      <div className="min-h-screen bg-nippy-onyx flex flex-col font-sans relative text-slate-200">
        {/* Navbar */}
        <header className="flex justify-between items-center py-6 px-10 border-b border-gray-800 bg-nippy-obsidian/50 backdrop-blur-md sticky top-0 z-40">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() =>
              navigate(
                "/feed",
              )
            }
          >
            <div className="w-10 h-10 bg-gradient-to-tr from-nippy-coral to-nippy-coralHover rounded-lg flex items-center justify-center shadow-lg shadow-nippy-coral/20">
              <span className="text-white font-bold text-2xl italic tracking-tighter">
                n
              </span>
            </div>
            <span className="text-nippy-blush font-bold text-2xl tracking-tight">
              nippy
              <span className="text-nippy-coral">
                .
              </span>
            </span>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setAuthModalRole(
                  "fan",
                );
                setIsLogin(
                  true,
                );
              }}
              className="px-6 py-2 rounded-full text-nippy-blush font-medium hover:text-nippy-coral transition-colors"
            >
              Log
              In
            </button>
            <button
              onClick={() => {
                setAuthModalRole(
                  "creator",
                );
                setIsLogin(
                  false,
                );
              }}
              className="px-6 py-2 rounded-full bg-nippy-coral text-white font-bold hover:bg-nippy-coralHover transition-colors shadow-lg shadow-nippy-coral/20"
            >
              Get
              Started
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full px-6 py-12 gap-8 items-center justify-center">
          {/* Fan Pitch */}
          <div className="flex-1 bg-nippy-obsidian p-10 rounded-3xl border border-gray-800 hover:border-nippy-coral/30 transition-colors group">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-6 group-hover:bg-nippy-coral/10 transition-colors">
              <PlayCircle
                className="text-nippy-blush group-hover:text-nippy-coral"
                size={
                  24
                }
              />
            </div>
            <h2 className="text-4xl font-bold text-nippy-blush mb-4 leading-tight">
              Unlock
              Moments
              with{" "}
              <br />{" "}
              Your
              Favorite
              Creators.
            </h2>
            <p className="text-gray-400 mb-8 text-lg">
              Connect,
              support,
              and
              enjoy
              exclusive
              high-quality
              content
              directly
              from
              top
              African
              creators.
              Private
              streams,
              PPV,
              and
              audio
              drops.
            </p>
            <button
              onClick={() => {
                setAuthModalRole(
                  "fan",
                );
                setIsLogin(
                  true,
                );
              }}
              className="w-full sm:w-auto px-8 py-4 bg-gray-800 text-nippy-blush font-bold rounded-full hover:bg-gray-700 transition-colors"
            >
              Explore
              Content
              (Fan)
            </button>
          </div>

          {/* Creator Pitch */}
          <div className="flex-1 bg-gradient-to-br from-nippy-obsidian to-gray-900 p-10 rounded-3xl border border-gray-800 hover:border-nippy-mint/30 transition-colors group relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-nippy-mint/5 rounded-full blur-3xl"></div>
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-6 group-hover:bg-nippy-mint/10 transition-colors relative z-10">
              <Wallet
                className="text-nippy-blush group-hover:text-nippy-mint"
                size={
                  24
                }
              />
            </div>
            <h2 className="text-4xl font-bold text-nippy-blush mb-4 leading-tight relative z-10">
              Keep
              up
              to
              85%
              of
              your
              earnings.
              Paid
              in
              USDT.
            </h2>
            <p className="text-gray-400 mb-8 text-lg relative z-10">
              No
              bank
              freezes.
              No
              rolling
              reserves.
              Instant
              Web3
              payouts
              and
              total
              ownership
              of
              your
              Nigerian
              &
              global
              audience.
            </p>
            <button
              onClick={() => {
                setAuthModalRole(
                  "creator",
                );
                setIsLogin(
                  false,
                );
              }}
              className="w-full sm:w-auto px-8 py-4 bg-nippy-coral text-white font-bold rounded-full hover:bg-nippy-coralHover shadow-lg shadow-nippy-coral/20 transition-all relative z-10"
            >
              Get
              Started
              (Creator)
            </button>
          </div>
        </main>

        {/* Unified Authentication Modal Overlay */}
        {authModalRole && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 relative shadow-2xl animate-in fade-in zoom-in duration-200">
              <button
                onClick={() =>
                  setAuthModalRole(
                    null,
                  )
                }
                className="absolute top-6 right-6 text-slate-400 hover:text-white"
              >
                <X
                  size={
                    24
                  }
                />
              </button>

              <div className="mb-6">
                <span className="text-xs uppercase tracking-widest text-nippy-coral font-bold block mb-1">
                  Portal:{" "}
                  {authModalRole.toUpperCase()}
                </span>
                <h3 className="text-2xl font-bold text-white">
                  {isLogin
                    ? "Welcome Back"
                    : "Create Account"}
                </h3>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4 text-sm">
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
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-nippy-coral"
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
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-nippy-coral"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    loading
                  }
                  className="w-full bg-nippy-coral hover:bg-nippy-coralHover text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {loading
                    ? "Processing..."
                    : isLogin
                      ? "Sign In"
                      : "Register Account"}
                  {!loading && (
                    <ArrowRight
                      size={
                        18
                      }
                    />
                  )}
                </button>
              </form>

              <div className="my-6 flex items-center text-slate-600 text-xs before:flex-1 before:border-t before:border-slate-800 before:mr-3 after:flex-1 after:border-t after:border-slate-800 after:ml-3">
                OR
                CONNECT
                WEB3
                WALLET
              </div>

              <button
                onClick={
                  handleWeb3Auth
                }
                disabled={
                  loading
                }
                className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-3"
              >
                <Wallet
                  size={
                    20
                  }
                  className="text-emerald-400"
                />
                Continue
                with
                MetaMask
              </button>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() =>
                    setIsLogin(
                      !isLogin,
                    )
                  }
                  className="text-sm text-nippy-coral hover:underline"
                >
                  {isLogin
                    ? "Need an account? Sign up"
                    : "Already have an account? Log in"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-gray-800 mt-auto py-12 px-10 bg-nippy-onyx">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex flex-col items-center md:items-start gap-2">
              <span className="text-nippy-blush font-bold text-xl tracking-tight">
                nippy
                <span className="text-nippy-coral">
                  .
                </span>
              </span>
              <span className="text-gray-500 text-sm">
                ©2026
                Nippy
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Secure
              Web3
              Creator
              Monetization
              Platform.
              18
              U.S.C.
              §
              2257
              Compliant.
            </div>
          </div>
        </footer>
      </div>
    );
  };

export default LandingPage;
