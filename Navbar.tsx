import React from 'react';
import {
  GraduationCap,
  PlusCircle,
  Search,
  ShieldCheck,
  Moon,
  Sun,
  BookOpen,
  Compass,
} from 'lucide-react';
import { AdminUser } from '../types.js';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, token?: string) => void;
  adminUser: AdminUser | null;
  onAdminLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  adminUser,
  onAdminLogout,
  isDark,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <button
          onClick={() => onNavigate('gallery')}
          className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md p-1 -m-1"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              CampusCraft
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              Student Showcase
            </span>
          </div>
        </button>

        {/* Navigation Items */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onNavigate('gallery')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              currentView === 'gallery'
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Gallery
          </button>

          <button
            onClick={() => onNavigate('guidelines')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              currentView === 'guidelines'
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Guidelines
          </button>

          <button
            onClick={() => onNavigate('status')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              currentView === 'status'
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            Track Status
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Admin link or Dashboard */}
          {adminUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <button
                onClick={() => onNavigate('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  currentView === 'admin'
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'text-indigo-600 hover:bg-slate-100 dark:text-indigo-400 dark:hover:bg-slate-800'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Admin Queue</span>
              </button>
              <button
                onClick={onAdminLogout}
                className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('admin-login')}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-medium rounded-md"
              title="Admin Portal Login"
            >
              <ShieldCheck className="h-4 w-4" />
            </button>
          )}

          {/* Submit CTA */}
          <button
            onClick={() => onNavigate('submit')}
            className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Submit Project</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
