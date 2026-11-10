import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Search,
  BookMarked,
  Inbox,
  CalendarCheck,
  CreditCard,
  User,
  ShieldCheck,
} from 'lucide-react';

export function Sidebar() {
  const { isAdmin } = useAuth();

  const studentLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/discover', label: 'Discover Skills', icon: Search },
    { to: '/my-skills', label: 'My Skills', icon: BookMarked },
    { to: '/requests', label: 'Requests', icon: Inbox },
    { to: '/sessions', label: 'Sessions', icon: CalendarCheck },
    { to: '/transactions', label: 'Payments', icon: CreditCard },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  const adminLinks = [
    { to: '/admin', label: 'Admin Overview', icon: ShieldCheck },
    { to: '/dashboard', label: 'Student View', icon: LayoutDashboard },
    { to: '/transactions', label: 'All Transactions', icon: CreditCard },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 min-h-[calc(100vh-61px)] p-4 flex flex-col justify-between shrink-0">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
          {isAdmin ? 'Administration' : 'Menu'}
        </div>
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* College Notice Footer */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-xs text-slate-500">
        <div className="font-semibold text-slate-700 mb-0.5">Campus Skill Exchange</div>
        <p className="text-[11px] leading-relaxed">
          Peer mentorship & learning network. INR payments secured via Razorpay.
        </p>
      </div>
    </aside>
  );
}
