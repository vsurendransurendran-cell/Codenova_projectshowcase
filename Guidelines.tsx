import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Code2,
  Globe2,
  ArrowRight,
} from 'lucide-react';

interface GuidelinesProps {
  onNavigateToSubmit: () => void;
}

export const Guidelines: React.FC<GuidelinesProps> = ({ onNavigateToSubmit }) => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="mb-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 mb-3">
          <BookOpen className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Showcase Guidelines & Standards
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          CampusCraft highlights student engineering, scientific research prototypes, and open-source software. Review these criteria before submitting.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Repository standards */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-3 text-slate-900 dark:text-white font-semibold text-base">
            <Code2 className="h-5 w-5 text-indigo-600" />
            <span>GitHub Repository Criteria</span>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Public repository with open access (no private repos or broken 404 links).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Clear README documenting project goals, tech stack, and setup/run instructions.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Original student work or substantial derivative contributions with proper attribution.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>No exposed API keys, secret credentials, or proprietary campus exams.</span>
            </li>
          </ul>
        </div>

        {/* Live Demo criteria */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-3 text-slate-900 dark:text-white font-semibold text-base">
            <Globe2 className="h-5 w-5 text-indigo-600" />
            <span>Live Demo & Security Criteria</span>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Hosted on secure HTTPS (e.g. Vercel, Netlify, Cloud Run, GitHub Pages).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Responds with HTTP 200 OK without unhandled runtime exceptions.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Complies with SSRF security (no localhost, internal LAN or private IP endpoints).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Responsive UI accessible to desktop and mobile visitors.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Review Process */}
      <div className="rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 p-6 sm:p-8 mb-12">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
          How Administrative Review Works
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm block mb-1">
              01. Submit & Token
            </span>
            <span>
              You receive a private 32-byte tracking token immediately upon submission. Status is initially set to PENDING.
            </span>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm block mb-1">
              02. Moderator Evaluation
            </span>
            <span>
              Faculty/TA moderators test your demo URL, inspect repository commits, and verify academic relevance.
            </span>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm block mb-1">
              03. Public Publication
            </span>
            <span>
              Approved projects immediately appear in the public showcase gallery and tag index for visitors to explore.
            </span>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onNavigateToSubmit}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          <span>Ready to Submit? Open Submission Form</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
