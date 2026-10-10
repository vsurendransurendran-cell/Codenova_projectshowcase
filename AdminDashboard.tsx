import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  Trash2,
  ExternalLink,
  Github,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
  History,
  RefreshCw,
  Loader2,
  Check,
  Eye,
  X,
  FileText,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { ProjectAdminView, AdminUser, AdminActionRecord } from '../types.js';

interface AdminDashboardProps {
  user: AdminUser;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  // Tabs: PENDING, APPROVED, REJECTED, AUDIT
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'AUDIT'>('PENDING');
  const [projects, setProjects] = useState<ProjectAdminView[]>([]);
  const [stats, setStats] = useState<{ PENDING: number; APPROVED: number; REJECTED: number; TOTAL: number }>({
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    TOTAL: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Review Drawer state
  const [activeProject, setActiveProject] = useState<ProjectAdminView | null>(null);
  const [recheckResults, setRecheckResults] = useState<{
    github?: { valid: boolean; error?: string };
    live?: { valid: boolean; error?: string };
  } | null>(null);
  const [isRechecking, setIsRechecking] = useState(false);

  // Reject modal state
  const [rejectingProject, setRejectingProject] = useState<ProjectAdminView | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectModalError, setRejectModalError] = useState('');

  // Bulk reject modal state
  const [isBulkRejectOpen, setIsBulkRejectOpen] = useState(false);
  const [bulkRejectionReason, setBulkRejectionReason] = useState('');

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AdminActionRecord[]>([]);

  // Action status message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    const [statsRes, listRes] = await Promise.all([
      api.getAdminStats(),
      api.getAdminProjects({
        status: activeTab === 'AUDIT' ? undefined : activeTab,
        q: searchTerm,
      }),
    ]);

    if (statsRes.data) {
      setStats(statsRes.data);
    }
    if (listRes.data) {
      setProjects(listRes.data.projects);
    }

    if (activeTab === 'AUDIT') {
      const logsRes = await api.getAuditLogs();
      if (logsRes.data) {
        setAuditLogs(logsRes.data);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    setSelectedIds([]);
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Optimistic moderation
  const handleModerate = async (
    projectId: string,
    status: 'APPROVED' | 'REJECTED' | 'PENDING',
    reason?: string
  ) => {
    // Optimistic UI update
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (activeProject && activeProject.id === projectId) {
      setActiveProject(null);
    }

    const res = await api.moderateProject(projectId, {
      status,
      rejectionReason: reason,
    });

    if (res.error) {
      showToast(`Error: ${res.error.message}`);
      loadData(); // rollback
      return;
    }

    showToast(`Project ${status.toLowerCase()} successfully`);
    // Refresh stats
    const statsRes = await api.getAdminStats();
    if (statsRes.data) setStats(statsRes.data);
  };

  // Delete project
  const handleDelete = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this project?')) return;

    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (activeProject && activeProject.id === projectId) {
      setActiveProject(null);
    }

    const res = await api.deleteProject(projectId);
    if (res.error) {
      showToast(`Error: ${res.error.message}`);
      loadData();
      return;
    }

    showToast('Project deleted');
    const statsRes = await api.getAdminStats();
    if (statsRes.data) setStats(statsRes.data);
  };

  // Bulk actions
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    const toUpdate = [...selectedIds];
    setSelectedIds([]);

    const res = await api.bulkModerate({
      projectIds: toUpdate,
      action: 'APPROVE',
    });

    if (res.error) {
      showToast(`Bulk error: ${res.error.message}`);
    } else {
      showToast(`Approved ${toUpdate.length} projects`);
    }
    loadData();
  };

  const handleBulkRejectSubmit = async () => {
    if (!bulkRejectionReason.trim() || bulkRejectionReason.trim().length < 5) {
      alert('A rejection reason of at least 5 characters is required');
      return;
    }

    const toUpdate = [...selectedIds];
    setSelectedIds([]);
    setIsBulkRejectOpen(false);

    const res = await api.bulkModerate({
      projectIds: toUpdate,
      action: 'REJECT',
      rejectionReason: bulkRejectionReason,
    });

    setBulkRejectionReason('');
    if (res.error) {
      showToast(`Bulk error: ${res.error.message}`);
    } else {
      showToast(`Rejected ${toUpdate.length} projects`);
    }
    loadData();
  };

  // Link Re-check
  const handleRecheckLinks = async (projectId: string) => {
    setIsRechecking(true);
    setRecheckResults(null);
    const res = await api.recheckLinks(projectId);
    setIsRechecking(false);
    if (res.data) {
      setRecheckResults(res.data);
    }
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === projects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(projects.map((p) => p.id));
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 text-white px-4 py-2.5 shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white text-xs">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Project Moderation Portal
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Logged in as <span className="font-semibold text-slate-700 dark:text-slate-300">{user.email}</span> ({user.role})
          </p>
        </div>

        {/* Refresh / Logout */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Tabs / Filter Bar */}
      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'PENDING'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span>Pending Review</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {stats.PENDING}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'APPROVED'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            <span>Approved</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {stats.APPROVED}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'REJECTED'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <XCircle className="h-3.5 w-3.5 text-red-500" />
            <span>Rejected</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
              {stats.REJECTED}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'AUDIT'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <History className="h-3.5 w-3.5 text-indigo-500" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* Search */}
        {activeTab !== 'AUDIT' && (
          <form onSubmit={handleSearchSubmit} className="relative sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter queue by title/author..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </form>
        )}
      </div>

      {/* Bulk Action Controls */}
      {selectedIds.length > 0 && activeTab !== 'AUDIT' && (
        <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900 animate-in fade-in duration-150">
          <div className="text-xs font-medium text-indigo-900 dark:text-indigo-200">
            {selectedIds.length} project{selectedIds.length > 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkApprove}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Approve All</span>
            </button>
            <button
              onClick={() => setIsBulkRejectOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-500"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reject All</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-500 hover:text-slate-800 ml-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="mt-6">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-2 text-xs text-slate-500">Loading moderation records...</p>
          </div>
        ) : activeTab === 'AUDIT' ? (
          /* Audit Logs View */
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Administrative Audit Log (Recent Actions)
              </h3>
              <span className="text-xs text-slate-400">Chronological action records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Admin</th>
                    <th className="px-6 py-3">Action</th>
                    <th className="px-6 py-3">Target Project</th>
                    <th className="px-6 py-3">Notes / Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        No audit actions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-6 py-3 font-mono text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {log.adminEmail}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                              log.action === 'APPROVE'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : log.action === 'REJECT'
                                ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                                : log.action === 'DELETE'
                                ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-medium text-slate-900 dark:text-white max-w-[200px] truncate">
                          {log.projectTitle}
                        </td>
                        <td className="px-6 py-3 text-slate-600 dark:text-slate-400 max-w-[300px] truncate">
                          {log.note || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : projects.length === 0 ? (
          /* Empty state */
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-emerald-500 mb-2" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Queue is clear
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              No projects matching status "{activeTab}" at the moment.
            </p>
          </div>
        ) : (
          /* Projects Table / Queue */
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium"
                >
                  {selectedIds.length === projects.length ? (
                    <CheckSquare className="h-4 w-4 text-indigo-600" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-400" />
                  )}
                  <span>Select All ({projects.length})</span>
                </button>
              </div>
              <span className="text-slate-400">Click any row to open full review drawer</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {projects.map((proj) => {
                const isSelected = selectedIds.includes(proj.id);
                return (
                  <div
                    key={proj.id}
                    className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(proj.id);
                        }}
                        className="mt-1 text-slate-400 hover:text-indigo-600"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-indigo-600" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setActiveProject(proj)}>
                        <div className="flex items-center gap-2 mb-1 text-xs text-slate-500">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {proj.studentName}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{new Date(proj.createdAt).toLocaleDateString()}</span>
                          {proj.status === 'REJECTED' && (
                            <span className="text-[10px] text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-950/60 px-1.5 rounded">
                              Declined
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                          {proj.title}
                        </h4>

                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                          {proj.description}
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          {proj.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        onClick={() => setActiveProject(proj)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Review</span>
                      </button>

                      {proj.status !== 'APPROVED' && (
                        <button
                          onClick={() => handleModerate(proj.id, 'APPROVED')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors shadow-2xs"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </button>
                      )}

                      {proj.status !== 'REJECTED' && (
                        <button
                          onClick={() => {
                            setRejectingProject(proj);
                            setRejectionReason('');
                            setRejectModalError('');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>
                      )}

                      {proj.status !== 'PENDING' && (
                        <button
                          onClick={() => handleModerate(proj.id, 'PENDING')}
                          title="Revert back to Pending"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(proj.id)}
                        title="Delete project"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* REVIEW DRAWER / MODAL */}
      {activeProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 sm:p-8 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setActiveProject(null);
                setRecheckResults(null);
              }}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 mb-2 text-xs">
              <span
                className={`font-semibold px-2.5 py-0.5 rounded-full ${
                  activeProject.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : activeProject.status === 'REJECTED'
                    ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                Status: {activeProject.status}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500 font-mono">ID: {activeProject.id.slice(0, 8)}...</span>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {activeProject.title}
            </h2>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Submitted by <span className="font-semibold">{activeProject.studentName}</span> on{' '}
              {new Date(activeProject.createdAt).toLocaleString()}
            </p>

            {/* Description */}
            <div className="mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Project Summary
              </h4>
              <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                {activeProject.description}
              </p>
            </div>

            {/* Tags */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {activeProject.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  #{t}
                </span>
              ))}
            </div>

            {/* Links and Live Verification Inspector */}
            <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Project URLs & Verification Inspector
                </h4>
                <button
                  onClick={() => handleRecheckLinks(activeProject.id)}
                  disabled={isRechecking}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRechecking ? 'animate-spin' : ''}`} />
                  <span>{isRechecking ? 'Testing links...' : 'Re-verify URLs Now'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* GitHub */}
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <Github className="h-3.5 w-3.5" /> GitHub Repo
                    </span>
                    <a
                      href={activeProject.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
                    {activeProject.githubUrl}
                  </p>
                  {recheckResults?.github && (
                    <div className="mt-2 text-[11px]">
                      {recheckResults.github.valid ? (
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Valid public repository
                        </span>
                      ) : (
                        <span className="text-red-600 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {recheckResults.github.error}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Demo */}
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <ExternalLink className="h-3.5 w-3.5" /> Live Demo
                    </span>
                    <a
                      href={activeProject.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
                    {activeProject.liveUrl}
                  </p>
                  {recheckResults?.live && (
                    <div className="mt-2 text-[11px]">
                      {recheckResults.live.valid ? (
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> URL online & passed SSRF checks
                        </span>
                      ) : (
                        <span className="text-red-600 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {recheckResults.live.error}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submitter Privacy & Tracking Data */}
            <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-wrap gap-4 text-[11px] text-slate-400">
              <div>
                <span className="font-semibold text-slate-500">Submitter IP Hash:</span>{' '}
                <span className="font-mono">{activeProject.submitterIpHash.slice(0, 16)}...</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Tracking Token:</span>{' '}
                <span className="font-mono">{activeProject.trackingToken.slice(0, 16)}...</span>
              </div>
              {activeProject.rejectionReason && (
                <div className="w-full mt-1 p-2 rounded bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300">
                  <span className="font-bold">Prior Rejection Reason:</span> {activeProject.rejectionReason}
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-5 flex items-center justify-between gap-3">
              <button
                onClick={() => handleDelete(activeProject.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setRejectingProject(activeProject);
                    setRejectionReason('');
                    setRejectModalError('');
                  }}
                  className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40 transition-colors"
                >
                  Reject with Reason
                </button>
                <button
                  onClick={() => handleModerate(activeProject.id, 'APPROVED')}
                  className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors shadow-sm"
                >
                  Approve & Feature in Gallery
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE REJECT REASON MODAL */}
      {rejectingProject && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Decline Submission
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Provide constructive feedback for "{rejectingProject.title}". The student will see this on their tracking page.
            </p>

            {rejectModalError && (
              <p className="mt-3 text-xs text-red-600 font-medium">{rejectModalError}</p>
            )}

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Rejection Reason (required, min 5 chars)
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Repository is missing a README with instructions, or demo is returning 404..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-800 dark:text-slate-200 focus-visible:outline-indigo-500"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectingProject(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
                    setRejectModalError('Please specify at least 5 characters for the rejection reason.');
                    return;
                  }
                  handleModerate(rejectingProject.id, 'REJECTED', rejectionReason);
                  setRejectingProject(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK REJECT MODAL */}
      {isBulkRejectOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Bulk Reject {selectedIds.length} Projects
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              This feedback will be attached to all selected submissions.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Rejection
              </label>
              <textarea
                rows={3}
                value={bulkRejectionReason}
                onChange={(e) => setBulkRejectionReason(e.target.value)}
                placeholder="e.g. Does not meet academic showcase guidelines."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsBulkRejectOpen(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkRejectSubmit}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500"
              >
                Confirm Bulk Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
