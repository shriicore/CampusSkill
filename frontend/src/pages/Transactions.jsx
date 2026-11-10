import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { RefundModal } from '../components/payment/RefundModal';
import {
  CreditCard,
  Receipt,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export function Transactions() {
  const { user, isAdmin } = useAuth();
  const { success, error } = useToast();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedTxForRefund, setSelectedTxForRefund] = useState(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.getTransactions();
      setTransactions(res.transactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">PAID & VERIFIED</Badge>;
      case 'pending':
        return <Badge variant="warning">PENDING</Badge>;
      case 'processing':
        return <Badge variant="warning">PROCESSING</Badge>;
      case 'refund_pending':
        return <Badge variant="warning">REFUND PENDING</Badge>;
      case 'refunded':
        return <Badge variant="neutral">REFUNDED</Badge>;
      case 'failed':
        return <Badge variant="danger">FAILED</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">CANCELLED</Badge>;
      default:
        return <Badge variant="neutral">{status.toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payment & Transaction History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Authoritative ledger of session payments processed via Razorpay gateway in Indian Rupees (INR).
          </p>
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="card text-center py-10">
          <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No payment transactions recorded yet.</p>
          <p className="text-xs text-slate-400 mt-1">
            Paid learning sessions will appear here with cryptographic signatures and receipts.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/60 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Tx ID & Date</th>
                  <th className="py-3 px-4">Session & Topic</th>
                  <th className="py-3 px-4">Participants</th>
                  <th className="py-3 px-4">Amount (INR)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {transactions.map((tx) => {
                  const isPayer = user?.id === tx.payer_id;
                  const canRefund = isPayer && tx.status === 'paid';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-800">#{tx.id}</div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(tx.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{tx.session_title}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Order: {tx.gateway_order_id}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-700">
                          <span className="text-slate-400">From:</span> {tx.payer_name}
                        </div>
                        <div className="text-slate-700">
                          <span className="text-slate-400">To:</span> {tx.payee_name}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                        ₹{tx.amount_inr?.toFixed(2)}
                      </td>

                      <td className="py-3 px-4">{getStatusBadge(tx.status)}</td>

                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedReceipt(tx)}
                          className="btn-secondary text-[11px] py-1 px-2.5 inline-flex items-center gap-1"
                          title="View verified receipt"
                        >
                          <Receipt className="w-3.5 h-3.5 text-slate-500" /> Receipt
                        </button>

                        {canRefund && (
                          <button
                            onClick={() => setSelectedTxForRefund(tx)}
                            className="btn-secondary text-[11px] py-1 px-2.5 inline-flex items-center gap-1 text-rose-600 hover:bg-rose-50 border-rose-200"
                            title="Request refund"
                          >
                            <RotateCcw className="w-3 h-3" /> Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      <Modal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        title="Payment Receipt & Audit Record"
      >
        {selectedReceipt && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-slate-500">Transaction Reference</span>
                <span className="font-mono font-bold text-slate-900">TXN-00{selectedReceipt.id}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-slate-500">Gateway Provider</span>
                <span className="font-semibold text-slate-800 uppercase">Razorpay (India)</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-slate-500">Gateway Order ID</span>
                <span className="font-mono text-slate-700">{selectedReceipt.gateway_order_id}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-slate-500">Gateway Payment ID</span>
                <span className="font-mono text-slate-700">
                  {selectedReceipt.gateway_payment_id || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-slate-500">Payer Student</span>
                <span className="font-semibold text-slate-800">{selectedReceipt.payer_name}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-slate-500">Beneficiary Mentor</span>
                <span className="font-semibold text-slate-800">{selectedReceipt.payee_name}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-slate-500">Session Description</span>
                <span className="font-semibold text-slate-800">{selectedReceipt.session_title}</span>
              </div>
              <div className="flex items-center justify-between pt-1 text-sm font-bold">
                <span className="text-slate-900">Total Settled</span>
                <span className="text-emerald-700">₹{selectedReceipt.amount_inr?.toFixed(2)} INR</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 bg-emerald-50/60 border border-emerald-100 p-3 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Verified via cryptographic HMAC-SHA256 signature against authoritative gateway records.
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="btn-primary w-full"
              >
                Close Receipt
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Refund Request Modal */}
      <RefundModal
        isOpen={!!selectedTxForRefund}
        onClose={() => setSelectedTxForRefund(null)}
        transaction={selectedTxForRefund}
        onRefundSubmitted={() => {
          fetchTransactions();
        }}
      />
    </div>
  );
}
