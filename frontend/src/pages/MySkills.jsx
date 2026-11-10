import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { Plus, Trash2, Edit3, BookOpen, TrendingUp, IndianRupee } from 'lucide-react';

export function MySkills() {
  const { refreshUser } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState('offered'); // 'offered' | 'wanted'
  const [skillsData, setSkillsData] = useState({ offered: [], wanted: [] });
  const [categories, setCategories] = useState([]);
  const [masterSkills, setMasterSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [formData, setFormData] = useState({
    skill_id: '',
    new_skill_name: '',
    category_id: '',
    proficiency: 'Intermediate',
    fee_inr: 0,
    years_experience: 1.0,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchMySkills = async () => {
    setLoading(true);
    try {
      const [myRes, catRes, masterRes] = await Promise.all([
        api.getMySkills(),
        api.getCategories(),
        api.getSkills(),
      ]);
      setSkillsData(myRes);
      setCategories(catRes.categories || []);
      setMasterSkills(masterRes.skills || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySkills();
  }, []);

  const handleOpenAdd = () => {
    setEditingSkill(null);
    setFormData({
      skill_id: masterSkills[0]?.id || '',
      new_skill_name: '',
      category_id: categories[0]?.id || '',
      proficiency: 'Intermediate',
      fee_inr: activeTab === 'offered' ? 300 : 0,
      years_experience: 1.0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (skillItem) => {
    setEditingSkill(skillItem);
    setFormData({
      skill_id: skillItem.skill_id,
      new_skill_name: '',
      category_id: '',
      proficiency: skillItem.proficiency,
      fee_inr: skillItem.fee_inr,
      years_experience: skillItem.years_experience,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingSkill) {
        await api.updateMySkill(editingSkill.id, {
          proficiency: formData.proficiency,
          years_experience: Number(formData.years_experience),
          fee_paise: activeTab === 'offered' ? Math.round(Number(formData.fee_inr) * 100) : 0,
        });
        success('Skill updated successfully.');
      } else {
        await api.addMySkill({
          skill_id: formData.skill_id ? Number(formData.skill_id) : undefined,
          new_skill_name: formData.new_skill_name.trim() || undefined,
          category_id: formData.category_id ? Number(formData.category_id) : undefined,
          skill_type: activeTab,
          proficiency: formData.proficiency,
          fee_paise: activeTab === 'offered' ? Math.round(Number(formData.fee_inr) * 100) : 0,
          years_experience: Number(formData.years_experience),
        });
        success(`Added to your ${activeTab} skills!`);
      }
      setIsModalOpen(false);
      fetchMySkills();
      refreshUser();
    } catch (err) {
      error(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, skillName) => {
    if (!window.confirm(`Are you sure you want to remove '${skillName}' from your profile?`)) {
      return;
    }
    try {
      await api.deleteMySkill(id);
      success('Skill removed.');
      fetchMySkills();
      refreshUser();
    } catch (err) {
      error(err.message || 'Failed to remove skill.');
    }
  };

  const currentList = activeTab === 'offered' ? skillsData.offered : skillsData.wanted;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Manage My Skills</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure skills you can teach (offered) and skills you are seeking to learn (wanted).
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="btn-primary flex items-center gap-2 text-xs py-2"
        >
          <Plus className="w-4 h-4" />
          Add {activeTab === 'offered' ? 'Offered Skill' : 'Wanted Skill'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('offered')}
          className={`py-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'offered'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Skills I Offer ({skillsData.offered.length})
        </button>
        <button
          onClick={() => setActiveTab('wanted')}
          className={`py-3 px-5 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === 'wanted'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Skills I Want ({skillsData.wanted.length})
        </button>
      </div>

      {/* Skills Cards Grid */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : currentList.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-sm text-slate-500 mb-3">
            You haven't listed any {activeTab} skills yet.
          </p>
          <button onClick={handleOpenAdd} className="btn-secondary text-xs">
            + Add Your First {activeTab === 'offered' ? 'Offered Skill' : 'Wanted Skill'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentList.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-slate-900">{item.skill_name}</h3>
                  <Badge variant="primary" size="xs">
                    {item.proficiency}
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{item.category_name}</div>

                {activeTab === 'offered' && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Hourly / Session Fee:</span>
                    <span className="font-bold text-indigo-700">
                      {item.fee_paise > 0 ? `₹${item.fee_inr} INR` : 'Free / Exchange'}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEdit(item)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  title="Edit details"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.skill_name)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Remove skill"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Skill Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingSkill
            ? `Edit '${editingSkill.skill_name}'`
            : `Add to ${activeTab === 'offered' ? 'Offered' : 'Wanted'} Skills`
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingSkill && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Choose Existing Skill or Add Custom
              </label>
              <select
                value={formData.skill_id}
                onChange={(e) => setFormData({ ...formData, skill_id: e.target.value })}
                className="w-full py-2 px-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white mb-2"
              >
                <option value="">-- Or enter custom skill below --</option>
                {masterSkills.map((sk) => (
                  <option key={sk.id} value={sk.id}>
                    {sk.name} ({sk.category_name})
                  </option>
                ))}
              </select>

              {!formData.skill_id && (
                <div className="space-y-2 mt-2">
                  <input
                    type="text"
                    required={!formData.skill_id}
                    value={formData.new_skill_name}
                    onChange={(e) => setFormData({ ...formData, new_skill_name: e.target.value })}
                    placeholder="Enter new skill name (e.g. Flutter, Blender, French)..."
                    className="w-full p-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full py-2 px-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Proficiency Level
            </label>
            <select
              value={formData.proficiency}
              onChange={(e) => setFormData({ ...formData, proficiency: e.target.value })}
              className="w-full py-2 px-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              <option value="Beginner">Beginner (Foundations & Basics)</option>
              <option value="Intermediate">Intermediate (Practical Application)</option>
              <option value="Advanced">Advanced (Complex Projects & Optimization)</option>
              <option value="Expert">Expert (Industry Mastery & Mentoring)</option>
            </select>
          </div>

          {activeTab === 'offered' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Session Fee in Indian Rupees (₹ INR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={formData.fee_inr}
                  onChange={(e) => setFormData({ ...formData, fee_inr: e.target.value })}
                  placeholder="0 for free / peer exchange"
                  className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Set to 0 if you are open to direct reciprocal skill exchange.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Saving...' : 'Save Skill'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
