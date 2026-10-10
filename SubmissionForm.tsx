import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink,
  Github,
  Globe,
  Tag,
  X,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { TagWithCount } from '../types.js';

interface SubmissionFormProps {
  onNavigateToStatus: (token: string) => void;
  availableTags: TagWithCount[];
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({
  onNavigateToStatus,
  availableTags,
}) => {
  // Form State
  const [title, setTitle] = useState('');
  const [studentName, setStudentName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Anti-bot honeypot

  // Validation & UI State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isVerifyingLinks, setIsVerifyingLinks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    token: string;
    trackingUrl: string;
    title: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Suggested popular tags
  const defaultPopularTags = ['react', 'typescript', 'python', 'machine-learning', 'rust', 'nextjs', 'cybersecurity', 'iot'];
  const suggestedTags = Array.from(
    new Set([
      ...availableTags.map((t) => t.name),
      ...defaultPopularTags,
    ])
  ).filter((t) => !tags.includes(t) && (!tagInput || t.includes(tagInput.toLowerCase())));

  const handleAddTag = (rawTag: string) => {
    const cleaned = rawTag.toLowerCase().trim().replace(/[^a-z0-9\-#\+\.]/g, '');
    if (!cleaned) return;
    if (tags.length >= 6) {
      setErrors((prev) => ({ ...prev, tags: 'Maximum of 6 tags allowed' }));
      return;
    }
    if (tags.includes(cleaned)) return;

    setTags([...tags, cleaned]);
    setTagInput('');
    setErrors((prev) => {
      const next = { ...prev };
      delete next.tags;
      return next;
    });
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const validateLocal = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim() || title.trim().length < 3) {
      newErrors.title = 'Project title must be at least 3 characters.';
    } else if (title.trim().length > 80) {
      newErrors.title = 'Project title cannot exceed 80 characters.';
    }

    if (!studentName.trim() || studentName.trim().length < 2) {
      newErrors.studentName = 'Student or team name must be at least 2 characters.';
    } else if (studentName.trim().length > 60) {
      newErrors.studentName = 'Name cannot exceed 60 characters.';
    }

    if (!description.trim() || description.trim().length < 20) {
      newErrors.description = 'Please provide at least 20 characters describing your project.';
    } else if (description.trim().length > 1000) {
      newErrors.description = 'Description cannot exceed 1000 characters.';
    }

    if (tags.length === 0) {
      newErrors.tags = 'Add at least 1 technology tag.';
    }

    const githubRegex = /^https:\/\/github\.com\/[a-zA-Z0-9_\-\.]+\/[a-zA-Z0-9_\-\.]+\/?$/;
    if (!githubUrl.trim()) {
      newErrors.githubUrl = 'GitHub repository URL is required.';
    } else if (!githubRegex.test(githubUrl.trim())) {
      newErrors.githubUrl = 'Must match format https://github.com/owner/repository';
    }

    if (!liveUrl.trim()) {
      newErrors.liveUrl = 'Live preview demo URL is required.';
    } else if (!liveUrl.trim().startsWith('https://')) {
      newErrors.liveUrl = 'Live URL must start with https:// for security.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLocal()) return;

    // Show link verification progress
    setIsVerifyingLinks(true);
    setErrors({});

    try {
      // Step 1: Pre-verify links through server validator
      const verifyRes = await api.validateLinks(githubUrl, liveUrl);
      const urlErrors: Record<string, string> = {};

      if (verifyRes.data?.github && !verifyRes.data.github.valid) {
        urlErrors.githubUrl = verifyRes.data.github.error || 'GitHub repository not found or is private.';
      }

      if (verifyRes.data?.live && !verifyRes.data.live.valid) {
        urlErrors.liveUrl = verifyRes.data.live.error || 'Demo preview URL is unreachable or violates SSRF rules.';
      }

      if (Object.keys(urlErrors).length > 0) {
        setErrors(urlErrors);
        setIsVerifyingLinks(false);
        return;
      }

      // Step 2: Final Submission
      setIsVerifyingLinks(false);
      setIsSubmitting(true);

      const submitRes = await api.submitProject({
        title,
        studentName,
        description,
        tags,
        githubUrl,
        liveUrl,
        honeypot,
      });

      setIsSubmitting(false);

      if (submitRes.error) {
        if (submitRes.error.fields) {
          setErrors(submitRes.error.fields);
        } else {
          setErrors({ form: submitRes.error.message });
        }
        return;
      }

      if (submitRes.data) {
        const fullTrackingUrl = `${window.location.origin}/status/${submitRes.data.trackingToken}`;
        setSubmissionSuccess({
          token: submitRes.data.trackingToken,
          trackingUrl: fullTrackingUrl,
          title,
        });
      }
    } catch (err: any) {
      setIsVerifyingLinks(false);
      setIsSubmitting(false);
      setErrors({ form: 'An unexpected connection error occurred. Please try again.' });
    }
  };

  const handleCopyLink = () => {
    if (!submissionSuccess) return;
    navigator.clipboard.writeText(submissionSuccess.trackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // SUCCESS SCREEN: Submitted for review with private tracking link
  if (submissionSuccess) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-center animate-in fade-in duration-200">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Submitted for Review!
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Your project <span className="font-semibold text-slate-800 dark:text-slate-200">"{submissionSuccess.title}"</span> is currently <span className="font-semibold text-amber-600 dark:text-amber-400">PENDING</span> moderation. Once reviewed by our faculty admins, it will appear in the public showcase.
          </p>

          {/* Tracking Link Box */}
          <div className="mt-8 rounded-xl bg-slate-50 p-5 text-left border border-slate-200 dark:bg-slate-800/60 dark:border-slate-700">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Private Status Tracking Link
              </span>
              <span className="text-xs text-slate-400">No account required</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Bookmark or copy this link. You can return anytime to check whether your submission has been approved or review moderator feedback.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                readOnly
                value={submissionSuccess.trackingUrl}
                className="w-full text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 select-all"
              />
              <button
                onClick={handleCopyLink}
                className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                {copiedLink ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onNavigateToStatus(submissionSuccess.token)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors"
            >
              <span>View Tracking Page</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setSubmissionSuccess(null);
                setTitle('');
                setDescription('');
                setTags([]);
                setGithubUrl('');
                setLiveUrl('');
              }}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Submit Another Project
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Submit Your Project
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Share your engineering build, research prototype, or open-source software with the campus community. Submissions are reviewed by moderators within 24 hours.
        </p>
      </div>

      {errors.form && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200 dark:bg-red-950/40 dark:border-red-900 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-800 dark:text-red-300">{errors.form}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Honeypot field (hidden from legitimate users) */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="company_website">Do not fill this</label>
          <input
            id="company_website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {/* Project Title */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="title" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Project Title <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-slate-400 font-mono">
              {title.length}/80
            </span>
          </div>
          <input
            id="title"
            type="text"
            maxLength={80}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
            }}
            placeholder="e.g. NeuralTrace: Real-Time Saccadic Eye Tracking"
            className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors dark:bg-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              errors.title
                ? 'border-red-500 bg-red-50/30'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
            }`}
          />
          {errors.title && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.title}</p>}
        </div>

        {/* Student / Team Name */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="studentName" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Author / Team Name <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-slate-400 font-mono">
              {studentName.length}/60
            </span>
          </div>
          <input
            id="studentName"
            type="text"
            maxLength={60}
            value={studentName}
            onChange={(e) => {
              setStudentName(e.target.value);
              if (errors.studentName) setErrors((prev) => ({ ...prev, studentName: '' }));
            }}
            placeholder="e.g. Elena Rostova & Liam Chen (Biomedical Eng)"
            className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors dark:bg-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              errors.studentName
                ? 'border-red-500 bg-red-50/30'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
            }`}
          />
          {errors.studentName && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.studentName}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="description" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Project Description <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-slate-400 font-mono">
              {description.length}/1000
            </span>
          </div>
          <textarea
            id="description"
            rows={4}
            maxLength={1000}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
            }}
            placeholder="Explain what problem your project solves, the architecture, key algorithms, and instructions on how to use it..."
            className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors dark:bg-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 leading-relaxed ${
              errors.description
                ? 'border-red-500 bg-red-50/30'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
            }`}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.description}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Minimum 20 characters. Include technologies used, system architecture, or novel methodology.
          </p>
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Technologies / Tags <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-slate-400">{tags.length}/6 tags</span>
          </div>

          {/* Active chips */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 min-h-[46px]">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 px-2.5 py-1 rounded-md font-medium"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-indigo-950 dark:hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {tags.length < 6 && (
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDownTag}
                placeholder={tags.length === 0 ? 'Type tag and hit Enter (e.g. rust, react)...' : 'Add another tag...'}
                className="text-xs bg-transparent border-none focus:outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400 flex-1 min-w-[140px] px-1 py-0.5"
              />
            )}
          </div>
          {errors.tags && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.tags}</p>}

          {/* Tag suggestions */}
          {suggestedTags.length > 0 && tags.length < 6 && (
            <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-slate-500">
              <span className="text-slate-400">Suggestions:</span>
              {suggestedTags.slice(0, 6).map((suggest) => (
                <button
                  key={suggest}
                  type="button"
                  onClick={() => handleAddTag(suggest)}
                  className="hover:text-indigo-600 underline cursor-pointer px-1 py-0.5"
                >
                  +{suggest}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* URLs with strict validation feedback */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* GitHub URL */}
          <div>
            <label htmlFor="githubUrl" className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              <Github className="h-4 w-4" />
              <span>GitHub Repository URL <span className="text-red-500">*</span></span>
            </label>
            <input
              id="githubUrl"
              type="text"
              value={githubUrl}
              onChange={(e) => {
                setGithubUrl(e.target.value);
                if (errors.githubUrl) setErrors((prev) => ({ ...prev, githubUrl: '' }));
              }}
              placeholder="https://github.com/owner/repository"
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors dark:bg-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                errors.githubUrl
                  ? 'border-red-500 bg-red-50/30'
                  : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
              }`}
            />
            {errors.githubUrl && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.githubUrl}</p>
            )}
            <p className="mt-1 text-[11px] text-slate-400">
              Must be a public repository. We verify existence via GitHub API before accepting.
            </p>
          </div>

          {/* Live Preview URL */}
          <div>
            <label htmlFor="liveUrl" className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              <Globe className="h-4 w-4" />
              <span>Live Preview / Demo URL <span className="text-red-500">*</span></span>
            </label>
            <input
              id="liveUrl"
              type="url"
              value={liveUrl}
              onChange={(e) => {
                setLiveUrl(e.target.value);
                if (errors.liveUrl) setErrors((prev) => ({ ...prev, liveUrl: '' }));
              }}
              placeholder="https://yourproject.example.com"
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors dark:bg-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                errors.liveUrl
                  ? 'border-red-500 bg-red-50/30'
                  : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
              }`}
            />
            {errors.liveUrl && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.liveUrl}</p>
            )}
            <p className="mt-1 text-[11px] text-slate-400">
              Must be secure HTTPS. Server validates HTTP status &lt; 400 and blocks private IP ranges.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="submit"
            disabled={isVerifyingLinks || isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {isVerifyingLinks ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying repository & live demo links...</span>
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Submitting project for review...</span>
              </>
            ) : (
              <>
                <span>Submit for Administrative Review</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            By submitting, you confirm that this project was created by you or your campus team.
          </p>
        </div>
      </form>
    </div>
  );
};
