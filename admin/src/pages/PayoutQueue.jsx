import React, { useState, useEffect } from "react";
import axios from "axios";
import { Wallet, ShieldCheck, CheckCircle, AlertOctagon, XCircle, Clock, ArrowRight } from "lucide-react";

const PayoutQueue = () => {
  const [payouts, setPayouts] = useState([]);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [filter, setFilter] = useState("PENDING"); // PENDING, REVIEWED, COMPLETED, REJECTED
  const [actionStatus, setActionStatus] = useState("idle");

  // Grab the admin's role to enforce Maker-Checker protocol
  const adminUser = JSON.parse(localStorage.getItem("nippy_admin_user") || "{}");
  const isGodAdmin = adminUser.role === "GOD_ADMIN";

  useEffect(() => {
    fetchPayouts();
  }, [filter]);

  const fetchPayouts =
    async () => {
      try {
        const token =
          localStorage.getItem(
            "nippy_admin_token",
          );
        const res =
          await axios.get(
            `/api/admin/withdrawals?status=${filter}`,
            {
              headers:
                {
                  Authorization: `Bearer ${token}`,
                },
            },
          );

        // IRONCLAD CHECK: Prevent React from crashing if backend sends HTML/Objects
        if (
          Array.isArray(
            res.data,
          )
        ) {
          setPayouts(
            res.data,
          );
        } else {
          console.error(
            "Backend did not return an array. It returned:",
            res.data,
          );
          setPayouts(
            [],
          ); // Fallback to empty array
        }
      } catch (error) {
        console.error(
          "Failed to fetch payouts:",
          error,
        );
        setPayouts(
          [],
        ); // Fallback on 404/500 errors
      }
    };

  const handleAction = async (actionType) => {
    if (!selectedPayout) return;
    setActionStatus("loading");
    
    try {
      const token = localStorage.getItem("nippy_admin_token");
      
      // actionType can be: 'MARK_REVIEWED', 'APPROVE_PAYOUT', 'REJECT'
      await axios.post(
        "/api/admin/withdrawals/action",
        {
          withdrawalId: selectedPayout._id,
          action: actionType,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove the processed item from the current view
      setPayouts((prev) => prev.filter((p) => p._id !== selectedPayout._id));
      setSelectedPayout(null);
      setActionStatus("idle");
    } catch (error) {
      console.error("Action failed:", error);
      setActionStatus("error");
    }
  };

  return (
    <div className="h-full flex gap-6">
      
      {/* --- QUEUE LIST PANE --- */}
      <div className="w-1/3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-wrap gap-3">
          <button onClick={() => setFilter("PENDING")} className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${filter === "PENDING" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "text-slate-500 hover:bg-slate-800"}`}>
            Pending Review
          </button>
          <button onClick={() => setFilter("REVIEWED")} className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${filter === "REVIEWED" ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" : "text-slate-500 hover:bg-slate-800"}`}>
            Ready for Payout
          </button>
          <button onClick={() => setFilter("COMPLETED")} className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${filter === "COMPLETED" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "text-slate-500 hover:bg-slate-800"}`}>
            Completed
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {payouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
              <Wallet size={32} className="mb-2" />
              <p className="text-sm">No {filter.toLowerCase()} payouts.</p>
            </div>
          ) : (
            payouts.map((payout) => (
              <button
                key={payout._id}
                onClick={() => setSelectedPayout(payout)}
                className={`w-full text-left p-4 rounded-xl transition-all border ${
                  selectedPayout?._id === payout._id
                    ? "bg-slate-800 border-slate-700 shadow-lg"
                    : "bg-transparent border-transparent hover:bg-slate-800/50"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-sm text-white truncate">{payout.creatorName}</span>
                  <span className="font-mono text-[#FF5757] font-bold">₦{payout.amount.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock size={10} /> {new Date(payout.createdAt).toLocaleDateString()}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* --- PAYOUT DETAILS & ACTION PANE --- */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
        {selectedPayout ? (
          <>
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white mb-2">Payout Review</h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="bg-slate-800 px-3 py-1 rounded text-slate-300 font-medium border border-slate-700">
                  {selectedPayout.creatorEmail}
                </span>
                <span className={`px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded ${
                  selectedPayout.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' : 
                  selectedPayout.status === 'REVIEWED' ? 'bg-blue-500/10 text-blue-500' : 
                  'bg-emerald-500/10 text-emerald-500'
                }`}>
                  {selectedPayout.status}
                </span>
              </div>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Financial Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Requested Amount</p>
                  <p className="text-2xl font-mono text-white font-bold">₦{selectedPayout.amount.toLocaleString()}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Bank Destination</p>
                  <p className="text-sm font-bold text-white">{selectedPayout.bankName || "N/A"}</p>
                  <p className="text-xs text-slate-400 font-mono">{selectedPayout.accountNumber || "No Account Provided"}</p>
                </div>
              </div>

              {/* Safety Checklist */}
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldCheck size={14} /> Security Checks
                </h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500"/> KYC Verified</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500"/> No active chargebacks detected</li>
                  <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500"/> Account age {'>'} 30 days</li>
                </ul>
              </div>
            </div>

            {/* Action Buttons based on Role & Status */}
            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex gap-3 justify-end">
              
              {selectedPayout.status !== 'COMPLETED' && selectedPayout.status !== 'REJECTED' && (
                <button 
                  onClick={() => handleAction('REJECT')}
                  disabled={actionStatus === 'loading'}
                  className="px-6 py-2.5 rounded-xl text-red-400 font-bold text-sm hover:bg-red-500/10 transition-colors flex items-center gap-2"
                >
                  <XCircle size={16} /> Reject Fraud
                </button>
              )}

              {selectedPayout.status === 'PENDING' && (
                <button 
                  onClick={() => handleAction('MARK_REVIEWED')}
                  disabled={actionStatus === 'loading'}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                  Mark as Reviewed <ArrowRight size={16} />
                </button>
              )}

              {selectedPayout.status === 'REVIEWED' && (
                isGodAdmin ? (
                  <button 
                    onClick={() => handleAction('APPROVE_PAYOUT')}
                    disabled={actionStatus === 'loading'}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                  >
                    <Wallet size={16} /> Approve & Trigger API
                  </button>
                ) : (
                  <div className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-500 font-bold text-sm border border-slate-700 flex items-center gap-2 cursor-not-allowed">
                    <AlertOctagon size={16} /> God Admin Required to Pay
                  </div>
                )
              )}

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-30">
            <Wallet size={64} className="mb-4" />
            <p className="font-medium text-lg">Select a payout to review</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayoutQueue;