import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { CompletionPanel, FileProgressList } from '../../components/ModernizationResult';
import { apiService } from '../../utils/api';
import { getVersionLadder, LANGUAGE_DISPLAY_NAMES } from '../../utils/languageConfig';
import toast from 'react-hot-toast';
import {
  CheckCircle, Clock, AlertCircle, ChevronRight, Code2, Settings,
  Zap, Download, ArrowRight, Terminal, RefreshCw, FileCode,
  Server, BarChart3, Shield, Home,
} from 'lucide-react';

const POLL_INTERVAL_MS = 4000;

// Languages for which the backend has a hand-tuned modernization prompt.
// Mirror of _LANGUAGE_PROMPTS in app/services/agents/language_prompts.py.
// Used in the estimate modal to show a "tuned" badge next to each language.
const TUNED_PROMPT_LANGUAGES = new Set([
  'php',        // handled by PHPModernizationAgent
  'javascript', 'typescript',
  'python',
  'java',
  'csharp', 'c_sharp',
  'go',
]);

const STEPS = [
  { id: 1, title: 'Structure & Language Analysis', desc: 'Detect language, version, and project structure', icon: Code2 },
  { id: 2, title: 'Upgrade Analysis',              desc: 'SonarQube scan + upgrade guide generation',      icon: Settings },
  { id: 3, title: 'Detailed Analysis',             desc: 'Incorporate user requirements into upgrade plan', icon: Zap },
  { id: 4, title: 'Code Modernization',            desc: 'Apply LLM-driven per-file code upgrades',        icon: Zap },
];

// Maps internal Langgraph node names → human-readable log messages
const TASK_LABELS = {
  structure_analysis:      'Scanning project files and directory structure…',
  language_analysis:       'Detecting language, framework and version…',
  new_version_upgradation: 'Applying AI-driven code upgrades per version stage…',
  upgrade_analysis:        'Generating upgrade plan and migration guide…',
  code_modernization:      'Modernizing code files with LLM…',
  sonarqube_scan:          'Running SonarQube security & quality scan…',
  detailed_analysis:       'Incorporating your requirements into the upgrade plan…',
};

const LOG_COLORS = {
  info:       'text-gray-300',
  success:    'text-green-400',
  error:      'text-red-400',
  warn:       'text-yellow-400',
  processing: 'text-blue-400',
  stage:      'text-purple-400',
  agent:      'text-green-400', // detailed backend agent logs — green
};

