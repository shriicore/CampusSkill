import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Star } from 'lucide-react';

export function ReviewModal({ isOpen, onClose, session, onReviewSubmitted }) {
  const { success, error } = useToast();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!session) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      error('Rating must be between 1 and 5 stars.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createReview({
        session_id: session.id,
        rating,
        comment: comment.trim() || undefined,
      });
      success('Thank you! Your feedback has been recorded.');
      setComment('');
      setRating(5);
      onClose();
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err) {
      error(err.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rate Completed Session">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600">
          <div className="font-semibold text-slate-800 text-sm">{session.title}</div>
          <div className="mt-1">
            Mentored by <span className="font-medium text-slate-700">{session.mentor_name}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Session Rating (1 - 5 Stars)
          </label>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 focus:outline-none transition transform hover:scale-110"
              >
                <Star
                  className={`w-7 h-7 ${
                    (hoverRating || rating) >= star
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-200 fill-slate-100'
                  }`}
                />
              </button>
            ))}
            <span className="ml-3 text-sm font-bold text-slate-700">
              {hoverRating || rating} / 5
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Feedback & Comments
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What went well? How was the teaching style and clarity?..."
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
            className="btn-primary"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
