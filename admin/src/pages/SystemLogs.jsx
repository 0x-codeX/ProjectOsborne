import React, {
  useState,
  useEffect,
} from "react";
import api from "../utils/api";
import {
  Activity,
  Search,
  Clock,
  ShieldAlert,
  User,
  ShieldCheck,
} from "lucide-react";

const SystemLogs =
  () => {
    const [
      logs,
      setLogs,
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
      searchQuery,
      setSearchQuery,
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

    useEffect(() => {
      fetchLogs();
    }, []);

    const fetchLogs =
      async () => {
        try {
          setIsLoading(
            true,
          );
          const res =
            await api.get(
              "/admin/logs",
            );
          setLogs(
            res.data,
          );
        } catch (err) {
          setError(
            err
              .response
              ?.data
              ?.message ||
              "Failed to load system logs.",
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      };

    const filteredLogs =
      logs.filter(
        (
          log,
        ) => {
          const searchStr =
            searchQuery.toLowerCase();
          return (
            log.action
              .toLowerCase()
              .includes(
                searchStr,
              ) ||
            log.admin?.username
              ?.toLowerCase()
              .includes(
                searchStr,
              ) ||
            log.targetUser?.username
              ?.toLowerCase()
              .includes(
                searchStr,
              ) ||
            log.details
              ?.toLowerCase()
              .includes(
                searchStr,
              )
          );
        },
      );

    // Helper to color-code action types
    const getActionBadge =
      (
        action,
      ) => {
        if (
          action.includes(
            "APPROVED",
          ) ||
          action.includes(
            "RESOLVED",
          )
        ) {
          return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
        }
        if (
          action.includes(
            "SUSPEND",
          ) ||
          action.includes(
            "REJECTED",
          ) ||
          action.includes(
            "DELETE",
          )
        ) {
          return "bg-red-500/10 text-red-400 border-red-500/20";
        }
        if (
          action.includes(
            "MANUAL",
          ) ||
          action.includes(
            "ACCESS",
          )
        ) {
          return "bg-amber-500/10 text-amber-400 border-amber-500/20";
        }
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      };

    return (
      <div className="flex flex-col h-full space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="text-blue-400" />{" "}
              System
              Audit
              Logs
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Immutable
              record
              of
              administrative
              actions
              and
              access
              overrides.
            </p>
          </div>

          {/* SEARCH FILTER */}
          <div className="relative w-full md:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={
                18
              }
            />
            <input
              type="text"
              placeholder="Search logs, admins, or users..."
              value={
                searchQuery
              }
              onChange={(
                e,
              ) =>
                setSearchQuery(
                  e
                    .target
                    .value,
                )
              }
              className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-blue-500 text-sm transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <ShieldAlert
              size={
                16
              }
            />{" "}
            {
              error
            }
          </div>
        )}

        {/* LOGS TABLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl flex-1 overflow-hidden flex flex-col shadow-xl">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 font-mono gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              Decrypting
              Logs...
            </div>
          ) : (
            <div className="overflow-x-auto">
              {filteredLogs.length >
              0 ? (
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-950 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">
                        Timestamp
                      </th>
                      <th className="px-6 py-4">
                        Admin
                        (Actor)
                      </th>
                      <th className="px-6 py-4">
                        Action
                        Taken
                      </th>
                      <th className="px-6 py-4">
                        Target
                        User
                      </th>
                      <th className="px-6 py-4">
                        System
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredLogs.map(
                      (
                        log,
                      ) => (
                        <tr
                          key={
                            log._id
                          }
                          className="hover:bg-slate-800/20 transition-colors group"
                        >
                          {/* TIMESTAMP */}
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <Clock
                                size={
                                  12
                                }
                                className="text-slate-500"
                              />
                              {new Date(
                                log.createdAt,
                              ).toLocaleString()}
                            </div>
                          </td>

                          {/* ADMIN */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <ShieldCheck
                                size={
                                  14
                                }
                                className="text-slate-500"
                              />
                              <span className="font-bold text-white group-hover:text-blue-400 transition-colors">
                                {log
                                  .admin
                                  ?.username ||
                                  "Unknown"}
                              </span>
                            </div>
                          </td>

                          {/* ACTION */}
                          <td className="px-6 py-4">
                            <span
                              className={`text-[10px] px-2 py-1 border rounded font-bold uppercase tracking-wide ${getActionBadge(log.action)}`}
                            >
                              {log.action.replace(
                                /_/g,
                                " ",
                              )}
                            </span>
                          </td>

                          {/* TARGET USER */}
                          <td className="px-6 py-4">
                            {log.targetUser ? (
                              <div className="flex items-center gap-2">
                                <User
                                  size={
                                    14
                                  }
                                  className="text-slate-500"
                                />
                                <span className="text-slate-300">
                                  {
                                    log
                                      .targetUser
                                      .username
                                  }
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-600 italic">
                                System
                                Scope
                              </span>
                            )}
                          </td>

                          {/* DETAILS */}
                          <td
                            className="px-6 py-4 text-slate-400 text-xs max-w-xs truncate"
                            title={
                              log.details
                            }
                          >
                            {log.details ||
                              "-"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  <Activity
                    size={
                      48
                    }
                    className="mx-auto mb-4 opacity-20"
                  />
                  <p>
                    No
                    audit
                    logs
                    found
                    matching
                    your
                    criteria.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

export default SystemLogs;
