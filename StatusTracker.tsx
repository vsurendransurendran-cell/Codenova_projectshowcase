import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  ExternalLink,
  Github,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  User,
  Calendar,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { StatusProjectDetails } from '../types.js';

interface StatusTrackerProps {
  initialToken?: string;
  onNavigateToGalleryWithFilter: (title: string) => void;
}

export const StatusTracker: React.FC<StatusTrackerProps> = ({
  initialToken,
  onNavigateToGalleryWithFilter,
}) => {
  const [token, setToken] = useState(initialToken || '');
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<StatusProjectDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialToken) {
      setToken(initialToken);
      fetchStatus(initialToken);
    }
  }, [initialToken]);

  const fetchStatus = async (tokenToFetch: string) => {
    const cleanToken = tokenToFetch.trim();
    if (!cleanToken) return;

    setLoading(true);
    setError(null);
    setProject(null);

    const res = await api.getProjectStatus(cleanToken);
    setLoading(false);

    if (res.error) {
      setError(res.error.message || 'No submission found for this tracking token.');
      return;
    }

    if (res.data) {
      setProject(res.data);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStatus(token);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Submission Status Tracker
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Track the administrative review progress of your project submission without an account.
        </p>
      </div>

      {/* Token Search Bar */}
      <form onSubmit={handleSearchSubmit} className="mb-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your 64-character tracking token here..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Lookup</span>}
          </button>
        </div>
      </form>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
          <h3 className="text-base font-semibold text-red-900 dark:text-red-200">
            Submission Not Found
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Project Status Card */}
      {project && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-in fade-in duration-200">
          {/* Status Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Current Review Status
              </span>
              <div className="mt-1 flex items-center gap-2">
                {project.status === 'PENDING' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    In Review (Pending)
                  </span>
                )}
                {project.status === 'APPROVED' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Approved & Published
                  </span>
                )}
                {project.status === 'REJECTED' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900">
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                    Requires Revision / Declined
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Link Copied' : 'Share Status Link'}</span>
            </button>
          </div>

          {/* Detailed Message by Status */}
          <div className="my-6">
            {project.status === 'PENDING' && (
              <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 p-4">
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Moderation in progress
                </h4>
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Your submission has been safely recorded and queued for administrative review. Our moderators will verify your code repository, test your live demo, and verify project metadata.
                </p>
              </div>
            )}

            {project.status === 'APPROVED' && (
              <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                      Congratulations! Your project is live!
                    </h4>
                    <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                      Your submission passed moderation and is now featured in the campus public gallery.
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigateToGalleryWithFilter(project.title)}
                    className="shrink-0 ml-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors"
                  >
                    <span>View in Showcase</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {project.status === 'REJECTED' && (
              <div className="rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/60 p-4">
                <h4 className="text-sm font-semibold text-red-900 dark:text-red-200">
                  Moderator Feedback
                </h4>
                <p className="mt-1 text-xs text-red-800 dark:text-red-300 font-medium">
                  {project.rejectionReason || 'Project does not currently meet showcase criteria.'}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  You are welcome to address this feedback and submit an updated project.
                </p>
              </div>
            )}
          </div>

          {/* Project Details */}
          <div className="space-y-4 pt-2">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <User className="h-3.5 w-3.5" />
                <span>{project.studentName}</span>
                <span aria-hidden="true">·</span>
                <Calendar className="h-3.5 w-3.5" />
                <span>Submitted {new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {project.title}
              </h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {project.description}
            </p>

            <div className="flex flex-wrap gap-1.5 pt-2">
              {project.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  #{t}
                </span>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                >
                  <Github className="h-3.5 w-3.5" />
                  <span>GitHub Repository</span>
                </a>
              )}
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Live Preview</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