const StepCard = ({ step, status, isActive, runningTaskLabel }) => {
  const Icon = step.icon;
  const isDone      = status === 'completed';
  const isFailed    = status === 'failed';
  const isSkipped   = status === 'skipped';
  const isCancelled = status === 'cancelled';
  return (
    <div className={`p-3 rounded-xl border-2 transition-colors ${
      isDone      ? 'border-green-400 bg-green-50' :
      isFailed    ? 'border-red-400 bg-red-50' :
      isCancelled ? 'border-amber-300 bg-amber-50' :
      isSkipped   ? 'border-gray-300 bg-gray-50' :
      isActive    ? 'border-blue-400 bg-blue-50' :
                    'border-gray-200 bg-white'
    }`}>
      <div className="flex items-start gap-3">
        {isDone      ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /> :
         isFailed    ? <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" /> :
         isCancelled ? <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" /> :
         isSkipped   ? <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" /> :
         isActive    ? <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" /> :
                       <Icon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            Step {step.id}: {step.title}
            {isSkipped && <span className="ml-2 text-xs font-normal text-gray-400">(skipped)</span>}
            {isCancelled && <span className="ml-2 text-xs font-normal text-amber-500">(cancelled)</span>}
          </p>
          <p className="text-xs text-gray-500">{step.desc}</p>
          {isActive && runningTaskLabel && (
            <p className="text-xs text-blue-600 mt-1 truncate">{TASK_LABELS[runningTaskLabel] || runningTaskLabel}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const TransformWorkflowPage = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const {
    project_name,
    to_version: initialToVersion,
    // Pre-flight selections carried over from SelectProjectForTransformPage
    // when the user confirmed the "Ready to start code migration?" modal there.
    // If present, we skip the on-page modal and go straight into Step 1.
    preflightLangs,
    preflightVersions,
    preflightEstimate,
    preflightStacks,
  } = location.state || {};

  const [logs,           setLogs]           = useState([]);
  const [currentStep,    setCurrentStep]    = useState(0);
  const [stepStatuses,   setStepStatuses]   = useState({ 1: null, 2: null, 3: null, 4: null });
  const [jobIds,         setJobIds]         = useState({});
  const [transformId,    setTransformId]    = useState(null);
  const [userInput,      setUserInput]      = useState('');
  const [showUserInput,  setShowUserInput]  = useState(false);
  const [detectedInfo,   setDetectedInfo]   = useState(null);
  const [completionResult, setCompletionResult] = useState(null);
  const [fatalError,     setFatalError]     = useState(null);
  const [runningTaskLabel, setRunningTaskLabel] = useState('');
  const [fileStatuses,   setFileStatuses]   = useState([]);
  const [step4Progress,  setStep4Progress]  = useState({ current: 0, total: 0 });
  // Pre-flight estimate modal state (shown before Step 4 actually kicks off)
  const [estimateData,   setEstimateData]   = useState(null);  // {languages_detected, estimate, limits, within_limits, warnings, ...}
  const [estimateLoading,setEstimateLoading]= useState(false);
  const [selectedLangs,  setSelectedLangs]  = useState([]);   // which languages the user ticked
  const [targetVersions, setTargetVersions] = useState({});   // { php: '8.3', javascript: 'es2024', ... }
  // Version ladders fetched once per page; keyed by language → list of valid versions + default.
  // Shape: { ladders: { php: ['4.0',...,'8.5'], ... }, defaults: { php: '8.5', ... } }
  const [versionOptions, setVersionOptions] = useState({ ladders: {}, defaults: {} });
  const [pendingTid,     setPendingTid]     = useState(null); // transform_id captured at modal-open time
  // Per-language Step 4 jobs. Each entry: {language, job_id, status, current, total, current_file, error}
  const [langJobs,       setLangJobs]       = useState([]);

  const pollTimers  = useRef({});
  const logsEndRef  = useRef(null);
  const step2Started = useRef(false);
  const step4Started = useRef(false);
  const lastLoggedTask = useRef({});  // step → last logged task name, prevents duplicate log lines
  const lastLoggedStage = useRef({}); // step → last logged "from→to" string, prevents repeating same hop
  const completedFiredRef = useRef({}); // step → true once we've fired onStepCompleted, blocks duplicates
  const backendLogCountRef = useRef({}); // step → number of backend agent log lines already shown
  const logQueueRef = useRef([]); // pending agent log lines, drained one-by-one for a live feel

  const addLog = useCallback((msg, type = 'info') => {
    setLogs(prev => [...prev, { ts: new Date().toLocaleTimeString(), msg, type }]);
  }, []);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  // Drain queued backend agent logs into the panel one line at a time so they
  // stream live instead of appearing in a batch every poll. Drains a few per
  // tick if the queue is deep, so it never falls far behind on a busy step.
  useEffect(() => {
    const id = setInterval(() => {
      const q = logQueueRef.current;
      if (!q.length) return;
      const batch = q.splice(0, q.length > 40 ? 4 : 1); // catch up if deep
      setLogs(prev => [...prev, ...batch]);
    }, 140);
    return () => clearInterval(id);
  }, []);

  // Guards the one-time pipeline kickoff so StrictMode's double-invoke and page
  // refreshes cannot POST a second Step 1 for the same mount.
  const pipelineStartedRef = useRef(false);

  useEffect(() => {
    if (!project_name) { toast.error('No project selected'); navigate('/transform/select'); return; }
    // Fetch version ladders (non-blocking). Still useful here in case we need to
    // re-prompt (e.g. no pre-flight selections were handed off).
    apiService.getMigrationVersionOptions()
      .then(res => setVersionOptions(res.data || { ladders: {}, defaults: {} }))
      .catch(err => console.warn('Could not fetch migration version options:', err?.message));

    // Flow A - user already confirmed the pre-flight modal on the project-selection
    // page. Start Step 1 immediately using the handed-off choices; no modal on this page.
    if (Array.isArray(preflightLangs) && preflightLangs.length > 0) {
      setSelectedLangs(preflightLangs);
      setTargetVersions(preflightVersions || {});
      if (preflightEstimate) {
        const est = preflightEstimate.estimate || {};
        addLog(
          `Starting 4-step migration for ${preflightLangs.join(', ')} - est. runtime ${est.wall_clock_human || '?'}, cost $${est.estimated_cost_usd ?? '?'}.`,
          'info',
        );
      } else {
        addLog(`Starting 4-step migration for ${preflightLangs.join(', ')}…`, 'info');
      }
      // Guard against React StrictMode's double-invoke AND page-refresh re-submits:
      // only ever kick off once per mount, and reattach to an already-running
      // migration for this project instead of POSTing a duplicate Step 1.
      if (!pipelineStartedRef.current) {
        pipelineStartedRef.current = true;
        resumeOrStartStep1();
      }
      return;
    }

    // Flow B - no pre-flight selections handed off (direct URL, or a "resume"
    // link from the dashboard/list). Reattach to a running migration if one
    // exists; otherwise show the pre-flight estimate modal.
    if (!pipelineStartedRef.current) {
      pipelineStartedRef.current = true;
      resumeOrOpenEstimate();
    }
  }, []);

  // Always clear ALL pollers on unmount, regardless of which flow started them.
  // (Flow A above early-returns and previously registered no cleanup, leaking
  // every setInterval poller after navigation/logout.)
  useEffect(() => () => Object.values(pollTimers.current).forEach(clearInterval), []);

  const stopPoll = (step) => { if (pollTimers.current[step]) { clearInterval(pollTimers.current[step]); delete pollTimers.current[step]; } };
  const startPoll = (step, fn) => { stopPoll(step); pollTimers.current[step] = setInterval(fn, POLL_INTERVAL_MS); };

  // Fetch the detailed backend agent (services.agents.*) logs for a job and
  // QUEUE only the NEW lines (tracked per step). A separate drainer streams
  // them into the panel one at a time so they appear live, not in a batch.
  const syncBackendLogs = async (step, job_id) => {
    if (!job_id) return;
    try {
      const res = await apiService.runModernizationLogs(job_id);
      const lines = res.data?.logs || [];
      const already = backendLogCountRef.current[step] || 0;
      if (lines.length <= already) return;
      const fresh = lines.slice(already);
      backendLogCountRef.current[step] = lines.length;
      for (const raw of fresh) {
        // Keep ONLY services.agents.* lines (skip httpx, routes plumbing, etc.).
        const m = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})[.,]?\d*\s+-\s+app\.services\.agents\.(\S+)\s+-\s+\w+\s+-\s+([\s\S]*)$/);
        if (!m) continue;
        const [, date, time, , message] = m;
        // Format the log's own timestamp to match the curated "h:mm:ss AM" style.
        let ts = time;
        const d = new Date(`${date}T${time}`);
        if (!isNaN(d)) ts = d.toLocaleTimeString();
        // Strip any leading "[agent_name]" the message itself carries, so no
        // module/agent names show in the panel - just the human message.
        const clean = message.trim().replace(/^\[[^\]]+\]\s*/, '');
        logQueueRef.current.push({ ts, msg: clean, type: 'agent' });
      }
    } catch (_) {
      // logs endpoint hiccup - ignore, we'll catch up next poll
    }
  };

  // ─── Pre-flight (runs BEFORE Step 1) ──────────────────────────────────────
  // Pops the "Ready to start code migration?" modal when the user lands on the
  // page. Scans the project to detect languages + count files and shows an
  // estimate. User picks languages + versions and confirms. Only then does the
  // 4-step pipeline start at Step 1.
  const openPreflightEstimate = async () => {
    addLog('Running pre-flight scan to detect languages and estimate runtime…', 'processing');
    setEstimateLoading(true);
    try {
      const res = await apiService.estimateMigration({ project_name });
      const data = res.data || {};
      const availableLangs = (data.languages_detected || []).map(l => l.language);
      setEstimateData(data);
      setSelectedLangs(availableLangs); // pre-tick every detected language
      const defaults = versionOptions.defaults || {};
      const seeded = {};
      for (const lang of availableLangs) {
        if (defaults[lang]) seeded[lang] = defaults[lang];
      }
      setTargetVersions(seeded);
      addLog(
        `Pre-flight complete: ${data.total_files || 0} files across ${availableLangs.length} language(s). ` +
        `Estimated runtime: ${data.estimate?.wall_clock_human || '?'}, estimated cost: $${data.estimate?.estimated_cost_usd ?? '?'}.`,
        'info',
      );
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      addLog(`Pre-flight failed: ${msg}`, 'error');
      setFatalError(msg);
    } finally {
      setEstimateLoading(false);
    }
  };

  // ─── Step 1 ───────────────────────────────────────────────────────────────
  const startStep1 = async () => {
    setCurrentStep(1);
    setStepStatuses(s => ({ ...s, 1: 'running' }));
    addLog('Starting Step 1: Structure & Language Analysis…', 'processing');
    try {
      const payload = { project_name };
      if (initialToVersion) payload.to_version = initialToVersion;
      const res = await apiService.runStep1(payload);
      const { job_id, transform_id } = res.data;
      setJobIds(j => ({ ...j, 1: job_id }));
      if (transform_id) setTransformId(transform_id);
      addLog(`Step 1 queued (job: ${job_id})`, 'info');
      startPoll(1, () => pollStep(1, job_id, transform_id));
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      addLog(`Step 1 failed: ${msg}`, 'error');
      setStepStatuses(s => ({ ...s, 1: 'failed' }));
      setFatalError(msg);
    }
  };

  // Reattach to an already-running migration for this project (page refresh, or the
  // user navigated back) instead of POSTing a duplicate pipeline. Falls back to a
  // fresh Step 1 if nothing is running or the lookup fails.
  const resumeOrStartStep1 = async () => {
    try {
      const res = await apiService.listTransforms();
      const list = Array.isArray(res.data) ? res.data : (res.data?.transforms || []);
      const isActive = (st) => st && st !== 'completed' && st !== 'failed' && st !== 'skipped';
      const running = list.find(t =>
        t.project_name === project_name &&
        t.step_4_status !== 'completed' &&
        [1, 2, 3, 4].some(n => isActive(t[`step_${n}_status`]) || t.step_2_status === 'completed')
      );
      if (running) { reattachToTransform(running); return; }
    } catch (err) {
      console.warn('Resume check failed; starting fresh:', err?.message);
    }
    startStep1();
  };

  // Entry with no pre-flight selections: reattach to a running migration for this
  // project if there is one, else fall back to the pre-flight estimate modal.
  const resumeOrOpenEstimate = async () => {
    try {
      const res = await apiService.listTransforms();
      const list = Array.isArray(res.data) ? res.data : (res.data?.transforms || []);
      const isActive = (st) => st && st !== 'completed' && st !== 'failed' && st !== 'skipped';
      const running = list.find(t =>
        t.project_name === project_name &&
        t.step_4_status !== 'completed' &&
        ([1, 2, 3, 4].some(n => isActive(t[`step_${n}_status`])) ||
         (t.step_2_status === 'completed' && t.step_3_status !== 'completed'))
      );
      if (running) { reattachToTransform(running); return; }
    } catch (err) {
      console.warn('Resume check failed; showing estimate:', err?.message);
    }
    openPreflightEstimate();
  };

  // Rebuild step statuses from a transform record and resume polling the step that
  // is still running, so the live view + logs come back after a refresh/return.
  const reattachToTransform = (t) => {
    addLog('A migration is already running for this project — reattaching to it…', 'info');
    const xformId = t.transform_id || t.id || t._id;
    if (xformId) setTransformId(xformId);
    const isActive = (st) => st && st !== 'completed' && st !== 'failed' && st !== 'skipped';
    const statuses = {};
    let running = null;
    for (const n of [1, 2, 3, 4]) {
      const st = t[`step_${n}_status`];
      if (st) statuses[n] = st;
      if (running === null && isActive(st) && t[`step_${n}_job_id`]) {
        running = { step: n, job_id: t[`step_${n}_job_id`] };
      }
    }
    setStepStatuses(s => ({ ...s, ...statuses }));
    if (running) {
      setJobIds(j => ({ ...j, [running.step]: running.job_id }));
      setCurrentStep(running.step);
      addLog(`Reattached to Step ${running.step} (job ${running.job_id}).`, 'info');
      startPoll(running.step, () => pollStep(running.step, running.job_id, xformId));
    } else if (t.step_2_status === 'completed' && t.step_3_status !== 'completed') {
      // Pipeline is paused waiting for the optional Step-3 requirements — restore
      // the input box so the user can submit or skip instead of being stuck.
      setCurrentStep(2);
      setShowUserInput(true);
      addLog('Waiting for your requirements before detailed analysis — enter them below or skip.', 'info');
    }
  };

  const pollStep = async (step, job_id, xformId) => {
    const statusFns = {
      1: apiService.runStep1Status,
      2: apiService.runStep2Status,
      3: apiService.runStep3Status,
      4: apiService.runStep4Status,
    };
    try {
      const res  = await statusFns[step](job_id);
      const data = res.data;

      // Stream the detailed backend agent logs (services.agents.*) for this job
      // into the live-log panel, so the user sees the real per-file / per-stage
      // activity - not just the curated milestone lines below.
      syncBackendLogs(step, job_id);

      if (data.current_task && data.current_task !== lastLoggedTask.current[step]) {
        lastLoggedTask.current[step] = data.current_task;
        setRunningTaskLabel(data.current_task);
        const label = TASK_LABELS[data.current_task] || data.current_task;
        addLog(`  ▶ ${label}`, 'stage');
      }

      // Per-stage version-hop progress (e.g. "Stage 3/7: PHP 7.6 → 7.7").
      // Backend updates current_stage_from/current_stage_to at the START of every hop
      // so the user sees real progress through the version ladder, not just the
      // overall start→end pair repeating forever.
      const sp = data.stage_progress || data;
      const sFrom = sp.current_stage_from;
      const sTo   = sp.current_stage_to;
      const sIdx  = sp.current_stage_index;
      const sTot  = sp.total_stages;
      if (sFrom && sTo) {
        const stageKey = `${sIdx ?? '?'}|${sFrom}→${sTo}`;
        if (lastLoggedStage.current[step] !== stageKey) {
          lastLoggedStage.current[step] = stageKey;
          const stageLabel = sIdx && sTot
            ? `  ▸ Stage ${sIdx}/${sTot}: ${sFrom} → ${sTo}`
            : `  ▸ Stage: ${sFrom} → ${sTo}`;
          addLog(stageLabel, 'stage');
        }
      }

      // Track per-file progress for step 4
      if (step === 4) {
        if (data.files_processed != null || data.current_file != null) {
          const cur   = data.files_processed ?? data.files_upgraded ?? 0;
          const total = data.total_files ?? data.files_total ?? 0;
          setStep4Progress({ current: cur, total });
        }
        if (data.file_statuses?.length) {
          setFileStatuses(data.file_statuses);
        } else if (data.files?.length) {
          setFileStatuses(data.files);
        }
      }

      if (data.status === 'completed') {
        stopPoll(step);
        // Idempotency guard: pollStep can fire from multiple in-flight requests
        // before stopPoll's clearInterval takes effect. Without this guard,
        // onStepCompleted ran 5–6 times producing duplicate "✓ Step N complete" lines.
        if (completedFiredRef.current[step]) return;
        completedFiredRef.current[step] = true;
        setStepStatuses(s => ({ ...s, [step]: 'completed' }));
        onStepCompleted(step, data, xformId);
      } else if (data.status === 'failed') {
        stopPoll(step);
        if (completedFiredRef.current[step]) return;
        completedFiredRef.current[step] = true;
        setStepStatuses(s => ({ ...s, [step]: 'failed' }));
        const errMsg = data.error || 'Unknown error';
        addLog(`Step ${step} failed: ${errMsg}`, 'error');
        setFatalError(errMsg);
      } else if (data.status === 'cancelled') {
        // User cancelled: stop this step, stop the chain, don't start the next.
        handleCancelledStep(step);
      }
    } catch (err) {
      // A 404 means the cancelled job was deleted from the DB → treat as cancelled.
      if (err?.response?.status === 404) {
        handleCancelledStep(step);
        return;
      }
      // Otherwise a transient network hiccup - keep polling.
    }
  };

  // Stop everything when a migration is cancelled: halt all pollers, mark the
  // step cancelled, block the chain from advancing, and surface a notice.
  const handleCancelledStep = (step) => {
    Object.keys(pollTimers.current).forEach(s => stopPoll(Number(s)));
    if (completedFiredRef.current[step]) return;
    completedFiredRef.current[step] = true;
    step2Started.current = true;
    step4Started.current = true; // block any pending chain advance
    setStepStatuses(s => ({ ...s, [step]: 'cancelled' }));
    setShowUserInput(false);
    addLog('Migration cancelled — stopping.', 'warn');
    setFatalError('This migration was cancelled.');
  };

  const onStepCompleted = (step, data, xformId) => {
    const tid = data.transform_id || xformId || transformId;
    if (tid) setTransformId(tid);

    if (step === 1) {
      addLog('✓ Step 1 complete: language & structure detected', 'success');
      const r    = data.result || {};
      const lang = r.language || r.detected_language;
      const fw   = r.framework || r.detected_framework;
      const fromV = r.from_version;
      const toV   = r.to_version;
      if (lang || fromV) {
        setDetectedInfo({ language: lang, framework: fw, fromVersion: fromV, toVersion: toV });
        addLog(`  Language: ${LANGUAGE_DISPLAY_NAMES[lang] || lang || 'unknown'} | ${fromV || '?'} → ${toV || '?'}`, 'info');
        if (fw) addLog(`  Framework: ${fw}`, 'info');
      }
      startStep2(tid);
    } else if (step === 2) {
      addLog('✓ Step 2 complete: upgrade analysis ready', 'success');
      addLog('Awaiting your requirements before detailed analysis…', 'info');
      setCurrentStep(2);
      setShowUserInput(true);
    } else if (step === 3) {
      addLog('✓ Step 3 complete: detailed plan generated', 'success');
      if (!step4Started.current) { step4Started.current = true; startStep4(tid); }
    } else if (step === 4) {
      addLog('✓ Step 4 complete: code modernization finished!', 'success');
      setCurrentStep(4);
      // Migration finished - clear the active-migration marker so a later
      const r = data.result || {};
      // capture file statuses from final result too
      if (r.file_statuses?.length) setFileStatuses(r.file_statuses);
      else if (r.files?.length)    setFileStatuses(r.files);
      setCompletionResult(r);
      if (r.output_path)     addLog(`  Output path: ${r.output_path}`, 'success');
      if (r.files_upgraded != null) addLog(`  Files upgraded: ${r.files_upgraded} / ${r.total_files}`, 'info');
    }
  };

  // ─── Step 2 ───────────────────────────────────────────────────────────────
  const startStep2 = async (tid) => {
    if (step2Started.current) return;
    step2Started.current = true;
    setCurrentStep(2);
    setStepStatuses(s => ({ ...s, 2: 'running' }));
    addLog('Starting Step 2: Upgrade Analysis…', 'processing');
    try {
      const res = await apiService.runStep2({ project_name, transform_id: tid || transformId });
      const { job_id } = res.data;
      setJobIds(j => ({ ...j, 2: job_id }));
      addLog(`Step 2 queued (job: ${job_id})`, 'info');
      startPoll(2, () => pollStep(2, job_id, tid));
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      addLog(`Step 2 failed: ${msg}`, 'error');
      setStepStatuses(s => ({ ...s, 2: 'failed' }));
      setFatalError(msg);
    }
  };

  // ─── Step 3 (user-triggered) ──────────────────────────────────────────────
  const startStep3 = async () => {
    setShowUserInput(false);
    const req = userInput.trim();
    // No extra requirements → Step 3 (incorporate-requirements) has nothing to
    // do, so SKIP it and go straight to Step 4. Step 4 only needs transform_id
    // + the Step-1 migrated stages, not any Step-3 output.
    if (!req) {
      addLog('No additional requirements entered — skipping detailed analysis, proceeding to modernization.', 'info');
      setStepStatuses(s => ({ ...s, 3: 'skipped' }));
      setCurrentStep(4);
      if (!step4Started.current) { step4Started.current = true; startStep4(transformId); }
      return;
    }
    setCurrentStep(3);
    setStepStatuses(s => ({ ...s, 3: 'running' }));
    addLog('Starting Step 3: Detailed Upgrade Analysis…', 'processing');
    try {
      const payload = { project_name, transform_id: transformId, user_input: req };
      const res = await apiService.runStep3(payload);
      const { job_id } = res.data;
      setJobIds(j => ({ ...j, 3: job_id }));
      addLog(`Step 3 queued (job: ${job_id})`, 'info');
      startPoll(3, () => pollStep(3, job_id, transformId));
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      addLog(`Step 3 failed: ${msg}`, 'error');
      setStepStatuses(s => ({ ...s, 3: 'failed' }));
      setFatalError(msg);
    }
  };

  // ─── Step 4 ───────────────────────────────────────────────────────────────
  // No modal here - languages and target versions were chosen at pre-flight time
  // (before Step 1). This just fires Step 4 using the user's earlier selections.
  const startStep4 = async (tid) => {
    setCurrentStep(4);
    setPendingTid(tid || transformId);
    if (!selectedLangs.length) {
      addLog('No languages were selected at pre-flight - cannot run Step 4.', 'error');
      setStepStatuses(s => ({ ...s, 4: 'failed' }));
      setFatalError('No languages selected.');
      return;
    }
    await runStep4Migration(tid || transformId);
  };

  // Poll ONE language's Step 4 job and update its langJobs row. When all
  // language jobs are terminal (completed/failed), treat Step 4 as done.
  const pollLangJob = async (language, job_id, tid) => {
    try {
      const res = await apiService.runStep4Status(job_id);
      const data = res.data || {};
      // Validation stats only appear on the FINAL result payload, not during polling.
      // Pull them out of result when present so the UI can surface "clean / retried / failed"
      // counts once the job finishes.
      const result = data.result || {};
      setLangJobs(prev => prev.map(j => (j.job_id === job_id ? {
        ...j,
        status: data.status || j.status,
        current: data.files_processed ?? data.files_upgraded ?? result.files_upgraded ?? j.current,
        total: data.total_files ?? data.files_total ?? result.total_files ?? j.total,
        current_file: data.current_file ?? j.current_file,
        error: data.error || null,
        current_task: data.current_task ?? j.current_task,
        framework: result.framework ?? j.framework,
        target_version: result.to_version ?? j.target_version,
        files_upgraded: result.files_upgraded ?? j.files_upgraded,
        files_unchanged: result.files_unchanged ?? j.files_unchanged,
        files_with_errors: result.files_with_errors ?? j.files_with_errors,
        validated_clean: result.validated_clean ?? j.validated_clean,
        validation_retried: result.validation_retried ?? j.validation_retried,
        validation_failed: result.validation_failed ?? j.validation_failed,
        output_path: result.output_path ?? j.output_path,
      } : j)));

      if (data.status === 'completed') {
        stopPoll(`lang_${language}`);
        addLog(`✓ ${language}: migration complete`, 'success');
      } else if (data.status === 'failed') {
        stopPoll(`lang_${language}`);
        addLog(`✗ ${language}: migration failed - ${data.error || 'unknown error'}`, 'error');
      }
    } catch {
      // Network hiccup - keep polling
    }
  };

  // When langJobs state changes, check if all jobs are terminal and close out Step 4.
  useEffect(() => {
    if (currentStep !== 4 || langJobs.length === 0) return;
    const allTerminal = langJobs.every(j => j.status === 'completed' || j.status === 'failed');
    if (!allTerminal) return;
    const anyFailed = langJobs.some(j => j.status === 'failed');
    const allFailed = langJobs.every(j => j.status === 'failed');
    if (allFailed) {
      setStepStatuses(s => ({ ...s, 4: 'failed' }));
      setFatalError('All per-language migration jobs failed. See logs.');
    } else {
      // Mark Step 4 completed even if some languages failed; user can see which in the panel.
      setStepStatuses(s => ({ ...s, 4: 'completed' }));
      addLog(
        anyFailed
          ? '✓ Step 4 partial: some languages failed; check the per-language panel.'
          : '✓ Step 4 complete: all language migrations finished!',
        anyFailed ? 'warn' : 'success',
      );
      // Set completion using the first successful job's result shape (best-effort)
      const firstDone = langJobs.find(j => j.status === 'completed');
      if (firstDone) {
        setCompletionResult({
          totalFiles: langJobs.reduce((s, j) => s + (j.total || 0), 0),
          upgraded:   langJobs.reduce((s, j) => s + (j.current || 0), 0),
          withErrors: langJobs.filter(j => j.status === 'failed').length,
        });
      }
    }
  }, [langJobs, currentStep]);

  // Phase 2: user confirmed the estimate modal.
  // Closes the modal and begins the 4-step pipeline at Step 1. The language +
  // target-version choices survive on component state and are used when Step 4
  // is reached later.
  const confirmStep4 = () => {
    if (!selectedLangs.length) {
      addLog('No languages selected - please tick at least one to proceed.', 'warn');
      return;
    }
    setEstimateData(null); // close modal
    addLog(`Starting 4-step migration for ${selectedLangs.join(', ')}…`, 'processing');
    startStep1();
  };

  // Actually fires Step 4 once the earlier steps finish. Uses the language +
  // version choices captured in the pre-flight modal.
  const runStep4Migration = async (tidArg) => {
    const languages = [...selectedLangs];
    const tid = tidArg || pendingTid || transformId;
    setPendingTid(null);
    if (!languages.length) {
      addLog('No languages selected - skipping Step 4.', 'warn');
      setStepStatuses(s => ({ ...s, 4: 'failed' }));
      return;
    }
    setStepStatuses(s => ({ ...s, 4: 'running' }));
    addLog(`Starting Step 4: Code Modernization for ${languages.join(', ')}…`, 'processing');
    addLog('This may take several minutes for large projects.', 'warn');
    try {
      // Pass stack choices and a compact estimate snapshot to the backend so it
      // can include them in the "migration started" email + audit log. Both
      // fields are optional on the schema - older clients still work unchanged.
      const est = preflightEstimate?.estimate || {};
      const res = await apiService.runStep4({
        project_name,
        transform_id: tid,
        languages,
        target_versions: targetVersions,  // {php: '8.3', javascript: 'es2024', ...}
        stacks: preflightStacks || undefined,
        estimate_summary: {
          total_files: preflightEstimate?.total_files,
          wall_clock_human: est.wall_clock_human,
          estimated_cost_usd: est.estimated_cost_usd,
        },
      });
      const data = res.data || {};

      // Multi-language response: {jobs: [{language, job_id}, ...]}
      // Single-language response (or fallback): {job_id, language?}
      let jobList;
      if (Array.isArray(data.jobs) && data.jobs.length) {
        jobList = data.jobs;
      } else if (data.job_id) {
        jobList = [{ language: data.language || languages[0], job_id: data.job_id }];
      } else {
        throw new Error('Unexpected response from /run-code-modernization');
      }

      const seed = jobList.map(j => ({
        language: j.language,
        job_id: j.job_id,
        status: 'running',
        current: 0,
        total: 0,
        current_file: null,
        current_task: null,
        error: null,
      }));
      setLangJobs(seed);
      setJobIds(j => ({ ...j, 4: jobList[0].job_id, '4_all': jobList }));
      jobList.forEach(j => addLog(`Step 4 queued for ${j.language} (job: ${j.job_id})`, 'info'));

      // Spin up one independent poller per language
      jobList.forEach(j => {
        startPoll(`lang_${j.language}`, () => pollLangJob(j.language, j.job_id, tid));
      });
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      addLog(`Step 4 failed: ${msg}`, 'error');
      setStepStatuses(s => ({ ...s, 4: 'failed' }));
      setFatalError(msg);
    }
  };

  // User clicked "Cancel" on the pre-flight modal - return to project selection.
  // (Before, cancel left the user stuck on the workflow page mid-pipeline.)
  const cancelStep4 = () => {
    setEstimateData(null);
    setSelectedLangs([]);
    setPendingTid(null);
    addLog('Migration cancelled by user.', 'warn');
    navigate('/transform/select');
  };

  const toggleLang = (lang) => {
    setSelectedLangs(ls =>
      ls.includes(lang) ? ls.filter(l => l !== lang) : [...ls, lang]
    );
  };

  const isAllDone    = stepStatuses[4] === 'completed';
  const stepProgress = Object.values(stepStatuses).filter(s => s === 'completed').length;
  const progressPct  = Math.round((stepProgress / 4) * 100);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Code Modernization - {project_name}</h1>
          <p className="text-gray-500 mt-1 text-sm">4-step AI-driven migration pipeline</p>
        </div>

        {/* Overall progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Step {Math.min(currentStep, 4)} of 4</span>
            <span>{progressPct}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Fatal error */}
        {fatalError && (
          <Alert type="error" title="Pipeline Error" message={fatalError}>
            <Button onClick={() => navigate('/transform/select')} size="sm" className="mt-2">
              Start Over
            </Button>
          </Alert>
        )}

        {/* Completion view */}
        {isAllDone && completionResult ? (
          <Card>
            <CompletionPanel
              result={{ ...completionResult, file_statuses: fileStatuses.length ? fileStatuses : completionResult.file_statuses }}
              projectName={project_name}
              jobId={jobIds[4] || langJobs?.[0]?.job_id}
              onSecurityScan={() => navigate('/analysis/security-scan', { state: { project_name } })}
              onNewTransform={() => navigate('/transform/select')}
              onDashboard={() => navigate('/dashboard')}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Logs + user input + step-4 file progress */}
            <div className="lg:col-span-2 space-y-4">
              {/* Live log terminal */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold text-gray-800">Live Log</span>
                  </div>
                  {currentStep > 0 && stepStatuses[currentStep] === 'running' && (
                    <span className="flex items-center gap-1 text-xs text-blue-600">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Running
                    </span>
                  )}
                </div>
                <div className="bg-gray-900 rounded-lg p-4 h-72 overflow-y-auto font-mono text-xs space-y-1">
                  {logs.length === 0 && <span className="text-gray-500">Initializing pipeline…</span>}
                  {logs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-gray-600 flex-shrink-0">{log.ts}</span>
                      <span className={LOG_COLORS[log.type] || 'text-gray-300'}>{log.msg}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </Card>

              {/* Step 4 per-language progress panel */}
              {currentStep === 4 && langJobs.length > 0 && (
                <Card>
                  <div className="flex items-center gap-2 mb-3">
                    <FileCode className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold text-gray-800">
                      Per-Language Migration Progress
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {langJobs.filter(j => j.status === 'completed').length}
                      {' / '}
                      {langJobs.length} complete
                    </span>
                  </div>
                  <div className="space-y-3">
                    {langJobs.map(j => {
                      const pct = j.total > 0 ? Math.round((j.current / j.total) * 100) : 0;
                      const barColor =
                        j.status === 'failed'    ? 'bg-red-500' :
                        j.status === 'completed' ? 'bg-green-500' :
                                                   'bg-blue-500';
                      const badge =
                        j.status === 'failed'    ? { text: 'Failed',    cls: 'text-red-700  bg-red-50  border-red-200'    } :
                        j.status === 'completed' ? { text: 'Done',      cls: 'text-green-700 bg-green-50 border-green-200' } :
                                                   { text: 'Running',   cls: 'text-blue-700  bg-blue-50 border-blue-200'   };
                      return (
                        <div key={j.job_id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800 capitalize">{j.language}</span>
                              <span className={`text-[10px] border rounded-full px-2 py-0.5 ${badge.cls}`}>
                                {badge.text}
                              </span>
                              {j.current_task && j.status === 'running' && (
                                <span className="text-xs text-gray-500 italic">
                                  {TASK_LABELS[j.current_task] || j.current_task}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 font-mono tabular-nums">
                              {j.current ?? 0} / {j.total ?? 0} files
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${barColor}`}
                              style={{ width: `${j.status === 'completed' ? 100 : pct}%` }}
                            />
                          </div>
                          {j.current_file && j.status === 'running' && (
                            <p className="text-xs text-gray-500 mt-1 font-mono truncate" title={j.current_file}>
                              {j.current_file}
                            </p>
                          )}
                          {j.error && j.status === 'failed' && (
                            <p className="text-xs text-red-600 mt-1">{j.error}</p>
                          )}
                          {/* Post-completion stats row: validation + framework */}
                          {j.status === 'completed' && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                              {typeof j.files_upgraded === 'number' && (
                                <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-200">
                                  {j.files_upgraded} upgraded
                                </span>
                              )}
                              {typeof j.files_unchanged === 'number' && j.files_unchanged > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 border border-gray-200">
                                  {j.files_unchanged} unchanged
                                </span>
                              )}
                              {typeof j.files_with_errors === 'number' && j.files_with_errors > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                                  {j.files_with_errors} errors
                                </span>
                              )}
                              {typeof j.validated_clean === 'number' && j.validated_clean > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      title="Output parsed cleanly on first attempt">
                                  ✓ {j.validated_clean} parsed clean
                                </span>
                              )}
                              {typeof j.validation_retried === 'number' && j.validation_retried > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200"
                                      title="LLM output had syntax errors on first attempt; fixed on retry">
                                  ↻ {j.validation_retried} retried
                                </span>
                              )}
                              {typeof j.validation_failed === 'number' && j.validation_failed > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200"
                                      title="LLM output did not parse even after retry; original file kept">
                                  ⚠ {j.validation_failed} kept original
                                </span>
                              )}
                              {j.framework && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                  {j.framework}
                                </span>
                              )}
                              {j.target_version && (
                                <span className="px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 border border-gray-200 font-mono">
                                  → v{j.target_version}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Fallback: single-job legacy progress (used only when langJobs is empty, e.g. if the estimate modal was bypassed) */}
              {currentStep === 4 && stepStatuses[4] === 'running' && langJobs.length === 0 && (
                <Card>
                  <div className="flex items-center gap-2 mb-3">
                    <FileCode className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold text-gray-800">File Upgrade Progress</span>
                    {step4Progress.total > 0 && (
                      <span className="text-xs text-gray-500 ml-auto">
                        {step4Progress.current} / {step4Progress.total} files
                      </span>
                    )}
                  </div>
                  {fileStatuses.length > 0 ? (
                    <FileProgressList fileStatuses={fileStatuses} />
                  ) : step4Progress.total > 0 ? (
                    <div className="space-y-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.round((step4Progress.current / step4Progress.total) * 100)}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        {Math.round((step4Progress.current / step4Progress.total) * 100)}% - processing files…
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 animate-pulse">Waiting for file processing to start…</p>
                  )}
                </Card>
              )}

              {/* User input - after step 2 */}
              {showUserInput && (
                <Card>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    Additional Requirements <span className="text-gray-400 font-normal text-sm">(optional)</span>
                  </h3>
                  <p className="text-gray-500 text-sm mb-3">
                    Step 2 complete. Add specific requirements or leave blank to use defaults.
                  </p>
                  <textarea
                    value={userInput}
                    onChange={e => setUserInput(e.target.value)}
                    placeholder="e.g. Focus on security vulnerabilities; preserve Eloquent patterns; avoid modifying test files…"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                  />
                  <Button onClick={startStep3} className="w-full mt-3">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    {userInput.trim() ? 'Run Detailed Analysis' : 'Skip & Start Modernization'}
                  </Button>
                </Card>
              )}
            </div>

            {/* Right: step list + detected info */}
            <div className="space-y-4">
              <Card>
                <h3 className="font-semibold text-gray-800 mb-3">Pipeline Steps</h3>
                <div className="space-y-2">
                  {STEPS.map(step => (
                    <StepCard
                      key={step.id}
                      step={step}
                      status={stepStatuses[step.id]}
                      isActive={currentStep === step.id && stepStatuses[step.id] === 'running'}
                      runningTaskLabel={runningTaskLabel}
                    />
                  ))}
                </div>
              </Card>

              {detectedInfo && (
                <Card>
                  <h3 className="font-semibold text-gray-800 mb-3">Detected Project</h3>
                  <div className="space-y-3">
                    {detectedInfo.language && (
                      <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Language</p>
                        <p className="text-xl font-bold text-gray-900 capitalize">
                          {LANGUAGE_DISPLAY_NAMES[detectedInfo.language] || detectedInfo.language}
                        </p>
                      </div>
                    )}
                    {detectedInfo.framework && (
                      <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                        <p className="text-xs text-gray-500 uppercase font-medium mb-1">Framework</p>
                        <p className="text-lg font-semibold text-gray-900">{detectedInfo.framework}</p>
                      </div>
                    )}
                    {detectedInfo.fromVersion && detectedInfo.toVersion && (
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                        <p className="text-xs text-gray-500 uppercase font-medium mb-2">Version Path</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded font-mono text-sm font-bold">
                            {detectedInfo.fromVersion}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-mono text-sm font-bold">
                            {detectedInfo.toVersion}
                          </span>
                        </div>
                        {(() => {
                          const steps = getVersionLadder(detectedInfo.language, detectedInfo.fromVersion, detectedInfo.toVersion);
                          return steps.length > 2 ? (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-400 mb-1">Migration steps:</p>
                              <div className="flex flex-wrap gap-1">
                                {steps.map((v, i) => (
                                  <span key={i} className="bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded font-mono">{v}</span>
                                ))}
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Pre-flight estimate modal (shown before Step 4 actually fires) ─── */}
      {(estimateData || estimateLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preflight-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 id="preflight-title" className="text-xl font-bold text-gray-900">
                {estimateLoading ? 'Scanning project…' : 'Ready to start code migration?'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {estimateLoading
                  ? 'Enumerating files, estimating runtime and cost.'
                  : 'Review the scope below, choose which languages and target versions to migrate, then confirm to start the 4-step pipeline.'}
              </p>
            </div>

            {estimateLoading ? (
              <div className="p-10 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-primary-500 animate-spin mr-3" />
                <span className="text-sm text-gray-600">Running pre-flight check…</span>
              </div>
            ) : (
              estimateData && (
                <div className="p-6 space-y-5">
                  {/* Step 1 detection banner - surfaces framework + version so the user
                      confirms the correct stack was detected before paying for migration. */}
                  {detectedInfo && (detectedInfo.framework || detectedInfo.fromVersion) && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
                      <p className="text-xs uppercase tracking-wider text-blue-700 font-semibold mb-1">
                        Detected by Step 1
                      </p>
                      <div className="flex flex-wrap gap-2 text-gray-800">
                        {detectedInfo.language && (
                          <span className="inline-flex items-center gap-1">
                            <Code2 className="w-3.5 h-3.5 text-blue-600" />
                            <span className="font-medium">
                              {LANGUAGE_DISPLAY_NAMES[detectedInfo.language] || detectedInfo.language}
                            </span>
                          </span>
                        )}
                        {detectedInfo.framework && (
                          <span className="inline-flex items-center gap-1 text-blue-800">
                            <span className="text-gray-400">·</span>
                            <span className="font-medium">{detectedInfo.framework}</span>
                          </span>
                        )}
                        {detectedInfo.fromVersion && detectedInfo.toVersion && (
                          <span className="inline-flex items-center gap-1 text-gray-700">
                            <span className="text-gray-400">·</span>
                            <span className="font-mono text-xs">
                              {detectedInfo.fromVersion} → {detectedInfo.toVersion}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Warnings banner - shown when project exceeds env limits */}
                  {!estimateData.within_limits && (
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-300">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-900 mb-1">
                            System limits exceeded - continue at your own pace
                          </p>
                          <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                            {(estimateData.warnings || []).map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                          <p className="text-xs text-amber-700 mt-2">
                            You can still proceed, but the migration will take longer and may be
                            subject to per-minute rate limits. To raise limits, set the
                            indicated environment variables and restart.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Per-language file counts + checkboxes */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                      Detected languages ({(estimateData.languages_detected || []).length})
                    </p>
                    {(estimateData.languages_detected || []).length === 0 ? (
                      <p className="text-sm text-gray-500 italic">
                        No supported source files detected in this project.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {(estimateData.languages_detected || []).map((l) => {
                          const checked = selectedLangs.includes(l.language);
                          const ladder = versionOptions.ladders?.[l.language] || [];
                          const current = targetVersions[l.language] || versionOptions.defaults?.[l.language] || '';
                          return (
                            <div
                              key={l.language}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                checked
                                  ? 'border-primary-400 bg-primary-50'
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleLang(l.language)}
                                className="w-4 h-4 text-primary-600 rounded cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-medium text-gray-800 capitalize truncate">
                                      {l.language}
                                    </span>
                                    {/* Badge: 'tuned' if the backend has a hand-tuned prompt for this
                                        language, else 'generic' (warn users of expected accuracy). */}
                                    {TUNED_PROMPT_LANGUAGES.has(l.language) ? (
                                      <span
                                        className="text-[10px] bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 whitespace-nowrap"
                                        title="Uses a hand-tuned per-language prompt with known migration gotchas"
                                      >
                                        tuned
                                      </span>
                                    ) : (
                                      <span
                                        className="text-[10px] bg-gray-50 text-gray-500 border border-gray-200 rounded-full px-2 py-0.5 whitespace-nowrap"
                                        title="Uses the generic modernization prompt. First-pass quality only, human review recommended"
                                      >
                                        generic
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-500 font-mono tabular-nums whitespace-nowrap">
                                      {l.files} {l.files === 1 ? 'file' : 'files'} · {(l.bytes / 1024).toFixed(1)} KB
                                    </span>
                                  </div>
                                  {checked && (
                                    ladder.length > 0 ? (
                                      <select
                                        value={current}
                                        onChange={(e) =>
                                          setTargetVersions((tv) => ({ ...tv, [l.language]: e.target.value }))
                                        }
                                        className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        title={`Target ${l.language} version`}
                                      >
                                        {ladder.map((v) => (
                                          <option key={v} value={v}>
                                            → {v}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic whitespace-nowrap">
                                        (target: auto)
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Estimate block */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Estimated runtime</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        {estimateData.estimate?.wall_clock_human ?? '-'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        ~{estimateData.estimate?.avg_seconds_per_file ?? '?'}s per file, {estimateData.limits?.MIRA_MAX_CONCURRENT_LLM_CALLS ?? 1} parallel
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Estimated cost</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">
                        ${estimateData.estimate?.estimated_cost_usd?.toFixed?.(2) ?? estimateData.estimate?.estimated_cost_usd ?? '-'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {((estimateData.estimate?.estimated_tokens_input ?? 0) / 1_000_000).toFixed(2)}M in · {((estimateData.estimate?.estimated_tokens_output ?? 0) / 1_000_000).toFixed(2)}M out
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 bg-gray-50 rounded-md p-3 space-y-1">
                    <div>
                      <span className="font-semibold">Total files:</span> {estimateData.total_files} ({(estimateData.total_bytes / 1024).toFixed(1)} KB)
                    </div>
                    <div>
                      <span className="font-semibold">File size cap:</span> {((estimateData.limits?.MIRA_MAX_LLM_FILE_BYTES ?? 0) / 1024).toFixed(0)} KB per file. Larger files are split at AST boundaries
                    </div>
                    <div>
                      <span className="font-semibold">Timeout:</span> {Math.round((estimateData.limits?.MIRA_JOB_TIMEOUT_SECONDS ?? 0) / 60)} minutes (MIRA_JOB_TIMEOUT_SECONDS)
                    </div>
                  </div>
                </div>
              )
            )}

            {!estimateLoading && estimateData && (
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <Button variant="ghost" onClick={cancelStep4}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={confirmStep4}
                  disabled={selectedLangs.length === 0}
                >
                  Run migration ({selectedLangs.length} {selectedLangs.length === 1 ? 'language' : 'languages'})
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
