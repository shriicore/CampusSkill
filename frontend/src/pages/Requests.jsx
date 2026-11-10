import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Inbox, Send, Check, X, Ban, Calendar } from 'lucide-react';

export function Requests() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent'
  const [requests, setRequests] = useState({ sent_requests: [], received_requests: [] });
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.getRequests('all');
      setRequests(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (reqId, newStatus) => {
    try {
      await api.updateRequestStatus(reqId, newStatus);
      success(`Request marked as '${newStatus}'.`);
      fetchRequests();
    } catch (err) {
      error(err.message || 'Status update failed.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="success">Accepted</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending Response</Badge>;
      case 'rejected':
        return <Badge variant="danger">Declined</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const currentList =
    activeTab === 'received' ? requests.received_requests : requests.sent_requests;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Learning Requests</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Review incoming student mentorship inquiries and track your outgoing requests.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('received')}
          className={`py-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'received'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Received Inquiries ({requests.received_requests.length})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`py-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'sent'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Send className="w-4 h-4" />
          Sent Requests ({requests.sent_requests.length})
        </button>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : currentList.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-sm text-slate-500">
            No {activeTab} requests at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((req) => (
            <div
              key={req.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-sm text-slate-900">
                    {activeTab === 'received' ? req.requester_name : `To: ${req.mentor_name}`}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {req.skill_name}
                  </span>
                  {getStatusBadge(req.status)}
                </div>

                <div className="text-xs text-slate-500">
                  {activeTab === 'received' ? req.requester_department : req.mentor_department} • Mode:{' '}
                  <span className="capitalize font-medium text-slate-700">{req.preferred_mode}</span> • Sent:{' '}
                  {new Date(req.created_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>

                {req.message && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-w-2xl mt-1">
                    "{req.message}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {activeTab === 'received' && req.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'accepted')}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(req.id, 'rejected')}
                      className="btn-secondary text-xs py-1.5 px-3 text-rose-600 hover:bg-rose-50 flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Decline
                    </button>
                  </>
                )}

                {req.status === 'accepted' && (
                  <Link
                    to="/sessions"
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Go to Sessions
                  </Link>
                )}

                {req.status === 'pending' && (
                  <button
                    onClick={() => handleUpdateStatus(req.id, 'cancelled')}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                    title="Cancel request"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
