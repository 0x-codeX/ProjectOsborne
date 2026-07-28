// client/src/components/LandingPage.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  PlayCircle,
  Wallet,
} from "lucide-react";

const LandingPage =
  () => {
    const navigate =
      useNavigate();

    return (
      <div className="min-h-screen bg-nippy-onyx flex flex-col font-sans">
        {/* Navbar */}
        <header className="flex justify-between items-center py-6 px-10 border-b border-gray-800 bg-nippy-obsidian/50 backdrop-blur-md sticky top-0 z-50">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() =>
              navigate(
                "/home",
              )
            }
          >
            {/* Fluid N Logo Representation */}
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
              onClick={() =>
                navigate(
                  "/auth/login",
                )
              }
              className="px-6 py-2 rounded-full text-nippy-blush font-medium hover:text-nippy-coral transition-colors"
            >
              Log
              In
            </button>
            <button
              onClick={() =>
                navigate(
                  "/auth/login",
                )
              }
              className="px-6 py-2 rounded-full bg-nippy-coral text-white font-bold hover:bg-nippy-coralHover transition-colors shadow-lg shadow-nippy-coral/20"
            >
              Sign
              Up
            </button>
          </div>
        </header>

        {/* Hero Section - Split View */}
        <main className="flex-grow flex flex-col md:flex-row max-w-7xl mx-auto w-full px-6 py-12 gap-8 items-center justify-center">
          {/* Left Side: Fan Pitch */}
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
              <br />
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
              onClick={() =>
                navigate(
                  "/auth/login",
                )
              }
              className="w-full sm:w-auto px-8 py-4 bg-gray-800 text-nippy-blush font-bold rounded-full hover:bg-gray-700 transition-colors"
            >
              Explore
              Content
              (Fan)
            </button>
          </div>

          {/* Right Side: Creator Pitch */}
          <div className="flex-1 bg-gradient-to-br from-nippy-obsidian to-gray-900 p-10 rounded-3xl border border-gray-800 hover:border-nippy-mint/30 transition-colors group relative overflow-hidden">
            {/* subtle glow effect */}
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
              onClick={() =>
                navigate(
                  "/auth/creator/kyc",
                )
              }
              className="w-full sm:w-auto px-8 py-4 bg-nippy-coral text-white font-bold rounded-full hover:bg-nippy-coralHover shadow-lg shadow-nippy-coral/20 transition-all relative z-10"
            >
              Get
              Started
              (Creator)
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-800 mt-auto py-12 px-10 bg-nippy-onyx">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
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

            <div className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-4 text-sm text-gray-400">
              <div className="flex flex-col gap-2 text-center md:text-left">
                <a
                  href="#"
                  className="hover:text-nippy-coral transition-colors"
                >
                  About
                  Us
                </a>
                <a
                  href="#"
                  className="hover:text-nippy-coral transition-colors"
                >
                  Brand
                  Guidelines
                </a>
                <a
                  href="#"
                  className="hover:text-nippy-coral transition-colors"
                >
                  Help
                  &
                  Support
                </a>
              </div>
              <div className="flex flex-col gap-2 text-center md:text-left">
                <a
                  href="#"
                  className="hover:text-nippy-coral transition-colors"
                >
                  Terms
                  and
                  Condition
                </a>
                <a
                  href="#"
                  className="hover:text-nippy-coral transition-colors"
                >
                  Our
                  Privacy
                  Policy
                </a>
                <a
                  href="#"
                  className="hover:text-nippy-coral transition-colors"
                >
                  Disclosure
                  Statement
                </a>
              </div>
              <div className="flex flex-col gap-2 text-center md:text-left">
                <a
                  href="#"
                  className="hover:text-nippy-coral transition-colors"
                >
                  Earnings
                  and
                  Payouts
                </a>
                <a
                  href="#"
                  className="hover:text-nippy-coral transition-colors"
                >
                  Complaints
                  Policy
                </a>
                <a
                  href="#"
                  className="hover:text-nippy-coral transition-colors"
                >
                  Content
                  Monitor
                  Policy
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  };

export default LandingPage;
