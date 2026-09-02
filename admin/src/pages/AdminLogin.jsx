import React, {
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import {
  ShieldCheck,
  Loader2,
} from "lucide-react";

const AdminLogin =
  () => {
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
      status,
      setStatus,
    ] =
      useState(
        "idle",
      ); // idle, loading, error
    const [
      errorMessage,
      setErrorMessage,
    ] =
      useState(
        "",
      );
    const navigate =
      useNavigate();

    const handleLogin =
      async (
        e,
      ) => {
        e.preventDefault();
        setStatus(
          "loading",
        );
        setErrorMessage(
          "",
        );

        try {
          const res =
            await api.post(
              "/auth/login",
              {
                email,
                password,
              },
            );

          const data =
            res.data;
          const token =
            data.token;

          // Handle both nested { user: {...} } and flat { _id, email, role } backend structures
          const userObj =
            data.user || {
              _id: data._id,
              email:
                data.email,
              role: data.role,
            };

          // IRONCLAD CHECK
          if (
            userObj.role !==
              "GOD_ADMIN" &&
            userObj.role !==
              "SUPER_ADMIN" &&
            userObj.role !==
              "MODERATE_ADMIN"
          ) {
            setStatus(
              "error",
            );
            setErrorMessage(
              "Unauthorized. This incident has been logged.",
            );
            return;
          }

          // Store in isolated Admin keys
          localStorage.setItem(
            "nippy_admin_token",
            token,
          );
          localStorage.setItem(
            "nippy_admin_user",
            JSON.stringify(
              userObj,
            ),
          );

          navigate(
            "/",
          );
        } catch (error) {
          console.error(
            error,
          ); // Log the actual error to the console just in case
          setStatus(
            "error",
          );
          setErrorMessage(
            error
              .response
              ?.data
              ?.message ||
              "Authentication failed.",
          );
        }
      };

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-[#FF5757]/10 rounded-full border border-[#FF5757]/20">
              <ShieldCheck className="w-12 h-12 text-[#FF5757]" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-white mb-2">
            Restricted
            Access
          </h2>
          <p className="text-slate-400 text-center text-sm mb-8">
            Nippy
            Administrative
            Command
            Center
          </p>

          <form
            onSubmit={
              handleLogin
            }
            className="space-y-5"
          >
            {status ===
              "error" && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center font-mono">
                {
                  errorMessage
                }
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Admin
                Email
              </label>
              <input
                type="email"
                required
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
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5757]"
                placeholder="commander@nippy.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Clearance
                Password
              </label>
              <input
                type="password"
                required
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
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FF5757]"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={
                status ===
                "loading"
              }
              className="w-full bg-[#FF5757] hover:bg-rose-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center mt-4 disabled:opacity-50"
            >
              {status ===
              "loading" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Authorize Override"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  };

export default AdminLogin;
