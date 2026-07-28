// client/src/components/AuthPage.jsx
import React, {
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { ethers } from "ethers";

const AuthPage =
  () => {
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
      role,
      setRole,
    ] =
      useState(
        "fan",
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

    const navigate =
      useNavigate();

    const handleSubmit =
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
                role,
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

            // Extract user gracefully depending on how backend structures it
            const userObj =
              data.user ||
              data;
            localStorage.setItem(
              "nippy_user",
              JSON.stringify(
                userObj,
              ),
            );

            // PROFESSIONAL ROUTING LOGIC
            if (
              userObj.role ===
              "creator"
            ) {
              if (
                isLogin
              ) {
                // Returning user goes straight to dashboard
                navigate(
                  "/creator/dashboard",
                );
              } else {
                // Brand new registration goes to Bio Data collection
                navigate(
                  "/auth/creator/biodata",
                );
              }
            } else {
              navigate(
                "/home",
              ); // Fans go to home
            }
          } else {
            setError(
              data.message ||
                "Authentication failed",
            );
          }
        } catch (err) {
          setError(
            "Server connection error. Ensure the backend is running.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      };

    const handleWeb3Login =
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

          // 1. Get Wallet Address
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

          await Promise.race(
            [
              provider.getNetwork(),
              new Promise(
                (
                  _,
                  reject,
                ) =>
                  setTimeout(
                    () =>
                      reject(
                        new Error(
                          "Wallet connection timed out.",
                        ),
                      ),
                    5000,
                  ),
              ),
            ],
          );

          const signer =
            await provider.getSigner();
          const walletAddress =
            await signer.getAddress();

          // 2. Fetch Nonce
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
            nonceData.message;

          // 3. Request Signature
          const signature =
            await signer.signMessage(
              serverMessage,
            );

          // 4. Validate with Backend
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
                    role,
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

            // PROFESSIONAL WEB3 ROUTING LOGIC
            if (
              userObj.role ===
              "creator"
            ) {
              // Check the backend flag to see if this wallet is brand new
              if (
                data.isNewUser ||
                !userObj.hasCompletedBioData
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
              navigate(
                "/home",
              );
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
          if (
            err.code ===
            "ACTION_REJECTED"
          ) {
            setError(
              "You rejected the signature request in your wallet.",
            );
          } else {
            setError(
              err.message ||
                "Wallet connection failed.",
            );
          }
        } finally {
          setLoading(
            false,
          );
        }
      };

    return (
      <div className="min-h-screen bg-nippy-onyx flex items-center justify-center p-6 font-sans text-nippy-blush">
        <div className="max-w-4xl w-full bg-nippy-obsidian rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-gray-800">
          {/* Left Side: Value Proposition */}
          <div className="md:w-1/2 bg-gradient-to-br from-nippy-coral to-nippy-coralHover p-12 flex flex-col justify-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2"></div>

            <div className="relative z-10">
              <h2 className="text-4xl font-bold mb-6 leading-tight">
                {isLogin
                  ? "Welcome back to nippy."
                  : "Start your journey."}
              </h2>
              <p className="text-white/80 text-lg mb-8">
                {isLogin
                  ? "Sign in to access premium content, manage your USDT wallet, and support top African creators."
                  : "Join the highest-paying digital-first creator platform in West Africa. 100% privacy, instant crypto payouts."}
              </p>

              <div className="flex items-center gap-4 text-sm font-medium bg-white/20 p-4 rounded-xl border border-white/30 backdrop-blur-sm w-max shadow-lg">
                <Wallet
                  size={
                    20
                  }
                />
                <span>
                  USDT
                  Native
                  Escrow
                  &
                  Payouts
                </span>
              </div>
            </div>
          </div>

          {/* Right Side: The Authentication Form */}
          <div className="md:w-1/2 p-12 bg-nippy-obsidian flex flex-col justify-center relative">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {isLogin
                  ? "Log In"
                  : "Create Account"}
              </h3>
              <button
                onClick={() => {
                  setIsLogin(
                    !isLogin,
                  );
                  setError(
                    "",
                  );
                }}
                className="text-nippy-coral text-sm font-bold hover:text-white transition-colors"
              >
                {isLogin
                  ? "Need an account?"
                  : "Already have one?"}
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm flex items-center">
                {
                  error
                }
              </div>
            )}

            <form
              onSubmit={
                handleSubmit
              }
              className="flex flex-col gap-5"
            >
              {/* Conditional Role Selector */}
              <div className="flex gap-4 mb-2">
                <label
                  className={`flex-1 p-4 rounded-xl border cursor-pointer transition-all ${
                    role ===
                    "fan"
                      ? "border-nippy-coral bg-nippy-coral/10 text-white"
                      : "border-gray-700 text-gray-400 hover:border-gray-500 hover:bg-gray-800"
                  }`}
                >
                  <input
                    type="radio"
                    className="hidden"
                    name="role"
                    value="fan"
                    checked={
                      role ===
                      "fan"
                    }
                    onChange={() =>
                      setRole(
                        "fan",
                      )
                    }
                  />
                  <div className="font-bold text-center">
                    I'm
                    a
                    Fan
                  </div>
                </label>
                <label
                  className={`flex-1 p-4 rounded-xl border cursor-pointer transition-all ${
                    role ===
                    "creator"
                      ? "border-nippy-coral bg-nippy-coral/10 text-white"
                      : "border-gray-700 text-gray-400 hover:border-gray-500 hover:bg-gray-800"
                  }`}
                >
                  <input
                    type="radio"
                    className="hidden"
                    name="role"
                    value="creator"
                    checked={
                      role ===
                      "creator"
                    }
                    onChange={() =>
                      setRole(
                        "creator",
                      )
                    }
                  />
                  <div className="font-bold text-center">
                    I'm
                    a
                    Creator
                  </div>
                </label>
              </div>

              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                  size={
                    20
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
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-nippy-coral transition-colors"
                  required={
                    !isLogin
                  }
                />
              </div>

              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                  size={
                    20
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
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-nippy-coral transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={
                  loading
                }
                className="w-full bg-nippy-coral hover:bg-nippy-coralHover text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {loading
                  ? "Processing Authentication..."
                  : isLogin
                    ? "Access Account"
                    : "Create Account"}
                {!loading && (
                  <ArrowRight
                    size={
                      20
                    }
                  />
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center text-gray-500 text-sm before:flex-1 before:border-t before:border-gray-800 before:mr-4 after:flex-1 after:border-t after:border-gray-800 after:ml-4">
              OR
            </div>

            <button
              onClick={
                handleWeb3Login
              }
              className="w-full mt-6 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3"
            >
              <Wallet
                size={
                  20
                }
                className="text-nippy-mint"
              />
              Continue
              with
              Web3
              Wallet
            </button>

            <p className="text-xs text-center text-gray-600 mt-6 leading-relaxed">
              By
              authenticating,
              you
              agree
              to
              our
              Terms
              of
              Service
              and
              18
              U.S.C.
              §
              2257
              compliance
              guidelines.
            </p>
          </div>
        </div>
      </div>
    );
  };

export default AuthPage;
