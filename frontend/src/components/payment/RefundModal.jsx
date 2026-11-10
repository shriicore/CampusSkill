import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function RefundModal({ isOpen, onClose, transaction, onRefundSubmitted }) {
  const { success, error } = useToast();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!transaction) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      error('Please provide a reason for the refund request.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.requestRefund({
        transaction_id: transaction.id,
        reason: reason.trim(),
      });
      success(res.message || 'Refund request submitted for review.');
      setReason('');
      onClose();
      if (onRefundSubmitted) onRefundSubmitted();
    } catch (err) {
      error(err.message || 'Failed to submit refund request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Session Refund">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-600 space-y-1">
          <div>
            <span className="font-semibold text-slate-700">Transaction ID:</span> #{transaction.id}
          </div>
          <div>
            <span className="font-semibold text-slate-700">Session:</span> {transaction.session_title}
          </div>
          <div>
            <span className="font-semibold text-slate-700">Refundable Amount:</span> ₹{transaction.amount_inr?.toFixed(2)} INR
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason for Refund <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please detail why you are requesting a refund (e.g. mentor absent, emergency cancellation)..."
            className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-danger flex items-center gap-2"
          >
            {submitting ? 'Submitting...' : 'Submit Refund Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
