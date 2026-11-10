import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { RazorpayCheckoutModal } from '../components/payment/RazorpayCheckoutModal';
import { ReviewModal } from '../components/reviews/ReviewModal';
import {
  CalendarCheck,
  Plus,
  Clock,
  Video,
  MapPin,
  CreditCard,
  Star,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export function Sessions() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [sessions, setSessions] = useState([]);
  const [acceptedRequests, setAcceptedRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [reviewSession, setReviewSession] = useState(null);

  // Schedule Form State
  const [scheduleData, setScheduleData] = useState({
    request_id: '',
    title: '',
    date: '',
    start_time: '14:00',
    end_time: '15:00',
    mode: 'online',
    meeting_info: '',
    notes: '',
  });
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  const fetchSessionsAndRequests = async () => {
    setLoading(true);
    try {
      const [sessRes, reqRes] = await Promise.all([
        api.getSessions(),
        api.getRequests('all'),
      ]);
      setSessions(sessRes.sessions || []);

      // Filter accepted requests that haven't been scheduled yet or can be scheduled
      const accepted = [
        ...(reqRes.sent_requests || []),
        ...(reqRes.received_requests || []),
      ].filter((r) => r.status === 'accepted');
      setAcceptedRequests(accepted);

      if (accepted.length > 0 && !scheduleData.request_id) {
        setScheduleData((prev) => ({
          ...prev,
          request_id: accepted[0].id,
          title: `Mentorship: ${accepted[0].skill_name}`,
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionsAndRequests();
  }, []);

  const handleOpenSchedule = () => {
    if (acceptedRequests.length === 0) {
      error('You do not have any accepted learning requests available to schedule. Please send or accept a request first.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    setScheduleData({
      request_id: acceptedRequests[0].id,
      title: `Mentorship: ${acceptedRequests[0].skill_name}`,
      date: today,
      start_time: '14:00',
      end_time: '15:00',
      mode: acceptedRequests[0].preferred_mode || 'online',
      meeting_info: acceptedRequests[0].preferred_mode === 'offline' ? 'Campus Library, Discussion Room 3' : 'https://meet.google.com/new-session',
      notes: '',
    });
    setIsScheduleOpen(true);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setSubmittingSchedule(true);
    try {
      const scheduledStart = `${scheduleData.date}T${scheduleData.start_time}:00`;
      const scheduledEnd = `${scheduleData.date}T${scheduleData.end_time}:00`;

      await api.scheduleSession({
        request_id: Number(scheduleData.request_id),
        title: scheduleData.title.trim(),
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        mode: scheduleData.mode,
        meeting_info: scheduleData.meeting_info.trim(),
        notes: scheduleData.notes.trim() || undefined,
      });

      success('Session scheduled successfully!');
      setIsScheduleOpen(false);
      fetchSessionsAndRequests();
    } catch (err) {
      error(err.message || 'Failed to schedule session.');
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const handleStatusChange = async (sessionId, newStatus) => {
    try {
      await api.updateSessionStatus(sessionId, newStatus);
      success(`Session marked as '${newStatus}'.`);
      fetchSessionsAndRequests();
    } catch (err) {
      error(err.message || 'Failed to update session.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Learning Sessions</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View upcoming bookings, schedule new sessions for accepted requests, and pay fees via Razorpay.
          </p>
        </div>
        <button
          onClick={handleOpenSchedule}
          className="btn-primary flex items-center gap-2 text-xs py-2"
        >
          <Plus className="w-4 h-4" /> Schedule New Session
        </button>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-sm text-slate-500 mb-2">No learning sessions found.</p>
          <p className="text-xs text-slate-400">
            Once you accept a learning request, you can book a mutually agreed date and time here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((sess) => {
            const isLearner = user?.id === sess.learner_id;
            const isMentor = user?.id === sess.mentor_id;
            const isCompleted = sess.status === 'completed';
            const isCancelled = sess.status === 'cancelled';
            const isPaid = sess.payment_status === 'paid';
            const isFree = sess.fee_paise === 0;

            return (
              <div
                key={sess.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:border-slate-300 transition"
              >
                {/* Details */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">{sess.title}</h3>
                    <Badge variant="primary" size="xs">
                      {sess.skill_name}
                    </Badge>
                    <Badge
                      variant={isCompleted ? 'success' : isCancelled ? 'danger' : 'neutral'}
                      size="xs"
                    >
                      {sess.status.toUpperCase()}
                    </Badge>
                    <Badge
                      variant={isPaid ? 'success' : isFree ? 'neutral' : 'warning'}
                      size="xs"
                    >
                      {isFree ? 'FREE' : `₹${sess.fee_inr} • ${sess.payment_status.toUpperCase()}`}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(sess.scheduled_start).toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      ({new Date(sess.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(sess.scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </span>

                    <span className="flex items-center gap-1">
                      {sess.mode === 'online' ? (
                        <Video className="w-3.5 h-3.5 text-indigo-500" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                      <span className="capitalize">{sess.mode}:</span> {sess.meeting_info}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500">
                    <span>Mentor: <strong className="text-slate-800">{sess.mentor_name}</strong></span>
                    <span className="mx-2">•</span>
                    <span>Learner: <strong className="text-slate-800">{sess.learner_name}</strong></span>
                  </div>

                  {sess.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-w-xl">
                      {sess.notes}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Payment Button if Learner and unpaid */}
                  {!isFree && !isPaid && !isCancelled && isLearner && (
                    <button
                      onClick={() => setCheckoutSession(sess)}
                      className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Pay ₹{sess.fee_inr}
                    </button>
                  )}

                  {/* Mark Completed if scheduled */}
                  {sess.status === 'scheduled' && (
                    <button
                      onClick={() => handleStatusChange(sess.id, 'completed')}
                      className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 text-emerald-700 hover:bg-emerald-50"
                      title="Mark session as completed"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Mark Completed
                    </button>
                  )}

                  {/* Submit Review if completed and not reviewed */}
                  {isCompleted && !sess.has_review && (
                    <button
                      onClick={() => setReviewSession(sess)}
                      className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 text-amber-700 hover:bg-amber-50"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" /> Rate Session
                    </button>
                  )}

                  {/* Cancel button if scheduled */}
                  {sess.status === 'scheduled' && (
                    <button
                      onClick={() => handleStatusChange(sess.id, 'cancelled')}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="Cancel session"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Session Modal */}
      <Modal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title="Schedule Learning Session"
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Accepted Learning Request
            </label>
            <select
              required
              value={scheduleData.request_id}
              onChange={(e) => {
                const req = acceptedRequests.find((r) => r.id === Number(e.target.value));
                setScheduleData({
                  ...scheduleData,
                  request_id: e.target.value,
                  title: req ? `Mentorship: ${req.skill_name}` : scheduleData.title,
                });
              }}
              className="w-full py-2 px-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              {acceptedRequests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.skill_name} (with {r.requester_name === user?.name ? r.mentor_name : r.requester_name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Session Title / Topic
            </label>
            <input
              type="text"
              required
              value={scheduleData.title}
              onChange={(e) => setScheduleData({ ...scheduleData, title: e.target.value })}
              placeholder="e.g. Python OOP & Architecture Basics"
              className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={scheduleData.date}
                onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
              <input
                type="time"
                required
                value={scheduleData.start_time}
                onChange={(e) => setScheduleData({ ...scheduleData, start_time: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
              <input
                type="time"
                required
                value={scheduleData.end_time}
                onChange={(e) => setScheduleData({ ...scheduleData, end_time: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mode</label>
              <select
                value={scheduleData.mode}
                onChange={(e) => setScheduleData({ ...scheduleData, mode: e.target.value })}
                className="w-full py-2 px-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="online">Online (Video Meet)</option>
                <option value="offline">In-Person (Campus)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meeting Link or Room
              </label>
              <input
                type="text"
                required
                value={scheduleData.meeting_info}
                onChange={(e) => setScheduleData({ ...scheduleData, meeting_info: e.target.value })}
                placeholder={scheduleData.mode === 'online' ? 'Google Meet / Zoom URL' : 'e.g. Lab 204 / Library'}
                className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Session Agenda / Notes
            </label>
            <textarea
              rows={2}
              value={scheduleData.notes}
              onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
              placeholder="Key concepts or prep materials..."
              className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsScheduleOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingSchedule}
              className="btn-primary"
            >
              {submittingSchedule ? 'Scheduling...' : 'Confirm Session'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Razorpay Checkout Modal */}
      <RazorpayCheckoutModal
        isOpen={!!checkoutSession}
        onClose={() => setCheckoutSession(null)}
        session={checkoutSession}
        onPaymentSuccess={() => {
          fetchSessionsAndRequests();
        }}
      />

      {/* Review Modal */}
      <ReviewModal
        isOpen={!!reviewSession}
        onClose={() => setReviewSession(null)}
        session={reviewSession}
        onReviewSubmitted={() => {
          fetchSessionsAndRequests();
        }}
      />
    </div>
  );
}
