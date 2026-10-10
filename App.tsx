import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { ProjectCard } from './components/ProjectCard.js';
import { ProjectModal } from './components/ProjectModal.js';
import { TagFilter } from './components/TagFilter.js';
import { SubmissionForm } from './components/SubmissionForm.js';
import { StatusTracker } from './components/StatusTracker.js';
import { Guidelines } from './components/Guidelines.js';
import { AdminLogin } from './components/AdminLogin.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { useTheme } from './lib/theme.js';
import { api } from './lib/api.js';
import { ProjectPublic, TagWithCount, AdminUser } from './types.js';
import {
  Search,
  Sparkles,
  Loader2,
  FolderGit2,
  Users,
  Compass,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Code,
} from 'lucide-react';

export default function App() {
  const { isDark, toggleTheme } = useTheme();

  // Navigation State
  const [currentView, setCurrentView] = useState<string>('gallery');
  const [statusToken, setStatusToken] = useState<string>('');

  // Admin Auth State
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  // Gallery State
  const [projects, setProjects] = useState<ProjectPublic[]>([]);
  const [totalProjects, setTotalProjects] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(true);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  // Project Modal State
  const [selectedProject, setSelectedProject] = useState<ProjectPublic | null>(null);

  // Check admin session on initial load
  useEffect(() => {
    api.getAdminMe().then((res) => {
      if (res.data?.user) {
        setAdminUser(res.data.user);
      }
    });

    // Parse URL on initial load for deep linking (e.g. /status/:token or ?q= or ?tags=)
    const urlParams = new URLSearchParams(window.location.search);
    const path = window.location.pathname;

    if (path.startsWith('/status/')) {
      const token = path.replace('/status/', '');
      if (token) {
        setStatusToken(token);
        setCurrentView('status');
      }
    } else if (path === '/submit') {
      setCurrentView('submit');
    } else if (path === '/admin') {
      setCurrentView('admin');
    } else if (path === '/guidelines') {
      setCurrentView('guidelines');
    }

    const q = urlParams.get('q');
    if (q) {
      setSearchQuery(q);
      setDebouncedQuery(q);
    }
    const tagsParam = urlParams.get('tags');
    if (tagsParam) {
      setSelectedTags(tagsParam.split(',').filter(Boolean));
    }
  }, []);

  // Debounce search query 300ms (Acceptance Criterion C)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync state to URL params without full page reload
  useEffect(() => {
    if (currentView === 'gallery') {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
      if (currentPage > 1) params.set('page', currentPage.toString());
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [debouncedQuery, selectedTags, currentPage, currentView]);

  // Fetch approved projects
  const fetchProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    setGalleryError(null);
    try {
      const [projRes, tagsRes] = await Promise.all([
        api.getProjects({
          q: debouncedQuery,
          tags: selectedTags,
          page: currentPage,
          limit: 12,
        }),
        api.getTags(),
      ]);

      if (projRes.error) {
        setGalleryError(projRes.error.message);
      } else if (projRes.data) {
        setProjects(projRes.data.projects);
        setTotalProjects(projRes.data.total);
        setTotalPages(projRes.data.totalPages);
      }

      if (tagsRes.data) {
        setTags(tagsRes.data);
      }
    } catch (err: any) {
      setGalleryError('Failed to fetch projects. Please try refreshing.');
    } finally {
      setIsLoadingProjects(false);
    }
  }, [debouncedQuery, selectedTags, currentPage]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Navigation handler
  const handleNavigate = (view: string, token?: string) => {
    setCurrentView(view);
    if (token) {
      setStatusToken(token);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLogout = async () => {
    await api.adminLogout();
    setAdminUser(null);
    setCurrentView('gallery');
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setCurrentPage(1);
  };

  const handleClearTags = () => {
    setSelectedTags([]);
    setCurrentPage(1);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        adminUser={adminUser}
        onAdminLogout={handleAdminLogout}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1">
        {/* VIEW: SUBMIT */}
        {currentView === 'submit' && (
          <SubmissionForm
            availableTags={tags}
            onNavigateToStatus={(token) => handleNavigate('status', token)}
          />
        )}

        {/* VIEW: STATUS */}
        {currentView === 'status' && (
          <StatusTracker
            initialToken={statusToken}
            onNavigateToGalleryWithFilter={(title) => {
              setSearchQuery(title);
              setCurrentView('gallery');
            }}
          />
        )}

        {/* VIEW: GUIDELINES */}
        {currentView === 'guidelines' && (
          <Guidelines onNavigateToSubmit={() => handleNavigate('submit')} />
        )}

        {/* VIEW: ADMIN LOGIN */}
        {currentView === 'admin-login' && (
          <AdminLogin
            onLoginSuccess={(user) => {
              setAdminUser(user);
              setCurrentView('admin');
            }}
            onNavigateHome={() => handleNavigate('gallery')}
          />
        )}

        {/* VIEW: ADMIN DASHBOARD */}
        {currentView === 'admin' && (
          adminUser ? (
            <AdminDashboard user={adminUser} onLogout={handleAdminLogout} />
          ) : (
            <AdminLogin
              onLoginSuccess={(user) => {
                setAdminUser(user);
                setCurrentView('admin');
              }}
              onNavigateHome={() => handleNavigate('gallery')}
            />
          )
        )}

        {/* VIEW: GALLERY / HOME */}
        {currentView === 'gallery' && (
          <div>
            {/* Hero Section */}
            <section className="border-b border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900/50 py-12 sm:py-16">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 mb-4">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Peer-Reviewed Student Engineering Showcase</span>
                  </div>

                  <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                    Where Student Work Becomes Public Innovation.
                  </h1>

                  <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                    Explore verified university capstone projects, algorithmic research prototypes, and open-source software built by students across engineering, computing, and design.
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleNavigate('submit')}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-600 transition-colors"
                    >
                      <span>Submit Your Project</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleNavigate('guidelines')}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span>Showcase Guidelines</span>
                    </button>
                  </div>

                  {/* High level stats banner */}
                  <div className="mt-10 flex flex-wrap items-center gap-6 sm:gap-10 border-t border-slate-100 dark:border-slate-800 pt-6 text-xs text-slate-500 dark:text-slate-400">
                    <div>
                      <span className="block text-xl font-bold text-slate-900 dark:text-white">
                        {totalProjects > 0 ? totalProjects : '8+'}
                      </span>
                      <span>Verified Projects Live</span>
                    </div>
                    <div>
                      <span className="block text-xl font-bold text-slate-900 dark:text-white">
                        100%
                      </span>
                      <span>Link & SSRF Inspected</span>
                    </div>
                    <div>
                      <span className="block text-xl font-bold text-slate-900 dark:text-white">
                        {tags.length > 0 ? tags.length : '10+'}
                      </span>
                      <span>Technology Domains</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Gallery Section */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
              {/* Search & Filter Bar */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
                {/* Search input */}
                <div className="relative flex-1 max-w-lg">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, student name, description, or tech stack..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span>
                    Showing <strong className="text-slate-800 dark:text-slate-200">{projects.length}</strong> of{' '}
                    <strong className="text-slate-800 dark:text-slate-200">{totalProjects}</strong> approved projects
                  </span>
                </div>
              </div>

              {/* Tag Filters */}
              <TagFilter
                tags={tags}
                selectedTags={selectedTags}
                onToggleTag={handleToggleTag}
                onClearTags={handleClearTags}
              />

              {/* Error State */}
              {galleryError && (
                <div className="my-8 rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40">
                  <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
                  <p className="text-sm text-red-800 dark:text-red-300 mb-3">{galleryError}</p>
                  <button
                    onClick={fetchProjects}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              {/* Loading Skeletons */}
              {isLoadingProjects ? (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse space-y-4"
                    >
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
                      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-4/5"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-14"></div>
                        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : projects.length === 0 ? (
                /* Empty State */
                <div className="mt-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
                  <FolderGit2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    No matching approved projects
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    We couldn't find any approved projects matching your filters. Try clearing your search term or selecting different technology tags.
                  </p>
                  {(debouncedQuery || selectedTags.length > 0) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedTags([]);
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              ) : (
                /* Projects Grid */
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onSelectTag={(tag) => {
                        if (!selectedTags.includes(tag)) {
                          setSelectedTags((prev) => [...prev, tag]);
                          setCurrentPage(1);
                        }
                      }}
                      onOpenDetails={(proj) => setSelectedProject(proj)}
                    />
                  ))}
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-500">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Project Overview Modal */}
      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onSelectTag={(tag) => {
          if (!selectedTags.includes(tag)) {
            setSelectedTags((prev) => [...prev, tag]);
            setCurrentPage(1);
          }
        }}
      />

      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
