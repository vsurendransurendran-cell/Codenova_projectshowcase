import React from 'react';
import { X, Github, ExternalLink, User, Calendar, Share2, Check } from 'lucide-react';
import { ProjectPublic } from '../types.js';

interface ProjectModalProps {
  project: ProjectPublic | null;
  onClose: () => void;
  onSelectTag: (tag: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose, onSelectTag }) => {
  const [copied, setCopied] = React.useState(false);

  if (!project) return null;

  const handleCopyLink = () => {
    const url = window.location.origin + '?q=' + encodeURIComponent(project.title);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(project.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors focus-visible:outline-indigo-500"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
          <User className="h-3.5 w-3.5" />
          <span className="font-medium text-slate-800 dark:text-slate-200">{project.studentName}</span>
          <span aria-hidden="true">·</span>
          <Calendar className="h-3.5 w-3.5" />
          <span>{formattedDate}</span>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
          {project.title}
        </h2>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                onSelectTag(tag);
                onClose();
              }}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>

        <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Project Overview
          </h4>
          <p className="text-base text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
            {project.description}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
            <span>{copied ? 'Link Copied!' : 'Share Showcase'}</span>
          </button>

          <div className="flex items-center gap-3">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              >
                <Github className="h-4 w-4" />
                <span>GitHub Repository</span>
              </a>
            )}

            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open Live Demo</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
