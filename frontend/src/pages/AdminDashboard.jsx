import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  ShieldCheck,
  Users,
  CreditCard,
  RotateCcw,
  Flag,
  FolderTree,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  TrendingUp,
} from 'lucide-react';

export function AdminDashboard() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'users' | 'categories' | 'refunds' | 'reports' | 'transactions'
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [reports, setReports] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Category creation
  const [isNewCatOpen, setIsNewCatOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Report resolution
  const [resolvingReport, setResolvingReport] = useState(null);
  const [adminAction, setAdminAction] = useState('');

  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, catRes, refRes, repRes, txRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getCategories(),
        api.getRefundRequests(),
        api.getAdminReports(),
        api.getAdminTransactions(),
      ]);
      setStats(statsRes);
      setUsersList(usersRes.users || []);
      setCategories(catRes.categories || []);
      setRefunds(refRes.refund_requests || []);
      setReports(repRes.reports || []);
      setAllTransactions(txRes.transactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  const handleToggleUser = async (userId) => {
    try {
      const res = await api.toggleUserStatus(userId);
      success(res.message);
      fetchAllAdminData();
    } catch (err) {
      error(err.message || 'Failed to update user status.');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      await api.createCategory({
        name: catName.trim(),
        description: catDesc.trim() || undefined,
      });
      success('Skill category created.');
      setCatName('');
      setCatDesc('');
      setIsNewCatOpen(false);
      fetchAllAdminData();
    } catch (err) {
      error(err.message || 'Failed to create category.');
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Delete this category? Associated skills will become uncategorized.')) {
      return;
    }
    try {
      await api.deleteCategory(catId);
      success('Category removed.');
      fetchAllAdminData();
    } catch (err) {
      error(err.message || 'Failed to delete category.');
    }
  };

  const handleProcessRefund = async (refundId, action) => {
    const promptNotes = action === 'reject' ? window.prompt('Reason for rejection:') : null;
    if (action === 'reject' && !promptNotes) return;

    try {
      const res = await api.processRefund(refundId, {
        action,
        admin_notes: promptNotes || undefined,
      });
      success(res.message || `Refund ${action}ed successfully.`);
      fetchAllAdminData();
    } catch (err) {
      error(err.message || 'Refund processing failed.');
    }
  };

  const handleResolveReport = async (e) => {
    e.preventDefault();
    if (!resolvingReport) return;
    try {
      await api.resolveReport(resolvingReport.id, {
        status: 'resolved',
        admin_action: adminAction.trim() || 'Warning issued to reported student.',
      });
      success('Report marked as resolved.');
      setResolvingReport(null);
      setAdminAction('');
      fetchAllAdminData();
    } catch (err) {
      error(err.message || 'Failed to resolve report.');
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Title */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold">Campus Administrator Console</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Platform governance, Razorpay transaction settlement audit, dispute moderation, and user management.
          </p>
        </div>
        <div className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
          Superuser: <strong className="text-white">{user?.name}</strong>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1">
        {[
          { key: 'stats', label: 'Overview Metrics' },
          { key: 'users', label: `Users (${usersList.length})` },
          { key: 'refunds', label: `Refund Requests (${refunds.length})` },
          { key: 'categories', label: `Categories (${categories.length})` },
          { key: 'transactions', label: `Ledger (${allTransactions.length})` },
          { key: 'reports', label: `Reports (${reports.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. Overview Metrics */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Students
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total_students}</div>
              <p className="text-[11px] text-emerald-600 mt-0.5">
                {stats.active_students} active accounts
              </p>
            </div>

            <div className="card">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Sessions
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total_sessions}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {stats.completed_sessions} completed exchanges
              </p>
            </div>

            <div className="card">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Settled Volume (INR)
              </span>
              <div className="text-2xl font-bold text-indigo-600 mt-1">₹{stats.total_volume_inr}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {stats.paid_transactions_count} paid transactions
              </p>
            </div>

            <div className="card">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pending Action
              </span>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                {stats.pending_refunds_count + stats.open_reports_count}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {stats.pending_refunds_count} refunds • {stats.open_reports_count} reports
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. User Accounts Management */}
      {activeTab === 'users' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/60 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                <th className="py-3 px-4">Student Name & Email</th>
                <th className="py-3 px-4">Department & Sem</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{u.name}</div>
                    <div className="text-slate-400 text-[11px]">{u.email}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {u.department || 'N/A'} • Sem {u.semester || 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={u.role === 'admin' ? 'primary' : 'neutral'} size="xs">
                      {u.role.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={u.is_active ? 'success' : 'danger'} size="xs">
                      {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleToggleUser(u.id)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                          u.is_active
                            ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                            : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Refund Requests Management */}
      {activeTab === 'refunds' && (
        <div className="space-y-4">
          {refunds.length === 0 ? (
            <div className="card text-center py-8 text-xs text-slate-500">
              No refund requests submitted.
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/60 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                    <th className="py-3 px-4">Refund ID & User</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {refunds.map((ref) => (
                    <tr key={ref.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{ref.user_name}</div>
                        <div className="text-[11px] text-slate-400">Tx #{ref.transaction_id}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        ₹{ref.amount_inr?.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">{ref.reason}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            ref.status === 'processed'
                              ? 'success'
                              : ref.status === 'rejected'
                              ? 'danger'
                              : 'warning'
                          }
                          size="xs"
                        >
                          {ref.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {ref.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleProcessRefund(ref.id, 'approve')}
                              className="btn-primary text-[11px] py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                            >
                              Authorize Refund
                            </button>
                            <button
                              onClick={() => handleProcessRefund(ref.id, 'reject')}
                              className="btn-secondary text-[11px] py-1 px-2.5 text-rose-600 hover:bg-rose-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {ref.gateway_refund_id && (
                          <span className="font-mono text-[10px] text-slate-400 block">
                            {ref.gateway_refund_id}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. Category Management */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsNewCatOpen(true)}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> New Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="card flex items-start justify-between gap-3 p-4 hover:border-slate-300 transition"
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{cat.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{cat.description || 'No description'}</p>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    {cat.skills_count} master skills registered
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  title="Delete category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Transactions Ledger */}
      {activeTab === 'transactions' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/60 font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                <th className="py-3 px-4">Tx ID</th>
                <th className="py-3 px-4">Order / Payment ID</th>
                <th className="py-3 px-4">Participants</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">#{tx.id}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                    <div>{tx.gateway_order_id}</div>
                    <div className="text-slate-400">{tx.gateway_payment_id || 'unpaid'}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    <div>Payer: {tx.payer_name}</div>
                    <div>Payee: {tx.payee_name}</div>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    ₹{tx.amount_inr?.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={tx.status === 'paid' ? 'success' : 'neutral'} size="xs">
                      {tx.status.toUpperCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. Moderation Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="card text-center py-8 text-xs text-slate-500">
              No dispute or conduct reports filed.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              {reports.map((rep) => (
                <div key={rep.id} className="p-4 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">Reporter: {rep.reporter_name}</span>
                      <span className="text-slate-400">flagged</span>
                      <span className="font-bold text-rose-700">{rep.reported_user_name}</span>
                      <Badge variant={rep.status === 'open' ? 'danger' : 'neutral'} size="xs">
                        {rep.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="font-semibold text-slate-700">Reason: {rep.reason}</div>
                    <p className="text-slate-600 max-w-xl">"{rep.details}"</p>
                    {rep.admin_action && (
                      <p className="text-indigo-600 font-medium">Admin Action: {rep.admin_action}</p>
                    )}
                  </div>

                  {rep.status === 'open' && (
                    <button
                      onClick={() => setResolvingReport(rep)}
                      className="btn-secondary text-[11px] py-1 px-3 shrink-0"
                    >
                      Resolve Report
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Category Modal */}
      <Modal isOpen={isNewCatOpen} onClose={() => setIsNewCatOpen(false)} title="Create Skill Category">
        <form onSubmit={handleCreateCategory} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name</label>
            <input
              type="text"
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Data Science & AI"
              className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="Brief description of the domain..."
              className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsNewCatOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create
            </button>
          </div>
        </form>
      </Modal>

      {/* Resolve Report Modal */}
      <Modal isOpen={!!resolvingReport} onClose={() => setResolvingReport(null)} title="Resolve Report">
        <form onSubmit={handleResolveReport} className="space-y-3.5">
          <p className="text-xs text-slate-600">
            Resolving report against <strong className="text-slate-900">{resolvingReport?.reported_user_name}</strong>.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Action Logged</label>
            <textarea
              rows={3}
              required
              value={adminAction}
              onChange={(e) => setAdminAction(e.target.value)}
              placeholder="e.g. Sent formal warning to student regarding session attendance..."
              className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setResolvingReport(null)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Mark Resolved
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
