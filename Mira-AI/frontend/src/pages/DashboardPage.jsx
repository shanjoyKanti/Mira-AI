import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  FolderOpen, CheckCircle, Clock, AlertCircle, ArrowRight,
  Zap, Shield, BarChart3, Plus, RefreshCw, GitBranch,
  ChevronRight, Activity, Trash2, Loader2, X, Cpu,
} from 'lucide-react';
import { LLMSwitchDialog } from '../components/ui/LLMSwitchDialog';
import { useGetProjectStatsQuery, useGetAdminStatsQuery, useGetAdminUsageQuery, useDeleteProjectMutation } from '../store/slices/projectsApiSlice';
import { apiService } from '../utils/api';
import toast from 'react-hot-toast';

// Show at most this many entries in the Recent Migrations list…
const MIGRATIONS_LIMIT = 3;
// …and in the Your Projects list.
const RECENT_LIMIT = 5;

// Session-scoped cache so the dashboard lists paint instantly on revisit
// (same login session) instead of waiting for the API round-trip every time.
// Keyed per user so switching accounts never shows someone else's projects.
const DASH_CACHE_PREFIX = 'mira-dashboard-cache:';
const dashCacheKey = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return DASH_CACHE_PREFIX + (u.id || u._id || u.email || 'me');
  } catch {
    return DASH_CACHE_PREFIX + 'me';
  }
};
const readDashCache = () => {
  try {
    const raw = sessionStorage.getItem(dashCacheKey());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeDashCache = (data) => {
  try {
    sessionStorage.setItem(dashCacheKey(), JSON.stringify(data));
  } catch { /* storage full/unavailable — cache is best-effort */ }
};

const STATUS_CONFIG = {
  completed: { color: 'bg-green-100 text-green-800', label: 'Completed', icon: CheckCircle },
  running:   { color: 'bg-blue-100 text-blue-800',   label: 'Running',   icon: Clock },
  failed:    { color: 'bg-red-100 text-red-800',     label: 'Failed',    icon: AlertCircle },
  cancelled: { color: 'bg-gray-100 text-gray-700',   label: 'Cancelled', icon: X },
  interrupted: { color: 'bg-amber-100 text-amber-800', label: 'Interrupted', icon: AlertCircle },
  in_progress: { color: 'bg-blue-100 text-blue-800', label: 'In Progress', icon: Activity },
  pending:   { color: 'bg-yellow-100 text-yellow-800', label: 'Pending', icon: Clock },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
};

// A migration is only "completed" when Step 4 (code modernization) has
// completed - finishing an earlier step is NOT the whole pipeline. Order of
// precedence otherwise: actively running → failed → interrupted → cancelled →
// partially done (in progress) → not started (pending).
const getTransformStatus = (t) => {
  const steps = [t.step_1_status, t.step_2_status, t.step_3_status, t.step_4_status];
  if (t.step_4_status === 'completed') return 'completed';
  if (steps.includes('running'))     return 'running';
  if (steps.includes('failed'))      return 'failed';
  if (steps.includes('interrupted')) return 'interrupted';
  if (steps.includes('cancelled'))   return 'cancelled';
  if (steps.some(s => s === 'completed')) return 'in_progress'; // started, not finished
  return 'pending';
};

// The stats endpoint counts user_projects.status, which the backend never
// writes — so Completed/In Progress/Failed would always read 0 there. Derive
// them live instead: latest migration per project, counted by its status.
const countMigrationStates = (sortedTransforms) => {
  const latestByProject = new Map();
  for (const t of sortedTransforms) {
    const key = t.project_name;
    if (key && !latestByProject.has(key)) latestByProject.set(key, getTransformStatus(t));
  }
  let completed = 0, inProgress = 0, failed = 0;
  for (const s of latestByProject.values()) {
    if (s === 'completed') completed++;
    else if (s === 'running' || s === 'in_progress') inProgress++;
    else if (s === 'failed' || s === 'interrupted') failed++;
  }
  return { completed, inProgress, failed };
};

/* Divided-row action inside the Quick Actions card (Linear-style density). */
const QuickAction = ({ icon: Icon, title, desc, to, color }) => (
  <Link
    to={to}
    className="group flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:bg-gray-50"
  >
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 text-sm">{title}</p>
      <p className="text-xs text-gray-500 truncate mt-0.5">{desc}</p>
    </div>
    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
  </Link>
);

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin' || user?.is_superuser;

  const { data: statsData, isLoading: statsLoading, isError, refetch } = useGetProjectStatsQuery();
  const { data: adminData } = useGetAdminStatsQuery(undefined, { skip: !isAdmin });
  // /analyze/projects/stats has no user count — registered_users lives in /admin/usage
  const { data: adminUsage } = useGetAdminUsageQuery(undefined, { skip: !isAdmin });

  // Hydrate from the session cache synchronously so returning to the dashboard
  // in the same session shows the lists instantly (fresh data still loads in
  // the background and replaces them).
  const cached = readDashCache();
  const [transforms, setTransforms] = useState((cached?.transforms || []).slice(0, MIGRATIONS_LIMIT));
  const [migrationCounts, setMigrationCounts] = useState(cached?.migrationCounts || null);
  const [projects, setProjects] = useState(cached?.projects || []);
  const [loadingRecent, setLoadingRecent] = useState(!cached);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteProject] = useDeleteProjectMutation();

  const getProjectId = (p) => p?.id ?? p?.project_id ?? p?._id ?? null;

  // Pending confirmation: { type: 'delete', project } | { type: 'cancel', transform }
  const [confirmAction, setConfirmAction] = useState(null);

  const requestDeleteProject = (e, project) => {
    e.stopPropagation();
    const pid = getProjectId(project);
    const name = project.project_name || project.name || 'this project';
    if (!pid) {
      toast.error(`Cannot delete "${name}": missing server id.`);
      return;
    }
    setConfirmAction({ type: 'delete', project });
  };

  const handleDeleteProject = async (project) => {
    const pid = getProjectId(project);
    const name = project.project_name || project.name || 'this project';
    setConfirmAction(null);
    try {
      setDeletingId(pid);
      await deleteProject(pid).unwrap();
      setProjects((prev) => prev.filter((p) => String(getProjectId(p)) !== String(pid)));
      toast.success(`Deleted "${name}"`);
      refetch?.();
    } catch (err) {
      const detail = err?.data?.detail || err?.error || 'Failed to delete project.';
      toast.error(detail);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      Promise.all([
        apiService.listTransforms().catch(() => ({ data: [] })),
        apiService.getRecentProjects().catch(() => ({ data: [] })),
      ]).then(([tRes, pRes]) => {
        if (cancelled) return;
        const tData = Array.isArray(tRes.data) ? tRes.data : [];
        const pData = Array.isArray(pRes.data?.projects) ? pRes.data.projects
          : Array.isArray(pRes.data) ? pRes.data : [];
        const sorted = tData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const counts = countMigrationStates(sorted);
        const nextTransforms = sorted.slice(0, MIGRATIONS_LIMIT);
        const nextProjects = pData.slice(0, RECENT_LIMIT);
        setMigrationCounts(counts);
        setTransforms(nextTransforms);
        setProjects(nextProjects);
        writeDashCache({ transforms: nextTransforms, projects: nextProjects, migrationCounts: counts });
      }).finally(() => { if (!cancelled) setLoadingRecent(false); });
    };
    load();
    // Poll so multiple concurrently-running migrations update live here, instead
    // of showing a one-time page-load snapshot.
    const id = setInterval(load, 8000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const stats = isAdmin && adminData?.statistics
    ? adminData.statistics
    : statsData?.statistics || {};

  const total     = stats.total_projects || 0;
  // Prefer live migration-derived counts (latest migration per project);
  // the stats endpoint's project-status counters are never populated.
  const completed = migrationCounts?.completed ?? stats.completed_projects ?? 0;
  const inProg    = migrationCounts?.inProgress ?? stats.in_progress_projects ?? 0;
  const failed    = migrationCounts?.failed ?? stats.failed_projects ?? 0;

  // Live job-level success rate from /admin/usage — project.status is never
  // written by the backend, so completed_projects/total is permanently 0%.
  const usageProjects = (adminUsage?.users || []).flatMap((u) => u.projects || []);
  const jobsTotal = usageProjects.reduce((s, p) => s + (p.jobs || 0), 0);
  const jobsCompleted = usageProjects.reduce((s, p) => s + (p.completed_jobs || 0), 0);
  const jobSuccessRate = jobsTotal > 0 ? Math.round((jobsCompleted / jobsTotal) * 100) : null;

  // Find the job_id of the currently-running step on a transform. The backend
  // creates one ModernizationJob per step (step_1_job_id, step_2_job_id, ...),
  // but only one is in 'running' state at a time. We need that one to cancel.
  const getRunningJobId = (t) => {
    const pairs = [
      [t.step_4_status, t.step_4_job_id],
      [t.step_3_status, t.step_3_job_id],
      [t.step_2_status, t.step_2_job_id],
      [t.step_1_status, t.step_1_job_id],
    ];
    for (const [s, jid] of pairs) {
      if (s === 'running' && jid) return jid;
    }
    // Nothing in 'running' but some step might be in flight without status set -
    // fall back to the latest step that has a job_id.
    for (const [, jid] of pairs) {
      if (jid) return jid;
    }
    return null;
  };

  // Track which transforms are mid-cancel so the button shows a spinner and
  // we don't fire duplicate requests on rapid double-clicks.
  const [cancellingIds, setCancellingIds] = useState(new Set());
  const [removingIds, setRemovingIds] = useState(new Set());
  // Project whose LLM the user is switching (opens the dialog)
  const [llmSwitchProject, setLlmSwitchProject] = useState(null);

  const PROVIDER_LABEL = {
    groq: 'Groq', anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google', onprem: 'Mira AI',
  };

  // Remove one migration from the recent list (soft-hide server-side — jobs
  // and results are preserved, it just stops appearing here).
  const requestRemoveTransform = (e, t) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmAction({ type: 'remove', transform: t });
  };

  const handleRemoveTransform = async (t) => {
    setConfirmAction(null);
    const tid = t.transform_id || t.id;
    if (!tid) {
      toast.error('Cannot remove: missing migration id.');
      return;
    }
    setRemovingIds(prev => new Set(prev).add(tid));
    try {
      await apiService.removeTransform(tid);
      setTransforms(prev => prev.filter(x => (x.transform_id || x.id) !== tid));
      toast.success(`Removed "${t.project_name}" from recent migrations`);
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Remove failed';
      toast.error(`Remove failed: ${msg}`);
    } finally {
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(tid);
        return next;
      });
    }
  };

  const requestCancelTransform = (e, t) => {
    // Don't trigger the parent card's onClick navigation.
    e.preventDefault();
    e.stopPropagation();
    const jobId = getRunningJobId(t);
    if (!jobId) {
      toast.error('Could not find a running job for this migration.');
      return;
    }
    setConfirmAction({ type: 'cancel', transform: t });
  };

  const handleCancelTransform = async (t) => {
    setConfirmAction(null);
    const jobId = getRunningJobId(t);
    if (!jobId) {
      toast.error('Could not find a running job for this migration.');
      return;
    }
    const tid = t.transform_id || t.id || jobId;
    setCancellingIds(prev => new Set(prev).add(tid));
    try {
      await apiService.cancelJob(jobId);
      toast.success('Migration cancelled');
      // Optimistically flip its status locally so the badge updates instantly,
      // then reload from the server in the background.
      setTransforms(prev => prev.map(x => {
        if ((x.transform_id || x.id) !== (t.transform_id || t.id)) return x;
        return { ...x,
          step_1_status: x.step_1_status === 'running' ? 'cancelled' : x.step_1_status,
          step_2_status: x.step_2_status === 'running' ? 'cancelled' : x.step_2_status,
          step_3_status: x.step_3_status === 'running' ? 'cancelled' : x.step_3_status,
          step_4_status: x.step_4_status === 'running' ? 'cancelled' : x.step_4_status,
        };
      }));
      apiService.listTransforms().then(res => {
        const tData = Array.isArray(res.data) ? res.data : [];
        setTransforms(tData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, MIGRATIONS_LIMIT));
      }).catch(() => { /* keep optimistic state */ });
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Cancel failed';
      toast.error(`Cancel failed: ${msg}`);
    } finally {
      setCancellingIds(prev => {
        const next = new Set(prev);
        next.delete(tid);
        return next;
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Page header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900 flex items-center gap-2.5 flex-wrap">
              Welcome back{user?.username ? `, ${user.username}` : ''}
              {isAdmin && <Badge variant="primary" dot>Admin</Badge>}
            </h1>
            <p className="text-gray-500 mt-0.5 text-[13px]">
              Your code modernization workspace
            </p>
          </div>
          <div className="flex gap-2.5">
            <Button onClick={() => navigate('/project/new')} size="sm">
              <Plus className="w-4 h-4 mr-1" /> New Project
            </Button>
            <Button onClick={() => refetch()} variant="outline" size="sm" aria-label="Refresh stats">
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* ── Metric strip (single card, hairline-divided — Stripe-style) ── */}
        {statsLoading ? (
          <div className="rounded-xl border h-[104px] skeleton-shimmer" />
        ) : isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Failed to load stats</p>
            </div>
            <Button onClick={() => refetch()} size="sm" variant="outline">Retry</Button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm grid grid-cols-2 lg:grid-cols-4 lg:divide-x divide-gray-100 overflow-hidden">
            {[
              { label: 'Total Projects', value: total, icon: FolderOpen, tile: 'bg-gradient-to-br from-primary-500 to-violet-600' },
              { label: 'Completed', value: migrationCounts ? completed : '–', sub: 'latest migration per project', icon: CheckCircle, tile: 'bg-gradient-to-br from-green-500 to-emerald-600' },
              { label: 'In Progress', value: migrationCounts ? inProg : '–', sub: 'latest migration per project', icon: Activity, tile: 'bg-gradient-to-br from-violet-500 to-purple-600' },
              { label: 'Failed', value: migrationCounts ? failed : '–', sub: 'latest migration per project', icon: AlertCircle, tile: 'bg-gradient-to-br from-red-500 to-rose-600', alert: migrationCounts && failed > 0 },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="px-5 py-4 flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${m.tile}`}>
                    <Icon className="w-5 h-5 text-white" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-gray-500">{m.label}</p>
                    <p className={`text-2xl font-semibold tracking-tight tabular-nums leading-tight ${m.alert ? 'text-red-600' : 'text-gray-900'}`}>
                      {m.value}
                    </p>
                    {m.sub && <p className="text-[11px] text-gray-400 truncate">{m.sub}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── Recent Transforms ── */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Recent Migrations</h2>
              <Link to="/transform/select" className="text-[13px] font-medium text-primary-700 hover:text-primary-800">
                New migration →
              </Link>
            </div>

            {loadingRecent ? (
              <div className="divide-y divide-gray-100">
                {[1,2,3].map(i => (
                  <div key={i} className="h-16 skeleton-shimmer" />
                ))}
              </div>
            ) : transforms.length === 0 ? (
              <div className="p-10 text-center">
                <GitBranch className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium mb-1">No migrations yet</p>
                <p className="text-gray-400 text-sm mb-4">Start your first code modernization</p>
                <Button onClick={() => navigate('/transform/select')} size="sm">
                  <Zap className="w-4 h-4 mr-1" /> Start Migration
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {transforms.map(t => {
                  const status = getTransformStatus(t);
                  const step = t.current_step || 0;
                  const tid = t.transform_id || t.id;
                  const isCancelling = cancellingIds.has(tid);
                  return (
                    <div key={tid}
                      className="group flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        // Completed migrations jump straight to their results;
                        // everything else goes to the transform workspace.
                        if (t.step_4_status === 'completed' && t.step_4_job_id) {
                          navigate(`/transform/result/${encodeURIComponent(t.project_name)}`, {
                            state: { projectName: t.project_name },
                          });
                        } else {
                          // Running / in-progress → resume the live workflow view
                          // (TransformWorkflowPage reattaches by project_name).
                          navigate('/transform/workflow', { state: { project_name: t.project_name } });
                        }
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <GitBranch className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{t.project_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Step {step}/4
                          {t.created_at && <> · {new Date(t.created_at).toLocaleDateString()}</>}
                        </p>
                      </div>
                      <StatusBadge status={status} />
                      {t.step_4_status === 'completed' && t.step_4_job_id && (
                        <span className="ml-1 text-[13px] font-medium text-primary-700 whitespace-nowrap">View Results →</span>
                      )}
                      {/* Stop button - only shown for in-flight migrations.
                          stopPropagation prevents the card's onClick from firing. */}
                      {status === 'running' && (
                        <button
                          type="button"
                          onClick={(e) => requestCancelTransform(e, t)}
                          disabled={isCancelling}
                          title="Stop this running migration"
                          className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isCancelling ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Stopping…
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5" />
                              Stop
                            </>
                          )}
                        </button>
                      )}
                      {/* Remove from recent list - for anything not actively running. */}
                      {status !== 'running' && (
                        <button
                          type="button"
                          onClick={(e) => requestRemoveTransform(e, t)}
                          disabled={removingIds.has(tid)}
                          title="Remove from recent migrations"
                          aria-label={`Remove ${t.project_name} from recent migrations`}
                          className="ml-2 p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {removingIds.has(tid) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            </div>

            {/* Your Projects — two-column cards with always-visible delete */}
            {projects.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Your Projects</h2>
                  <Link to="/analyze/select" className="text-[13px] font-medium text-primary-700 hover:text-primary-800">
                    Analyze →
                  </Link>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projects.map(p => (
                    <div key={p.project_key || p.id}
                      className="relative p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-200 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => navigate('/transform/select')}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                          <FolderOpen className="w-4 h-4 text-primary-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate pr-8">
                            {p.project_name || p.name}
                          </p>
                          {p.organization_name && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">{p.organization_name}</p>
                          )}
                          {p.legacy_technology?.length > 0 && (
                            <p className="text-xs text-primary-600 mt-1">{p.legacy_technology.join(', ')}</p>
                          )}
                          {/* Current LLM + one-click switch */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setLlmSwitchProject(p); }}
                            title="Change the LLM used for this project"
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-primary-700 bg-gray-100 hover:bg-primary-50 rounded-full px-2 py-0.5 transition-colors"
                          >
                            <Cpu className="w-3 h-3" />
                            {PROVIDER_LABEL[p.llm_provider] || p.llm_provider || 'Groq'}
                            {p.llm_model ? <span className="text-gray-400 font-normal">· {p.llm_model}</span> : null}
                          </button>
                        </div>
                      </div>
                      {(() => {
                        const pid = getProjectId(p);
                        const isDeleting = deletingId && String(deletingId) === String(pid);
                        return (
                          <button
                            type="button"
                            onClick={(e) => requestDeleteProject(e, p)}
                            disabled={isDeleting}
                            title="Delete project"
                            aria-label={`Delete ${p.project_name || p.name}`}
                            className="absolute top-2 right-2 p-1.5 rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm z-10"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Quick Actions ── */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="divide-y divide-gray-100">
                <QuickAction
                  icon={Plus}
                  title="New Project"
                  desc="Set up SSH credentials & project"
                  to="/project/new"
                  color="bg-primary-50 text-primary-600"
                />
                <QuickAction
                  icon={BarChart3}
                  title="Analyze Source Code"
                  desc="Architecture & code quality review"
                  to="/analyze/select"
                  color="bg-green-50 text-green-600"
                />
                <QuickAction
                  icon={Shield}
                  title="Security Scan"
                  desc="OWASP, PCI DSS, ISO 27001 reports"
                  to="/report/select"
                  color="bg-violet-50 text-violet-600"
                />
                <QuickAction
                  icon={Zap}
                  title="Modernize Code"
                  desc="AI-driven 4-step migration pipeline"
                  to="/transform/select"
                  color="bg-amber-50 text-amber-600"
                />
              </div>
            </div>

            {/* Admin overview — amber accent box (no user counts: the
                dashboard presents a single user's workspace) */}
            {isAdmin && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Admin Overview</p>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-amber-700">All projects</dt>
                    <dd className="font-bold tabular-nums text-amber-900">{total}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-amber-700">Job success rate</dt>
                    <dd className="font-bold tabular-nums text-amber-900">
                      {jobSuccessRate != null
                        ? `${jobSuccessRate}%`
                        : `${total > 0 ? Math.round((completed / total) * 100) : 0}%`}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation dialogs (replaces window.confirm) */}
      <ConfirmDialog
        open={confirmAction?.type === 'delete'}
        danger
        title="Delete project?"
        message={`Delete "${confirmAction?.project?.project_name || confirmAction?.project?.name || 'this project'}"? This will also delete all analysis reports and cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => handleDeleteProject(confirmAction.project)}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction?.type === 'cancel'}
        danger
        title="Stop running migration?"
        message={`Stop the running migration for "${confirmAction?.transform?.project_name}"?\n\nThe current file in the LLM finishes normally, but no further files will be processed. Files already uploaded to your VM are preserved.`}
        confirmLabel="Stop migration"
        cancelLabel="Keep running"
        onConfirm={() => handleCancelTransform(confirmAction.transform)}
        onCancel={() => setConfirmAction(null)}
      />
      <LLMSwitchDialog
        open={!!llmSwitchProject}
        project={llmSwitchProject}
        onClose={() => setLlmSwitchProject(null)}
        onSwitched={(res) => {
          setProjects(prev => prev.map(x =>
            getProjectId(x) === getProjectId(llmSwitchProject)
              ? { ...x, llm_provider: res.llm_provider, llm_model: res.llm_model }
              : x));
        }}
      />
      <ConfirmDialog
        open={confirmAction?.type === 'remove'}
        title="Remove from recent migrations?"
        message={`Remove "${confirmAction?.transform?.project_name}" from your recent migrations list?\n\nJobs, results and files on your server are kept — the entry just stops appearing in this list.`}
        confirmLabel="Remove"
        onConfirm={() => handleRemoveTransform(confirmAction.transform)}
        onCancel={() => setConfirmAction(null)}
      />
    </DashboardLayout>
  );
};

// Updated by Moshiur Rahman on 2026-06-13
// Added: New feature implementation
