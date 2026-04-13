

import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import MainProgressBar from '../../components/ui/MainProgressBar';
import {
  Shield, Layers, Network, AlertTriangle, CheckCircle2,
  XCircle, ArrowRight, Clock, FolderOpen, FileText,
  Zap, Lock, Package, AlertCircle, Target, Cpu, GitBranch,
  Download, Eye,
} from 'lucide-react';

/* Session persistence: the analyse-project result exists only in the POST
 * response (the backend keeps rendered files, not the structured JSON), so
 * without this a refresh silently lost the whole on-screen report. */
const ANALYSIS_CACHE_PREFIX = 'mira-analysis-result:';
const LAST_ANALYSIS_KEY = 'mira-analysis-last-project';
const readAnalysisCache = (projectName) => {
  try {
    const raw = sessionStorage.getItem(ANALYSIS_CACHE_PREFIX + projectName);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const writeAnalysisCache = (projectName, result) => {
  try {
    sessionStorage.setItem(ANALYSIS_CACHE_PREFIX + projectName, JSON.stringify(result));
    sessionStorage.setItem(LAST_ANALYSIS_KEY, projectName);
  } catch { /* best-effort */ }
};

/* ─── Constants ─────────────────────────────────────────── */

// UI step display - ID must match the backend's ANALYZE_STEPS in app/api/v1/analyze/routes.py.
// The UI no longer fakes timing; it polls the backend every 1.5s and mirrors its state.
const SCAN_TASKS = [
  { id: 'ssh_connect',    label: 'Connecting to server',                    icon: Network       },
  { id: 'discover_files', label: 'Mapping project structure',               icon: FolderOpen    },
  { id: 'collect_source', label: 'Reading source code',                     icon: FileText      },
  { id: 'llm_map',        label: 'Analyzing code in parallel (deep scan)',  icon: Cpu           },
  { id: 'llm_reduce',     label: 'Synthesizing findings',                   icon: Layers        },
  { id: 'render_formats', label: 'Compiling comprehensive report',          icon: CheckCircle2  },
];

const HEALTH_COLOR = {
  Good:   'text-green-700  bg-green-50  border-green-200',
  Fair:   'text-yellow-700 bg-yellow-50 border-yellow-200',
  Poor:   'text-red-700    bg-red-50    border-red-200',
  Medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  High:   'text-red-700    bg-red-50    border-red-200',
  Low:    'text-blue-700   bg-blue-50   border-blue-200',
};

const SEVERITY_COLOR = {
  High:   'text-red-700    bg-red-50    border-red-200',
  Medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  Low:    'text-blue-700   bg-blue-50   border-blue-200',
  Tight:  'text-orange-700 bg-orange-50 border-orange-200',
};

const scoreColors = (score) => {
  if (score >= 80) return { ring: '#22c55e', text: 'text-green-600' };
  if (score >= 60) return { ring: '#eab308', text: 'text-yellow-600' };
  return { ring: '#ef4444', text: 'text-red-600' };
};

/* ─── Small reusable components ─────────────────────────── */

const HealthBadge = ({ label }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${HEALTH_COLOR[label] ?? 'text-gray-700 bg-gray-100 border-gray-200'}`}>
    {label}
  </span>
);

const SeverityBadge = ({ label }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${SEVERITY_COLOR[label] ?? 'text-gray-700 bg-gray-100 border-gray-200'}`}>
    {label}
  </span>
);

const SectionCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50/70">
      {Icon && <Icon className="w-4 h-4 text-primary-600 flex-shrink-0" />}
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-widest">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

/* Animated SVG score ring */
const ScoreRing = ({ score }) => {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const { ring, text } = scoreColors(score);
  return (
    <div className="flex items-center gap-5">
      <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e5e7eb" strokeWidth="9" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={ring} strokeWidth="9"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div>
        <p className={`text-4xl font-extrabold ${text}`}>{score}</p>
        <p className="text-xs text-gray-400 font-medium">/ 100</p>
      </div>
    </div>
  );
};

/* Scanning animation */
const PulseShield = () => (
  <div className="relative w-36 h-36 mx-auto select-none">
    <div className="absolute inset-0 rounded-full border-4 border-primary-200 animate-ping opacity-20" />
    <div className="absolute inset-2 rounded-full border-4 border-primary-300 animate-ping opacity-15"
      style={{ animationDelay: '0.4s' }} />
    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin" />
    <div className="absolute inset-0 rounded-full border-4 border-transparent border-r-primary-300 animate-spin"
      style={{ animationDuration: '1.4s', animationDirection: 'reverse' }} />
    <div className="absolute inset-5 rounded-full bg-primary-50 flex items-center justify-center">
      <Shield className="w-11 h-11 text-primary-600 animate-pulse" />
    </div>
  </div>
);

const ScanLine = ({ delay = 0 }) => (
  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
    <div
      className="h-full bg-gradient-to-r from-transparent via-primary-400 to-transparent rounded-full"
      style={{
        width: '35%',
        animation: 'mira-scan 1.8s ease-in-out infinite',
        animationDelay: `${delay}s`,
      }}
    />
  </div>
);

/* ─── Main page ─────────────────────────────────────────── */

export const AnalysisReportPage = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const prevData  = location.state || {};
  // Fall back to the last analyzed project so a page refresh doesn't lose
  // the report (location.state does not survive reloads).
  const projectName = prevData.project_name || prevData.projectName
    || (() => { try { return sessionStorage.getItem(LAST_ANALYSIS_KEY) || ''; } catch { return ''; } })();

  // Hydrate a previously completed analysis for this project from the session
  // cache so the output stays on screen across refreshes and navigation.
  const cachedResult = projectName ? readAnalysisCache(projectName) : null;

  const [phase,          setPhase]          = useState(cachedResult ? 'done' : 'idle');   // idle | scanning | done | error
  const [progress,       setProgress]       = useState(0);
  const [currentTask,    setCurrentTask]    = useState('');
  const [completedTasks, setCompletedTasks] = useState([]);
  const [result,         setResult]         = useState(cachedResult);
  const [error,          setError]          = useState(null);
  const [scoreVal,       setScoreVal]       = useState(
    cachedResult?.report?.security_reports?.project_analysis?.content?.analysis_score ?? 0
  );

  const apiDoneRef        = useRef(false);
  const apiResponseRef    = useRef(null);
  const pollTimerRef      = useRef(null);
  const pollingActiveRef  = useRef(false);
  const analysisIdRef     = useRef(null);
  const [stepStatusById, setStepStatusById] = useState({}); // { step_id: 'pending'|'running'|'done'|'failed' }
  const [stepDetail,     setStepDetail]     = useState('');

  // Generate an analysis_id client-side so we can start polling before the POST returns
  const _newAnalysisId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    }
    return Math.random().toString(36).slice(2, 18);
  };

  const stopPolling = () => {
    pollingActiveRef.current = false;
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  // Poll loop driven by setInterval - simpler than chained setTimeout and survives
  // React re-renders / StrictMode double-invocations. `pollingActiveRef` gates whether
  // the tick actually runs (so we can pause/resume without tearing down the interval).
  const pollProgressTick = async () => {
    if (!pollingActiveRef.current) return;
    const aid = analysisIdRef.current;
    if (!aid) return;
    try {
      const res = await api.get(`/analyze/scan/progress/${aid}`);
      const data = res.data || {};
      console.debug('[analyze] poll tick', {
        percent: data.percent,
        step: data.current_step_id,
        detail: data.detail,
        status: data.status,
      });
      setProgress(data.percent ?? 0);
      setCurrentTask(data.current_step_label || 'Analyzing…');
      setStepDetail(data.detail || '');
      const byId = {};
      (data.steps || []).forEach((s) => { byId[s.id] = s.status; });
      setStepStatusById(byId);
      setCompletedTasks(
        (data.steps || []).filter((s) => s.status === 'done').map((s) => s.id)
      );
      if ((data.status === 'completed' || data.status === 'failed') && apiDoneRef.current) {
        pollingActiveRef.current = false;
        handlePostComplete();
      }
    } catch (err) {
      console.debug('[analyze] poll err (will retry):', err?.response?.status || err?.message);
    }
  };

  const startPolling = () => {
    pollingActiveRef.current = true;
    // Fire one immediately, then run on an interval
    pollProgressTick();
    pollTimerRef.current = setInterval(pollProgressTick, 1500);
  };

  // Safety cleanup: clear the interval if the user navigates away mid-run.
  useEffect(() => {
    return () => {
      pollingActiveRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  const handlePostComplete = () => {
    stopPolling();
    const res = apiResponseRef.current;
    if (res?.__error) {
      setPhase('error');
      setError(res.message);
      return;
    }
    setCurrentTask('Analysis complete!');
    setCompletedTasks(SCAN_TASKS.map((t) => t.id));
    setProgress(100);
    if (projectName) writeAnalysisCache(projectName, res);
    setTimeout(() => {
      setResult(res);
      setPhase('done');
      const score = res?.report?.security_reports?.project_analysis?.content?.analysis_score ?? 0;
      setTimeout(() => setScoreVal(score), 200);
    }, 400);
  };

  const startAnalysis = () => {
    setPhase('scanning');
    setProgress(0);
    setCompletedTasks([]);
    setStepStatusById({});
    setStepDetail('');
    setError(null);
    setResult(null);
    apiDoneRef.current     = false;
    apiResponseRef.current = null;

    const aid = _newAnalysisId();
    analysisIdRef.current = aid;

    // Kick off the POST and start polling simultaneously. The POST won't resolve
    // until the whole map-reduce finishes (~2-3 min); the poll gives live state.
    api
      .post(`/analyze/scan/analyse-project?analysis_id=${aid}`, { project_name: projectName })
      .then((res) => {
        apiResponseRef.current = res.data;
        apiDoneRef.current = true;
        handlePostComplete();
      })
      .catch((err) => {
        apiResponseRef.current = {
          __error: true,
          message: err.response?.data?.detail || 'Analysis failed. Please try again.',
        };
        apiDoneRef.current = true;
        handlePostComplete();
      });

    startPolling();
  };

  const content  = result?.report?.security_reports?.project_analysis?.content;
  const meta     = result?.report?.workflow_metadata;
  const reportId = result?.report_id
    || result?.report?.security_reports?.project_analysis?.report_id;

  // Download the persisted report file (html/pdf/docx) generated server-side.
  const [downloading, setDownloading] = useState(null);
  const handleDownload = async (format) => {
    if (!reportId || downloading) return;
    setDownloading(format);
    try {
      const res = await api.get(`/analyze/reports/${reportId}/download`, {
        params: { format }, responseType: 'blob',
      });
      const cd = res.headers?.['content-disposition'] || '';
      const m = cd.match(/filename="?([^";]+)"?/);
      const filename = m ? m[1] : `${projectName || 'project'}-analysis.${format}`;
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Report download failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <DashboardLayout>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes mira-scan {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(380%);  }
        }
        @keyframes mira-float {
          from { transform: translateY(0);     }
          to   { transform: translateY(-9px);  }
        }
        @keyframes mira-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .mira-fade-up { animation: mira-fade-up 0.45s ease both; }
      `}</style>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        <MainProgressBar step={2} totalSteps={3} />

        {/* ── IDLE ── */}
        {phase === 'idle' && (
          <div className="mira-fade-up">
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Project Analysis</h1>
              <p className="text-sm text-gray-500">Comprehensive architecture &amp; code quality review</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 sm:p-12 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-6">
                <Cpu className="w-10 h-10 text-primary-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {projectName || <span className="text-gray-400 italic">No project selected</span>}
              </h2>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">
                Run a comprehensive analysis to uncover architecture patterns, anti-patterns,
                dependencies, and actionable improvement recommendations.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 max-w-lg mx-auto">
                {[
                  { icon: Layers,        label: 'Architecture'  },
                  { icon: Shield,        label: 'Security'      },
                  { icon: Package,       label: 'Dependencies'  },
                  { icon: AlertTriangle, label: 'Anti-Patterns' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <Icon className="w-5 h-5 text-primary-500" />
                    <span className="text-xs font-medium text-gray-600">{label}</span>
                  </div>
                ))}
              </div>

              <Button variant="primary" size="lg" onClick={startAnalysis} disabled={!projectName}>
                Start Analysis
              </Button>
            </div>
          </div>
        )}

        {/* ── SCANNING ── */}
        {phase === 'scanning' && (
          <div className="mira-fade-up">
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Analyzing Project…</h1>
              <p className="text-sm text-gray-500">Please don't close this tab. Deep analysis in progress</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 relative overflow-hidden">
              {/* floating particles */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(7)].map((_, i) => (
                  <span
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-primary-300 opacity-30"
                    style={{
                      left: `${8 + i * 13}%`,
                      top:  `${15 + (i % 3) * 28}%`,
                      animation: `mira-float ${1.8 + i * 0.25}s ease-in-out ${i * 0.18}s infinite alternate`,
                    }}
                  />
                ))}
              </div>

              {/* Shield animation */}
              <div className="flex flex-col items-center mb-7 relative z-10">
                <PulseShield />
                <p className="mt-4 text-base font-semibold text-gray-800 text-center">{currentTask || 'Initializing…'}</p>
                <p className="text-sm text-gray-500">
                  Analyzing <span className="font-semibold text-primary-600">{projectName}</span>
                </p>
              </div>

              {/* Progress bar */}
              <div className="mb-5 relative z-10">
                <div className="flex justify-between text-xs font-medium text-gray-500 mb-1.5">
                  <span>Progress</span>
                  <span className="tabular-nums">{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Scan lines */}
              <div className="mb-7 space-y-1.5 relative z-10">
                {[0, 0.35, 0.7, 1.05].map((d) => <ScanLine key={d} delay={d} />)}
              </div>

              {/* Task checklist - driven by REAL backend state (polled every 1.5s) */}
              <ol className="space-y-3 relative z-10">
                {SCAN_TASKS.map((task) => {
                  const state = stepStatusById[task.id] || 'pending'; // pending|running|done|failed
                  const done   = state === 'done';
                  const active = state === 'running';
                  const failed = state === 'failed';
                  const Icon   = task.icon;
                  return (
                    <li
                      key={task.id}
                      className={`flex items-start gap-3 text-sm transition-all duration-300 ${
                        done || active || failed ? 'opacity-100' : 'opacity-35'
                      }`}
                    >
                      <span
                        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                          failed ? 'bg-red-100 text-red-600'
                          : done   ? 'bg-green-100 text-green-600'
                          : active ? 'bg-primary-100 text-primary-600 animate-pulse'
                          : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {failed ? <XCircle className="w-4 h-4" />
                          : done ? <CheckCircle2 className="w-4 h-4" />
                          : <Icon className="w-3.5 h-3.5" />}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`transition-colors duration-200 ${
                            failed ? 'text-red-700 font-medium'
                            : done   ? 'text-gray-800 font-medium'
                            : active ? 'text-primary-700 font-semibold'
                            : 'text-gray-400'
                          }`}>
                            {task.label}
                          </span>
                          {active && (
                            <span className="flex gap-1 ml-2">
                              {[0, 1, 2].map((i) => (
                                <span
                                  key={i}
                                  className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce"
                                  style={{ animationDelay: `${i * 0.15}s` }}
                                />
                              ))}
                            </span>
                          )}
                          {done   && <span className="text-xs text-green-600 font-semibold ml-2">Done</span>}
                          {failed && <span className="text-xs text-red-600 font-semibold ml-2">Failed</span>}
                        </div>
                        {active && stepDetail && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate" title={stepDetail}>
                            {stepDetail}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        )}

        {/* ── ERROR ── */}
        {phase === 'error' && (
          <div className="mira-fade-up">
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Analysis Failed</h1>
            </div>
            <div className="bg-white border border-red-200 rounded-xl shadow-sm p-10 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-gray-700 mb-6 max-w-sm mx-auto">{error}</p>
              <Button variant="primary" onClick={() => { setPhase('idle'); setError(null); }}>
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* ── DONE but the model returned unstructured text / an error ── */}
        {phase === 'done' && content && !(content.report_title || content.executive_summary || content.overall_health) && (
          <div className="mira-fade-up bg-white border border-amber-200 rounded-xl shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Report generated in a limited format</h2>
            </div>
            {content.error ? (
              <p className="text-sm text-red-600">The analysis could not be completed: {String(content.error)}</p>
            ) : (
              <p className="text-sm text-gray-600">
                The structured analysis was incomplete (the model returned raw text). The full analysis is shown below — you can re-run to get the structured report.
              </p>
            )}
            {content.raw_analysis && (
              <pre className="mt-2 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-4">{content.raw_analysis}</pre>
            )}
          </div>
        )}

        {/* ── DONE (structured report) ── */}
        {phase === 'done' && content && (content.report_title || content.executive_summary || content.overall_health) && (
          <div className="space-y-6">

            {/* Header */}
            <div className="mira-fade-up flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{content.report_title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  {meta?.project_name && <span className="font-medium text-gray-700">{meta.project_name}</span>}
                  {meta?.analysis_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(meta.analysis_date).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <HealthBadge label={content.overall_health} />
            </div>

            {/* Persisted-report actions: view the rendered report, or download it */}
            {reportId && (
              <div className="mira-fade-up flex flex-wrap items-center gap-2" style={{ animationDelay: '0.04s' }}>
                <button
                  type="button"
                  onClick={() => navigate(`/reports/view/${reportId}`, { state: { reportId, projectName } })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> View full report
                </button>
                {['html', 'pdf', 'docx'].map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleDownload(fmt)}
                    disabled={!!downloading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {downloading === fmt ? 'Downloading…' : fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            {/* Score + Executive Summary */}
            <div className="mira-fade-up bg-white border border-gray-200 rounded-xl shadow-sm p-6"
              style={{ animationDelay: '0.08s' }}>
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="flex-shrink-0">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Analysis Score</p>
                  <ScoreRing score={scoreVal} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Executive Summary</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{content.executive_summary}</p>
                </div>
              </div>

              {content._analysis_metadata && (
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Analysis Coverage</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-1">
                      <span className="font-semibold">{content._analysis_metadata.files_seen_in_findings ?? 0}</span>
                      <span>files analyzed</span>
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-xs border rounded-full px-3 py-1 ${
                      (content._analysis_metadata.chunks_failed || 0) > 0
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      <span className="font-semibold">{content._analysis_metadata.chunks_analyzed ?? 0}</span>
                      <span>of {content._analysis_metadata.chunks_total ?? 0} chunks</span>
                      {(content._analysis_metadata.chunks_failed || 0) > 0 && (
                        <span className="text-amber-700"> ({content._analysis_metadata.chunks_failed} failed)</span>
                      )}
                    </span>
                    {typeof content._analysis_metadata.source_bytes === 'number' && (
                      <span className="inline-flex items-center gap-1.5 text-xs bg-gray-50 text-gray-700 border border-gray-200 rounded-full px-3 py-1">
                        <span className="font-semibold">{(content._analysis_metadata.source_bytes / 1024).toFixed(1)} KB</span>
                        <span>source read</span>
                      </span>
                    )}
                    {typeof content._analysis_metadata.anti_patterns_found === 'number' && (
                      <span className="inline-flex items-center gap-1.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-3 py-1">
                        <span className="font-semibold">{content._analysis_metadata.anti_patterns_found}</span>
                        <span>anti-patterns</span>
                      </span>
                    )}
                    {typeof content._analysis_metadata.internal_deps_found === 'number' && (
                      <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1">
                        <span className="font-semibold">{content._analysis_metadata.internal_deps_found}</span>
                        <span>dependencies mapped</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Deep Findings - raw aggregated data from map phase */}
            {content._aggregated_findings && (() => {
              const agg = content._aggregated_findings;
              const hasAny = (
                (agg.files_seen?.length || 0) > 0 ||
                (agg.anti_patterns?.length || 0) > 0 ||
                (agg.hardcoded_secrets?.length || 0) > 0 ||
                (agg.internal_dependencies?.length || 0) > 0 ||
                (agg.external_libraries_seen?.length || 0) > 0
              );
              if (!hasAny) return null;
              const failedChunks = content._analysis_metadata?.chunks_failed || 0;
              return (
                <div className="mira-fade-up" style={{ animationDelay: '0.11s' }}>
                  <SectionCard title="Deep Findings (every file the analyzer actually saw)" icon={FileText}>
                    {failedChunks > 0 && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                        <strong>Coverage note:</strong> {failedChunks} of {content._analysis_metadata?.chunks_total} source chunks failed during analysis (likely rate-limiting). The findings below reflect only the {content._analysis_metadata?.chunks_analyzed} successful chunks. Re-running may produce a fuller report.
                      </div>
                    )}

                    {agg.files_seen?.length > 0 && (
                      <details className="mb-3 group">
                        <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-primary-600 flex items-center gap-2">
                          <FolderOpen className="w-4 h-4" />
                          Files analyzed ({agg.files_seen.length})
                        </summary>
                        <div className="mt-2 p-3 bg-gray-50 rounded-md max-h-64 overflow-y-auto">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 text-xs font-mono text-gray-600">
                            {agg.files_seen.map((f, i) => (
                              <div key={i} className="truncate" title={f}>{f}</div>
                            ))}
                          </div>
                        </div>
                      </details>
                    )}

                    {agg.anti_patterns?.length > 0 && (
                      <details open className="mb-3 group">
                        <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-primary-600 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          All anti-patterns & code smells ({agg.anti_patterns.length})
                        </summary>
                        <div className="mt-2 overflow-x-auto rounded-md border border-gray-100">
                          <table className="min-w-full text-xs">
                            <thead className="bg-gray-50 text-gray-500 uppercase">
                              <tr>
                                <th className="text-left py-2 px-3">Type</th>
                                <th className="text-left py-2 px-3">Severity</th>
                                <th className="text-left py-2 px-3">File</th>
                                <th className="text-left py-2 px-3">Description</th>
                                <th className="text-left py-2 px-3">Fix</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {agg.anti_patterns.map((ap, i) => (
                                <tr key={i} className="hover:bg-gray-50/60">
                                  <td className="py-2 px-3 font-medium text-gray-800">{ap.type}</td>
                                  <td className="py-2 px-3">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      ap.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                                      ap.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                                      ap.severity === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>{ap.severity || '?'}</span>
                                  </td>
                                  <td className="py-2 px-3 font-mono text-gray-600">{ap.file || ap.location || '-'}</td>
                                  <td className="py-2 px-3 text-gray-700">{ap.description}</td>
                                  <td className="py-2 px-3 text-emerald-700">{ap.fix}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )}

                    {agg.hardcoded_secrets?.length > 0 && (
                      <details open className="mb-3 group">
                        <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-primary-600 flex items-center gap-2">
                          <Lock className="w-4 h-4 text-red-500" />
                          Hardcoded secrets ({agg.hardcoded_secrets.length})
                        </summary>
                        <ul className="mt-2 space-y-1 text-xs">
                          {agg.hardcoded_secrets.map((s, i) => (
                            <li key={i} className="p-2 bg-red-50 border border-red-100 rounded-md">
                              <span className="font-mono text-red-700">{s.file}</span>
                              <span className="text-gray-500"> - {s.what}</span>
                              {s.snippet && <code className="block mt-1 text-[11px] text-red-800 bg-red-100/50 px-2 py-1 rounded">{s.snippet}</code>}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}

                    {agg.internal_dependencies?.length > 0 && (
                      <details className="mb-3 group">
                        <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-primary-600 flex items-center gap-2">
                          <GitBranch className="w-4 h-4" />
                          All internal dependencies ({agg.internal_dependencies.length})
                        </summary>
                        <div className="mt-2 overflow-x-auto rounded-md border border-gray-100">
                          <table className="min-w-full text-xs">
                            <thead className="bg-gray-50 text-gray-500 uppercase">
                              <tr>
                                <th className="text-left py-2 px-3">From</th>
                                <th className="text-left py-2 px-3">To</th>
                                <th className="text-left py-2 px-3">Via</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {agg.internal_dependencies.map((d, i) => (
                                <tr key={i}>
                                  <td className="py-2 px-3 font-mono text-gray-700">{d.from_file}</td>
                                  <td className="py-2 px-3 font-mono text-gray-700">{d.to_file_or_module}</td>
                                  <td className="py-2 px-3 text-gray-500">{d.how}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )}

                    {agg.external_libraries_seen?.length > 0 && (
                      <details className="mb-3 group">
                        <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-primary-600 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          External libraries ({agg.external_libraries_seen.length})
                        </summary>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {agg.external_libraries_seen.map((lib, i) => (
                            <span key={i} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-0.5 font-mono">{lib}</span>
                          ))}
                        </div>
                      </details>
                    )}

                    {agg.entry_points?.length > 0 && (
                      <details className="mb-3 group">
                        <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-primary-600 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Entry points ({agg.entry_points.length})
                        </summary>
                        <ul className="mt-2 space-y-1 text-xs">
                          {agg.entry_points.map((ep, i) => (
                            <li key={i} className="p-2 bg-gray-50 rounded-md">
                              <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded mr-2">{ep.type}</span>
                              <span className="font-mono text-gray-700">{ep.file}</span>
                              {ep.description && <span className="text-gray-500"> - {ep.description}</span>}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}

                    {agg.key_issues?.length > 0 && (
                      <details className="mb-3 group">
                        <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-primary-600 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          Other observations ({agg.key_issues.length})
                        </summary>
                        <ul className="mt-2 space-y-1 text-xs text-gray-700">
                          {agg.key_issues.map((k, i) => {
                            // Accept either legacy string form or new {file, issue} object
                            if (typeof k === 'string') return <li key={i} className="list-disc list-inside">{k}</li>;
                            const f = k?.file; const msg = k?.issue || k?.description || '';
                            return (
                              <li key={i} className="p-1.5">
                                {f && <span className="font-mono text-gray-600">{f}</span>}
                                {f && msg && <span className="text-gray-400"> - </span>}
                                <span>{msg}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    )}
                  </SectionCard>
                </div>
              );
            })()}

            {/* Critical Findings */}
            {content.critical_findings?.length > 0 && (
              <div className="mira-fade-up" style={{ animationDelay: '0.13s' }}>
                <SectionCard title="Critical Findings" icon={AlertTriangle}>
                  <ul className="space-y-2">
                    {content.critical_findings.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              </div>
            )}

            {/* Architectural Style */}
            <div className="mira-fade-up" style={{ animationDelay: '0.18s' }}>
              <SectionCard title="Architectural Style" icon={Layers}>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-semibold text-gray-800">{content.architectural_style?.primary_style}</span>
                    {content.architectural_style?.secondary_patterns?.map((p) => (
                      <span key={p} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5">{p}</span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">{content.architectural_style?.description}</p>

                  {content.architectural_style?.layer_analysis?.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-gray-100">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                            <th className="text-left py-2 px-3">Layer</th>
                            <th className="text-left py-2 px-3">Purpose</th>
                            <th className="text-left py-2 px-3">Key Files</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {content.architectural_style.layer_analysis.map((l) => (
                            <tr key={l.layer} className="hover:bg-gray-50/60 transition-colors">
                              <td className="py-2.5 px-3 font-medium text-gray-800">{l.layer}</td>
                              <td className="py-2.5 px-3 text-gray-600">{l.purpose}</td>
                              <td className="py-2.5 px-3 font-mono text-xs text-gray-500">{l.key_files?.join(', ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4 pt-1">
                    {content.architectural_style?.strengths?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Strengths</p>
                        <ul className="space-y-1.5">
                          {content.architectural_style.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {content.architectural_style?.weaknesses?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Weaknesses</p>
                        <ul className="space-y-1.5">
                          {content.architectural_style.weaknesses.map((w, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />{w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Directory Structure */}
            <div className="mira-fade-up" style={{ animationDelay: '0.23s' }}>
              <SectionCard title="Directory Structure" icon={FolderOpen}>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-700">Style:</span>
                    <span className="text-gray-600">{content.directory_structure?.organization_style}</span>
                  </div>
                  <p className="text-sm text-gray-600">{content.directory_structure?.top_level_layout}</p>

                  {content.directory_structure?.modules_identified?.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {content.directory_structure.modules_identified.map((mod) => (
                        <div key={mod.name} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-gray-50/60">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{mod.name}</p>
                            <p className="text-xs text-gray-500">{mod.purpose}</p>
                          </div>
                          <HealthBadge label={mod.health} />
                        </div>
                      ))}
                    </div>
                  )}

                  {content.directory_structure?.recommendations?.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recommendations</p>
                      <ul className="space-y-1.5">
                        {content.directory_structure.recommendations.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <ArrowRight className="w-3.5 h-3.5 text-primary-500 flex-shrink-0 mt-0.5" />{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            {/* Anti-Patterns */}
            {content.anti_patterns?.issues_found?.length > 0 && (
              <div className="mira-fade-up" style={{ animationDelay: '0.28s' }}>
                <SectionCard title="Anti-Patterns & Code Smells" icon={AlertTriangle}>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">Code Health Score:</span>
                      <span className={`text-lg font-bold ${scoreColors(content.anti_patterns.code_health_score).text}`}>
                        {content.anti_patterns.code_health_score}<span className="text-xs font-normal text-gray-400">/100</span>
                      </span>
                    </div>
                    {content.anti_patterns.assessment && (
                      <p className="text-sm text-gray-600">{content.anti_patterns.assessment}</p>
                    )}
                    <div className="space-y-3">
                      {content.anti_patterns.issues_found.map((issue, i) => (
                        <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-800 text-sm">{issue.type}</span>
                            <SeverityBadge label={issue.severity} />
                            <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{issue.location}</span>
                          </div>
                          <p className="text-sm text-gray-600">{issue.description}</p>
                          <div className="flex items-start gap-2 text-sm text-primary-700 bg-primary-50 border border-primary-100 rounded-lg p-2.5">
                            <Zap className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-primary-500" />
                            <span>{issue.fix}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Configuration & Environment */}
            <div className="mira-fade-up" style={{ animationDelay: '0.33s' }}>
              <SectionCard title="Configuration & Environment" icon={Lock}>
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Environment Handling</p>
                      <p className="text-sm text-gray-800">{content.configuration_environment?.env_handling}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Hardcoded Secrets Risk</p>
                      <SeverityBadge label={content.configuration_environment?.hardcoded_secrets_risk} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Logging Setup</p>
                      <p className="text-sm text-gray-800">{content.configuration_environment?.logging_setup}</p>
                    </div>
                    {content.configuration_environment?.config_files_identified?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Config Files</p>
                        <p className="text-sm font-mono text-gray-700">{content.configuration_environment.config_files_identified.join(', ')}</p>
                      </div>
                    )}
                  </div>

                  {content.configuration_environment?.hardcoded_issues?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1.5">
                      {content.configuration_environment.hardcoded_issues.map((issue, i) => (
                        <p key={i} className="text-sm text-red-700 flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{issue}
                        </p>
                      ))}
                    </div>
                  )}

                  {content.configuration_environment?.recommendations?.length > 0 && (
                    <ul className="space-y-1.5 pt-1">
                      {content.configuration_environment.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <ArrowRight className="w-3.5 h-3.5 text-primary-500 flex-shrink-0 mt-0.5" />{r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </SectionCard>
            </div>

            {/* Dependency Analysis */}
            <div className="mira-fade-up" style={{ animationDelay: '0.38s' }}>
              <SectionCard title="Dependency Analysis" icon={GitBranch}>
                <div className="space-y-4">
                  {content.dependency_analysis?.internal_dependencies?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Internal Dependencies</p>
                      <div className="space-y-2">
                        {content.dependency_analysis.internal_dependencies.map((dep, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm flex-wrap">
                            <span className="font-mono font-semibold text-gray-800">{dep.from_module}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="font-mono font-semibold text-gray-800">{dep.to_module}</span>
                            <SeverityBadge label={dep.coupling_level} />
                            {dep.description && <span className="text-xs text-gray-500">{dep.description}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {content.dependency_analysis?.recommendations?.length > 0 && (
                    <ul className="space-y-1.5">
                      {content.dependency_analysis.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <ArrowRight className="w-3.5 h-3.5 text-primary-500 flex-shrink-0 mt-0.5" />{r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </SectionCard>
            </div>

            {/* Recommendations Summary */}
            {content.recommendations_summary?.length > 0 && (
              <div className="mira-fade-up" style={{ animationDelay: '0.43s' }}>
                <SectionCard title="Recommendations" icon={Target}>
                  <div className="space-y-3">
                    {content.recommendations_summary.map((rec, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50/60 transition-colors">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                          ${rec.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <p className="text-sm font-semibold text-gray-900">{rec.recommendation}</p>
                            <SeverityBadge label={rec.priority} />
                          </div>
                          <div className="flex gap-5 text-xs text-gray-500">
                            <span>Effort: <span className="font-medium text-gray-700">{rec.effort}</span></span>
                            <span>Impact: <span className="font-medium text-gray-700">{rec.impact}</span></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            )}

            {/* CTA */}
            <div className="mira-fade-up pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4"
              style={{ animationDelay: '0.48s' }}>
              <p className="text-sm text-gray-500">Ready to proceed with code conversion?</p>
              <Button
                variant="primary"
                size="lg"
                onClick={() =>
                  navigate(
                    `/analysis/${prevData.project_key || prevData.project_name || prevData.id}/stack-selection`,
                    { state: { ...prevData, analysisResult: result } }
                  )
                }
              >
                Continue to Conversion
              </Button>
            </div>

          </div>
        )}

      </main>
    </DashboardLayout>
  );
};
// Dev: Moshiur Rahman - 2026-04-13
