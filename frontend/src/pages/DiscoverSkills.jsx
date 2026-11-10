import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { Search, Filter, Send, Star, BookOpen, User } from 'lucide-react';

export function DiscoverSkills() {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [students, setStudents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(true);

  // Request modal state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [preferredMode, setPreferredMode] = useState('online');
  const [requestMessage, setRequestMessage] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (department) params.append('department', department);
      const res = await api.getStudents(params.toString());
      // Filter out self
      setStudents((res.students || []).filter((s) => s.id !== user?.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.getCategories();
        setCategories(res.categories || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCats();
    fetchStudents();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const handleOpenRequest = (mentor) => {
    setSelectedMentor(mentor);
    setSelectedSkillId('');
    setRequestMessage('');
    setRequestModalOpen(true);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!selectedSkillId) {
      error('Please select the skill you want to learn.');
      return;
    }

    setSubmittingRequest(true);
    try {
      await api.createRequest({
        mentor_id: selectedMentor.id,
        skill_id: Number(selectedSkillId),
        preferred_mode: preferredMode,
        message: requestMessage.trim() || undefined,
      });
      success(`Learning request sent to ${selectedMentor.name}!`);
      setRequestModalOpen(false);
    } catch (err) {
      error(err.message || 'Failed to send learning request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Discover Peers & Skills</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Find college peers offering skills you desire, or connect for reciprocal knowledge exchanges.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name or specialty..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
            />
          </div>

          <div className="w-full sm:w-56">
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full py-2 px-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              <option value="">All Departments</option>
              <option value="Computer Science">Computer Science & Eng</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Electronics">Electronics & Comm</option>
              <option value="Media">Media & Comm</option>
              <option value="Mechanical">Mechanical Engineering</option>
            </select>
          </div>

          <button type="submit" className="btn-primary text-xs py-2 px-4 shrink-0">
            Apply Filters
          </button>
        </form>
      </div>

      {/* Students Grid */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : students.length === 0 ? (
        <div className="card text-center py-12 bg-white rounded-2xl border border-slate-200/80">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No skills available yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No registered students have published teaching listings yet. Be the first to share your knowledge!
          </p>
          <Link to="/my-skills" className="btn-primary text-xs mt-4 inline-flex">
            List a Skill You Teach
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {students.map((student) => (
            <div
              key={student.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:border-indigo-300 transition flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <Link
                        to={`/profile/${student.id}`}
                        className="font-bold text-sm text-slate-900 hover:text-indigo-600 leading-tight block"
                      >
                        {student.name}
                      </Link>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {student.department} • Sem {student.semester || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {student.average_rating > 0 && (
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{student.average_rating}</span>
                    </div>
                  )}
                </div>

                {/* Bio snippet */}
                {student.bio && (
                  <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                    {student.bio}
                  </p>
                )}

                {/* Teaching Skills List */}
                {student.offered_skills && student.offered_skills.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Teaching Listings:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {student.offered_skills.map((os) => (
                        <span
                          key={os.id || os.skill_id}
                          className="inline-flex items-center gap-1 text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100"
                        >
                          <span>{os.skill_name}</span>
                          <span className="text-indigo-400 text-[10px]">({os.proficiency})</span>
                          {os.fee_paise > 0 ? (
                            <strong className="text-indigo-900 font-bold">₹{os.fee_inr}</strong>
                          ) : (
                            <span className="text-emerald-600 font-semibold text-[10px]">Free</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 flex items-center gap-2 border-t border-slate-100">
                <Link
                  to={`/profile/${student.id}`}
                  className="btn-secondary text-xs flex-1 py-1.5 text-center"
                >
                  View Profile
                </Link>
                <button
                  onClick={() => handleOpenRequest(student)}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" /> Request
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Send Request Modal */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title={`Request Learning Session with ${selectedMentor?.name || ''}`}
      >
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Mentor:</span> {selectedMentor?.name} ({selectedMentor?.department})
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Skill You Want to Learn <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              className="w-full py-2 px-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              <option value="">-- Choose a skill offered by {selectedMentor?.name} --</option>
              {selectedMentor?.offered_skills && selectedMentor.offered_skills.length > 0 ? (
                selectedMentor.offered_skills.map((us) => (
                  <option key={us.skill_id} value={us.skill_id}>
                    {us.skill_name} ({us.proficiency}) {us.fee_paise > 0 ? `- ₹${us.fee_inr}` : '- Free'}
                  </option>
                ))
              ) : (
                <option value="" disabled>No offered skills listed by this student</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer text-xs">
                <input
                  type="radio"
                  name="pref_mode"
                  value="online"
                  checked={preferredMode === 'online'}
                  onChange={() => setPreferredMode('online')}
                />
                <span>Online (Meet/Zoom)</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer text-xs">
                <input
                  type="radio"
                  name="pref_mode"
                  value="offline"
                  checked={preferredMode === 'offline'}
                  onChange={() => setPreferredMode('offline')}
                />
                <span>In-Person / Campus</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Note to Mentor (Optional)
            </label>
            <textarea
              rows={3}
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="Tell the mentor what specific topics you'd like to work on..."
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRequestModalOpen(false)}
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
    </div>
  );
}
