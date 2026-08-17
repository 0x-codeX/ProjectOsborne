import React, {
  useState,
  useEffect,
} from "react";
import axios from "axios";
import {
  Search,
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Inbox,
  CheckSquare,
} from "lucide-react";

const SupportDesk =
  () => {
    const [
      tickets,
      setTickets,
    ] =
      useState(
        [],
      );
    const [
      selectedTicket,
      setSelectedTicket,
    ] =
      useState(
        null,
      );
    const [
      replyMessage,
      setReplyMessage,
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
      );
    const [
      filter,
      setFilter,
    ] =
      useState(
        "OPEN",
      ); // Tracks which tab is active

    useEffect(() => {
      fetchTickets();
    }, []);

    const fetchTickets =
      async () => {
        try {
          const token =
            localStorage.getItem(
              "nippy_admin_token",
            );

          // IRONCLAD: Hardcoded absolute URL to bypass Vite proxy issues
          const res =
            await axios.get(
              "http://localhost:5000/api/admin/tickets",
              {
                headers:
                  {
                    Authorization: `Bearer ${token}`,
                  },
              },
            );

          console.log(
            "🟢 RAW BACKEND DATA:",
            res.data,
          ); // Check your browser console

          // Safety check to ensure React doesn't crash if it receives an HTML string
          if (
            Array.isArray(
              res.data,
            )
          ) {
            setTickets(
              res.data,
            );
          } else {
            console.error(
              "🔴 ERROR: Expected an array but got:",
              typeof res.data,
            );
            setTickets(
              [],
            );
          }
        } catch (error) {
          console.error(
            "🔴 Failed to fetch tickets:",
            error,
          );
        }
      };

    const handleReplySubmit =
      async (
        e,
      ) => {
        e.preventDefault();
        if (
          !replyMessage.trim() ||
          !selectedTicket ||
          !selectedTicket.email
        )
          return;

        setStatus(
          "loading",
        );
        try {
          const token =
            localStorage.getItem(
              "nippy_admin_token",
            );

          // IRONCLAD: Hardcoded absolute URL
          await axios.post(
            "http://localhost:5000/api/admin/support/reply",
            {
              ticketId:
                selectedTicket._id,
              userEmail:
                selectedTicket.email,
              subject: `Re: ${selectedTicket.subject}`,
              replyBody:
                replyMessage,
            },
            {
              headers:
                {
                  Authorization: `Bearer ${token}`,
                },
            },
          );

          setStatus(
            "success",
          );
          setReplyMessage(
            "",
          );

          // Instantly update the UI so the ticket moves to the "RESOLVED" tab
          setTickets(
            (
              prev,
            ) =>
              prev.map(
                (
                  t,
                ) =>
                  t._id ===
                  selectedTicket._id
                    ? {
                        ...t,
                        status:
                          "RESOLVED",
                      }
                    : t,
              ),
          );

          setTimeout(
            () => {
              setStatus(
                "idle",
              );
              setSelectedTicket(
                null,
              );
            },
            2000,
          );
        } catch (error) {
          console.error(
            "Reply failed:",
            error,
          );
          setStatus(
            "error",
          );
        }
      };

    const filteredTickets =
      tickets.filter(
        (
          t,
        ) =>
          t.status ===
          filter,
      );

    return (
      <div className="h-full flex gap-6">
        {/* --- TICKET LIST PANE --- */}
        <div className="w-1/3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex gap-4">
            <button
              onClick={() =>
                setFilter(
                  "OPEN",
                )
              }
              className={`flex items-center gap-2 text-sm font-bold pb-1 border-b-2 transition-colors ${filter === "OPEN" ? "border-[#FF5757] text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}
            >
              <Inbox
                size={
                  16
                }
              />{" "}
              Open
            </button>
            <button
              onClick={() =>
                setFilter(
                  "RESOLVED",
                )
              }
              className={`flex items-center gap-2 text-sm font-bold pb-1 border-b-2 transition-colors ${filter === "RESOLVED" ? "border-emerald-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}
            >
              <CheckSquare
                size={
                  16
                }
              />{" "}
              Resolved
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredTickets.length ===
            0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                <Mail
                  size={
                    32
                  }
                  className="mb-2"
                />
                <p className="text-sm">
                  No{" "}
                  {filter.toLowerCase()}{" "}
                  tickets.
                </p>
              </div>
            ) : (
              filteredTickets.map(
                (
                  ticket,
                ) => (
                  <button
                    key={
                      ticket._id
                    }
                    onClick={() => {
                      setSelectedTicket(
                        ticket,
                      );
                      setStatus(
                        "idle",
                      );
                    }}
                    className={`w-full text-left p-4 rounded-xl transition-all border ${
                      selectedTicket?._id ===
                      ticket._id
                        ? "bg-slate-800 border-slate-700 shadow-lg"
                        : "bg-transparent border-transparent hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm text-white truncate pr-2">
                        {ticket.name ||
                          "Unknown User"}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0">
                        <Clock
                          size={
                            10
                          }
                        />{" "}
                        {new Date(
                          ticket.createdAt,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {
                        ticket.subject
                      }
                    </p>
                    {!ticket.email && (
                      <span className="inline-block mt-2 text-[9px] uppercase tracking-wider font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded">
                        Missing
                        Email
                      </span>
                    )}
                  </button>
                ),
              )
            )}
          </div>
        </div>

        {/* --- TICKET DETAILS & REPLY PANE --- */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
          {selectedTicket ? (
            <>
              <div className="p-6 border-b border-slate-800">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">
                      {
                        selectedTicket.subject
                      }
                    </h2>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="bg-slate-800 px-3 py-1 rounded text-slate-300 font-medium border border-slate-700">
                        {selectedTicket.email ||
                          "No email provided"}
                      </span>
                      <span
                        className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded ${selectedTicket.status === "RESOLVED" ? "bg-emerald-500/10 text-emerald-500" : "bg-[#FF5757]/10 text-[#FF5757]"}`}
                      >
                        {
                          selectedTicket.status
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                  {
                    selectedTicket.message
                  }
                </div>
              </div>

              <div className="p-6 border-t border-slate-800 bg-slate-900/50">
                {!selectedTicket.email ? (
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle
                      className="text-red-500"
                      size={
                        24
                      }
                    />
                    <div>
                      <p className="text-red-400 text-sm font-bold">
                        Cannot
                        Reply
                        to
                        Ticket
                      </p>
                      <p className="text-red-500/70 text-xs mt-0.5">
                        This
                        user's
                        data
                        is
                        missing
                        an
                        email
                        address.
                        You
                        cannot
                        send
                        them
                        a
                        response.
                      </p>
                    </div>
                  </div>
                ) : selectedTicket.status ===
                  "RESOLVED" ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3">
                    <CheckCircle
                      className="text-emerald-500"
                      size={
                        24
                      }
                    />
                    <div>
                      <p className="text-emerald-500 text-sm font-bold">
                        Ticket
                        Resolved
                      </p>
                      <p className="text-emerald-500/70 text-xs mt-0.5">
                        An
                        email
                        response
                        was
                        already
                        sent
                        to
                        this
                        user.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={
                      handleReplySubmit
                    }
                    className="flex flex-col gap-3"
                  >
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Reply
                      via
                      Email
                    </label>
                    <textarea
                      value={
                        replyMessage
                      }
                      onChange={(
                        e,
                      ) =>
                        setReplyMessage(
                          e
                            .target
                            .value,
                        )
                      }
                      placeholder={`Type your response here. It will be emailed directly to ${selectedTicket.email}...`}
                      rows="4"
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF5757] resize-none"
                      required
                    ></textarea>

                    <div className="flex justify-between items-center mt-2">
                      <div className="text-sm">
                        {status ===
                          "success" && (
                          <span className="text-emerald-500 flex items-center gap-1 font-bold animate-pulse">
                            <CheckCircle
                              size={
                                16
                              }
                            />{" "}
                            Email
                            Sent
                          </span>
                        )}
                        {status ===
                          "error" && (
                          <span className="text-red-500 flex items-center gap-1 font-bold">
                            <AlertCircle
                              size={
                                16
                              }
                            />{" "}
                            Failed
                            to
                            send
                            email
                          </span>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={
                          status ===
                          "loading"
                        }
                        className="bg-[#FF5757] hover:bg-rose-600 text-white font-bold py-2.5 px-6 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-[#FF5757]/20"
                      >
                        {status ===
                        "loading" ? (
                          "Sending..."
                        ) : (
                          <>
                            <Send
                              size={
                                16
                              }
                            />{" "}
                            Send
                            Email
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-30">
              <Mail
                size={
                  64
                }
                className="mb-4"
              />
              <p className="font-medium text-lg">
                Select
                a
                ticket
                to
                view
                and
                reply
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

export default SupportDesk;
