import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';
import {
  BookOpen,
  CalendarCheck,
  Inbox,
  ArrowRight,
  Sparkles,
  TrendingUp,
  CreditCard,
  Star,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [requests, setRequests] = useState({ sent_requests: [], received_requests: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [matchRes, sessRes, reqRes] = await Promise.all([
          api.getMatches(4),
          api.getSessions(),
          api.getRequests('all'),
        ]);
        setMatches(matchRes.matches || []);
        setSessions(sessRes.sessions || []);
        setRequests(reqRes);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const pendingReceived = requests.received_requests?.filter((r) => r.status === 'pending') || [];
  const upcomingSessions = sessions.filter((s) => s.status === 'scheduled');

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {user?.department} • Semester {user?.semester || 'N/A'} • Rating: {user?.average_rating > 0 ? `★ ${user.average_rating}` : 'New Mentor'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/discover" className="btn-primary flex items-center gap-2 text-xs">
            Discover Peers
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link to="/my-skills" className="btn-secondary text-xs">
            Manage Skills
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Offered Skills</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{user?.offered_skills_count || 0}</div>
          <p className="text-[11px] text-slate-400 mt-1">Skills you can teach</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Wanted Skills</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{user?.wanted_skills_count || 0}</div>
          <p className="text-[11px] text-slate-400 mt-1">Skills you desire</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Inquiries</span>
            <Inbox className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{pendingReceived.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting your response</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Upcoming Sessions</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{upcomingSessions.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Booked & active</p>
        </div>
      </div>

      {/* Two Column Layout: Recommended Matches & Upcoming Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deterministic Matches (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Compatible Skill Exchange Matches
              </h2>
            </div>
            <Link to="/discover" className="text-xs text-indigo-600 font-semibold hover:underline">
              View all
            </Link>
          </div>

          {matches.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-xs text-slate-500">
                No matching peers found yet. Try adding skills to your Wanted and Offered lists to see rule-based matches!
              </p>
              <Link to="/my-skills" className="btn-secondary text-xs mt-3">
                Update My Skills
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((m) => (
                <div
                  key={m.peer.id}
                  className="bg-white border border-slate-200/80 rounded-xl p-4 hover:border-indigo-300 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/profile/${m.peer.id}`}
                          className="font-bold text-sm text-slate-900 hover:text-indigo-600"
                        >
                          {m.peer.name}
                        </Link>
                        {m.is_reciprocal ? (
                          <Badge variant="reciprocal" size="xs">
                            🔄 Reciprocal Exchange
                          </Badge>
                        ) : (
                          <Badge variant="primary" size="xs">
                            Direct Match
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {m.peer.department} • Compatibility Score: <span className="font-bold text-indigo-700">{m.compatibility_score}%</span>
                      </div>
                    </div>

                    <Link
                      to={`/profile/${m.peer.id}`}
                      className="btn-secondary text-xs py-1.5 px-3 shrink-0"
                    >
                      Connect
                    </Link>
                  </div>

                  {/* Overlap Explanation */}
                  <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700">Deterministic Match Rationale: </span>
                    {m.explanation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Sessions & Notifications (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Upcoming Sessions
            </h2>
            <Link to="/sessions" className="text-xs text-indigo-600 font-semibold hover:underline">
              All Sessions
            </Link>
          </div>

          <div className="card space-y-3 p-4">
            {upcomingSessions.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No upcoming sessions scheduled.</p>
            ) : (
              upcomingSessions.slice(0, 3).map((sess) => (
                <div
                  key={sess.id}
                  className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-xs space-y-1.5"
                >
                  <div className="font-semibold text-slate-800 line-clamp-1">{sess.title}</div>
                  <div className="text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {new Date(sess.scheduled_start).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <Badge
                      variant={sess.payment_status === 'paid' ? 'success' : 'warning'}
                      size="xs"
                    >
                      {sess.fee_paise === 0 ? 'Free' : `₹${sess.fee_inr} • ${sess.payment_status.toUpperCase()}`}
                    </Badge>
                    <span className="text-[11px] text-slate-500 capitalize">{sess.mode}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
