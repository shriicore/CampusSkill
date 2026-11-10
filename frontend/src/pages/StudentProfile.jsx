import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  User,
  Star,
  BookOpen,
  TrendingUp,
  Send,
  Flag,
  Calendar,
  Building,
} from 'lucide-react';

export function StudentProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Report Modal
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate behavior');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Request Modal
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [preferredMode, setPreferredMode] = useState('online');
  const [requestMessage, setRequestMessage] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const targetId = id || user?.id;
        const res = await api.getStudentDetail(targetId);
        setStudent(res.student);
        if (res.student.offered_skills?.length > 0) {
          setSelectedSkillId(res.student.offered_skills[0].skill_id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, user]);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!selectedSkillId) {
      error('Please select an offered skill.');
      return;
    }
    setSubmittingRequest(true);
    try {
      await api.createRequest({
        mentor_id: student.id,
        skill_id: Number(selectedSkillId),
        preferred_mode: preferredMode,
        message: requestMessage.trim() || undefined,
      });
      success(`Request sent to ${student.name}!`);
      setIsRequestOpen(false);
    } catch (err) {
      error(err.message || 'Failed to send request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportDetails.trim()) {
      error('Please provide details for the report.');
      return;
    }
    setSubmittingReport(true);
    try {
      await api.submitReport({
        reported_user_id: student.id,
        reason: reportReason,
        details: reportDetails.trim(),
      });
      success('Report submitted to campus moderators.');
      setIsReportOpen(false);
      setReportDetails('');
    } catch (err) {
      error(err.message || 'Failed to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="card text-center py-10">
        <p className="text-sm text-slate-500">Student profile not found.</p>
      </div>
    );
  }

  const isSelf = user?.id === student.id;

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-2xl flex items-center justify-center">
            {student.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900">{student.name}</h1>
              {student.role === 'admin' ? (
                <Badge variant="primary">Administrator</Badge>
              ) : (
                <Badge variant="neutral">Student</Badge>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
              <span>{student.department}</span>
              <span>•</span>
              <span>Semester {student.semester || 'N/A'}</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-amber-500">
                <Star className="w-3.5 h-3.5 fill-current" />
                {student.average_rating > 0 ? `${student.average_rating} (${student.total_reviews} reviews)` : 'No ratings yet'}
              </span>
            </div>
          </div>
        </div>

        {!isSelf && (
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsReportOpen(true)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
              title="Report User"
            >
              <Flag className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsRequestOpen(true)}
              className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4"
            >
              <Send className="w-3.5 h-3.5" /> Request Session
            </button>
          </div>
        )}
      </div>

      {/* Bio */}
      {student.bio && (
        <div className="card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            About {student.name}
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed">{student.bio}</p>
        </div>
      )}

      {/* Skills Offered & Wanted */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Offered */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              Skills Offered
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              {student.offered_skills?.length || 0}
            </span>
          </div>

          {!student.offered_skills || student.offered_skills.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">No offered skills listed.</p>
          ) : (
            <div className="space-y-2">
              {student.offered_skills.map((us) => (
                <div
                  key={us.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800">{us.skill_name}</span>
                    <span className="text-slate-400 ml-2 font-normal">({us.proficiency})</span>
                  </div>
                  <span className="font-bold text-indigo-700">
                    {us.fee_paise > 0 ? `₹${us.fee_inr}/session` : 'Free'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wanted */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Skills Wanted
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              {student.wanted_skills?.length || 0}
            </span>
          </div>

          {!student.wanted_skills || student.wanted_skills.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">No desired skills listed.</p>
          ) : (
            <div className="space-y-2">
              {student.wanted_skills.map((us) => (
                <div
                  key={us.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <span className="font-semibold text-slate-800">{us.skill_name}</span>
                  <Badge variant="neutral" size="xs">
                    Target: {us.proficiency}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Peer Reviews */}
      <div className="card space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
          Verified Peer Reviews ({student.reviews?.length || 0})
        </h3>

        {!student.reviews || student.reviews.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">
            No completed sessions reviewed yet. Completed sessions will show authentic feedback here.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 space-y-3">
            {student.reviews.map((rev) => (
              <div key={rev.id} className="pt-3 first:pt-0 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{rev.reviewer_name}</span>
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <span>★ {rev.rating}</span>
                  </div>
                </div>
                {rev.comment && <p className="text-slate-600 italic">"{rev.comment}"</p>}
                <div className="text-[11px] text-slate-400">
                  {new Date(rev.created_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Modal */}
      <Modal
        isOpen={isRequestOpen}
        onClose={() => setIsRequestOpen(false)}
        title={`Request Learning Session with ${student.name}`}
      >
        <form onSubmit={handleSendRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Skill Offered
            </label>
            <select
              required
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              className="w-full py-2 px-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              {student.offered_skills?.map((us) => (
                <option key={us.skill_id} value={us.skill_id}>
                  {us.skill_name} ({us.proficiency}) {us.fee_paise > 0 ? `- ₹${us.fee_inr}` : '- Free'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer text-xs">
                <input
                  type="radio"
                  name="pm"
                  value="online"
                  checked={preferredMode === 'online'}
                  onChange={() => setPreferredMode('online')}
                />
                <span>Online Video Meet</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer text-xs">
                <input
                  type="radio"
                  name="pm"
                  value="offline"
                  checked={preferredMode === 'offline'}
                  onChange={() => setPreferredMode('offline')}
                />
                <span>Campus / Offline</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Message to {student.name}
            </label>
            <textarea
              rows={3}
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="Describe your learning goals..."
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsRequestOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingRequest}
              className="btn-primary"
            >
              {submittingRequest ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        title={`Report User: ${student.name}`}
      >
        <form onSubmit={handleReportSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full py-2 px-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              <option>Inappropriate behavior</option>
              <option>No-show or repeated cancellations</option>
              <option>Spam or commercial advertising</option>
              <option>Dishonest skill representation</option>
              <option>Other grievance</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Details for Campus Moderation
            </label>
            <textarea
              required
              rows={4}
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Provide specific dates or incident notes..."
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsReportOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReport}
              className="btn-danger"
            >
              {submittingReport ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
