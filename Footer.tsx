import React from 'react';
import { GraduationCap, ShieldCheck, Heart, Github } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-white">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">CampusCraft</span>
            <span className="text-xs text-slate-400">· Student Project Showcase</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <button
              onClick={() => onNavigate('gallery')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Public Gallery
            </button>
            <button
              onClick={() => onNavigate('submit')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Submit Project
            </button>
            <button
              onClick={() => onNavigate('status')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Track Status
            </button>
            <button
              onClick={() => onNavigate('guidelines')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Guidelines
            </button>
            <button
              onClick={() => onNavigate('admin-login')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <p>© {new Date().getFullYear()} CampusCraft Showcase. Peer-reviewed student engineering & innovation.</p>
          <p className="flex items-center gap-1">
            Built with strict SSRF protection, Zod validation, and PostgreSQL / SQLite
          </p>
        </div>
      </div>
    </footer>
  );
};
