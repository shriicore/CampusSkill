import React from 'react';

export function Badge({ children, variant = 'neutral', size = 'sm' }) {
  const variants = {
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    reciprocal: 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-800 border-indigo-300 font-semibold shadow-xs',
  };

  const sizes = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full border ${variants[variant] || variants.neutral} ${sizes[size]}`}
    >
      {children}
    </span>
  );
}
