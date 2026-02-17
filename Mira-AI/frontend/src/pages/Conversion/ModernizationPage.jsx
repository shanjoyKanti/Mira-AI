import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import MainProgressBar from '../../components/ui/MainProgressBar';
import { FileDiffViewer } from '../../components/ui/FileDiffViewer';
import { ValidationPanel } from '../../components/ui/ValidationPanel';
import api from '../../utils/api';

export const ModernizationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { jobId, projectName, transformId } = location.state || {};

  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState([]);
  const [jobStatus, setJobStatus] = useState('running');
  const [errorMessage, setErrorMessage] = useState('');
  const [jobResult, setJobResult] = useState(null);
  const [fileProgress, setFileProgress] = useState({ processed: 0, total: 0, currentFile: '', files: [] });

  const jobStatusRef = useRef('running');
  const completedRef = useRef(false);
  const logsPollRef = useRef(null);
  const seenLogsCountRef = useRef(0);
  const logsEndRef = useRef(null);
  const pendingResultRef = useRef(null);   // stores API result until animation finishes
  const animStepTimersRef = useRef([]);    // tracks all step-animation timers for cleanup

  const steps = ['analyzing_files', 'upgrading_code', 'validating_output', 'finalizing'];

  const addLog = (message, status = 'processing') => {
    setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString(), message, status }]);
  };

  // Step animation - driven by real backend status, no artificial multi-second delays
  useEffect(() => {
    const track = (id) => { animStepTimersRef.current.push(id); return id; };

    addLog('Code modernization started...', 'processing');

    setCurrentStep(0);
    setProgress(5);

    // After 3s move to "upgrading_code" step - real work has started by then
    track(setTimeout(() => {
      setCurrentStep(1);
      setProgress(15);
    }, 3_000));

    // Slowly nudge progress so UI feels alive (caps at 80%)
    const slowProgressId = track(setInterval(() => {
      if (completedRef.current) return;
      setProgress((p) => Math.min(p + 0.3, 80));
    }, 1_000));

    // React to backend completion/failure with minimal animation delay
    const waitForApiId = track(setInterval(() => {
      if (!completedRef.current) return;

      clearInterval(slowProgressId);
      clearInterval(waitForApiId);

      if (jobStatusRef.current === 'failed') return;

      setCurrentStep(2);
      setProgress(90);

      // Brief 1.5s finalization step, then surface results
      track(setTimeout(() => {
        setCurrentStep(3);
        setProgress(100);
        setJobStatus('completed');
        setJobResult(pendingResultRef.current);
      }, 1_500));
    }, 400));

    return () => {
      animStepTimersRef.current.forEach((tid) => {
        clearTimeout(tid);
        clearInterval(tid);
      });
      animStepTimersRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Logs polling - every 2 seconds
  useEffect(() => {
    if (!jobId) return;

    seenLogsCountRef.current = 0;

    const pollLogs = async () => {
      try {
        const { data } = await api.get(`/agents/run-modernization/status/${jobId}/logs`);
        const apiLogs = data.logs || [];
        const newLogs = apiLogs.slice(seenLogsCountRef.current);
        if (newLogs.length > 0) {
          seenLogsCountRef.current = apiLogs.length;
          const stripLogPrefix = (msg) =>
            msg.replace(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d+ - .+? - [A-Z]+ - /, '');
          newLogs.forEach((msg) => addLog(stripLogPrefix(msg), 'processing'));
        }
      } catch (err) {
        console.error('Logs poll error:', err?.response?.data || err);
      }
    };

    // Fire immediately, then every 2 s
    pollLogs();
    logsPollRef.current = setInterval(pollLogs, 2_000);

    return () => clearInterval(logsPollRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // Status polling - every 10 seconds for progress updates
  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      if (completedRef.current) return;
      try {
        const { data } = await api.get(`/agents/run-code-modernization/status/${jobId}`);

        if (data.status === 'completed') {
          clearInterval(logsPollRef.current);
          completedRef.current = true;
          jobStatusRef.current = 'completed';
          pendingResultRef.current = data.result || null;
          addLog('Code modernization completed successfully!', 'success');
        } else if (data.processed_files !== undefined || data.files) {
          setFileProgress({
            processed: data.processed_files ?? 0,
            total: data.total_files ?? 0,
            currentFile: data.current_file ?? '',
            files: data.files ?? [],
          });
        }
        if (data.status === 'failed') {
          clearInterval(logsPollRef.current);
          completedRef.current = true;
          jobStatusRef.current = 'failed';
          setJobStatus('failed');
          const msg = data.error || data.result?.message || 'Code modernization failed.';
          setErrorMessage(msg);
          addLog(msg, 'error');
        }
      } catch (err) {
        const detail = err?.response?.data?.detail || '';
        if (err?.response?.status === 404 || detail.toLowerCase().includes('not found or expired')) {
          clearInterval(logsPollRef.current);
          completedRef.current = true;
          jobStatusRef.current = 'failed';
          setJobStatus('failed');
          setErrorMessage('Job not found or expired.');
          addLog('Job not found or expired', 'error');
          return;
        }
        console.error('Polling error:', err);
        addLog('Failed to fetch status, retrying...', 'error');
      }
    };

    poll();
    const pollTimer = setInterval(poll, 10_000);
    return () => clearInterval(pollTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // Auto-scroll logs to bottom on new entries
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Code Modernization
          </h1>
          <p className="text-gray-600">
            Step 3 of 5 - Upgrading your codebase to the latest standards
          </p>
        </div>

        <MainProgressBar step={3} totalSteps={5} title="Modernization" />

        <div className="space-y-6">

           {/* Progress bar */}
           <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Modernization Progress</h2>
            <ProgressBar progress={Math.round(progress)} label="Overall Progress" />
            <div className="mt-4 text-center text-sm text-gray-600">
              {jobStatus === 'completed'
                ? 'Modernization complete! 🎉'
                : jobStatus === 'failed'
                ? 'Modernization failed.'
                : 'Upgrading your codebase...'}
            </div>
          </Card>

          {/* Failed banner */}
          {jobStatus === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-red-800">Modernization Failed</p>
                  <p className="text-sm text-red-700 mt-0.5">{errorMessage}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => navigate(`/analysis/${id}/converting`)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  ← Back to Analysis
                </button>
              </div>
            </div>
          )}

          {/* Completed result */}
          {jobStatus === 'completed' && jobResult && (
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Modernization Complete!</h3>
                    <p className="text-sm text-gray-500">
                      {jobResult.timestamp ? new Date(jobResult.timestamp).toLocaleString() : 'Completed'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{jobResult.total_files ?? '-'}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Files</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{jobResult.files_upgraded ?? '-'}</p>
                  <p className="text-xs text-gray-500 mt-1">Upgraded</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{jobResult.files_unchanged ?? '-'}</p>
                  <p className="text-xs text-gray-500 mt-1">Unchanged</p>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {jobResult.project_name && (
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 w-32 flex-shrink-0">Project</span>
                    <span className="font-medium text-gray-800">{jobResult.project_name}</span>
                  </div>
                )}
                {jobResult.source_path && (
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 w-32 flex-shrink-0">Source</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">{jobResult.source_path}</span>
                  </div>
                )}
                {jobResult.output_path && (
                  <div className="flex items-start text-sm">
                    <span className="text-gray-500 w-32 flex-shrink-0">Output</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 break-all">{jobResult.output_path}</span>
                  </div>
                )}
                {jobResult.server_hostname && (
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 w-32 flex-shrink-0">Server</span>
                    <span className="font-medium text-gray-800">{jobResult.server_hostname}</span>
                  </div>
                )}
              </div>

              {jobResult.message && (
                <div className="flex items-start gap-2 mb-5 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{jobResult.message}</span>
                </div>
              )}

              {/* Post-migration validation (tree-sitter + native linter + Sonar delta) */}
              <ValidationPanel jobId={jobId} />

              {/* File list with expandable diff */}
              {jobResult.files?.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Files (click to view diff)</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {jobResult.files.map((f, idx) => (
                      <FileDiffViewer
                        key={idx}
                        jobId={jobId}
                        filePath={f.path}
                        status={f.syntax === 'syntax_error' || (f.violations?.length > 0) ? 'error' : 'completed'}
                        changesCount={f.changes_count ?? 0}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => navigate(`/analysis/${id}/converting`, { state: { jobId, transformId, projectName: projectName || id, phase: 'upgrade' } })}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => navigate(`/analysis/${id}/testing`, { state: { jobId, jobResult } })}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <span>Proceed to Testing</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </Card>
          )}

          {/* Polling notice + time estimate */}
          {jobStatus === 'running' && jobId && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-3.5 w-3.5 border-2 border-blue-400 border-t-transparent rounded-full flex-shrink-0" />
                <span>Modernization in progress - checking status every 10 seconds</span>
              </div>
              {(fileProgress.total > 0 || fileProgress.processed > 0) && (
                <span className="text-blue-700 font-medium">
                  Estimated: ~{Math.ceil((fileProgress.total || 0) * 15 / 60)} min
                  {fileProgress.processed > 0 && ` • ${fileProgress.processed}/${fileProgress.total} files`}
                </span>
              )}
            </div>
          )}

         

          {/* File-by-file progress */}
          {jobStatus === 'running' && (fileProgress.total > 0 || fileProgress.files?.length > 0) && (
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Modernization Progress</h2>
              {fileProgress.currentFile && (
                <p className="text-sm text-gray-600 mb-3">
                  File {fileProgress.processed} of {fileProgress.total}: <span className="font-mono text-xs">{fileProgress.currentFile}</span>
                </p>
              )}
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {fileProgress.files?.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className={f.status === 'completed' ? 'text-green-500' : 'text-red-500'}>
                      {f.status === 'completed' ? '✓' : '✗'}
                    </span>
                    <span className="font-mono text-xs text-gray-700 truncate flex-1" title={f.path}>{f.path}</span>
                    {f.changes_count > 0 && <span className="text-xs text-gray-500">({f.changes_count} changes)</span>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Steps */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Modernization Steps</h2>
            <div className="space-y-2">
              {steps.map((step, index) => {
                const isCompleted = jobStatus === 'completed' || index < currentStep;
                const isActive = jobStatus === 'running' && index === currentStep;
                return (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-300 ${
                      isCompleted
                        ? 'bg-green-50 text-green-700'
                        : isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <span className="text-green-500">✓</span>
                      ) : isActive ? (
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                      ) : (
                        <span className="text-gray-400">○</span>
                      )}
                    </div>
                    <span className="text-sm font-medium capitalize">{step.replace(/_/g, ' ')}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Live Logs - shown while running or failed */}
          {(jobStatus === 'running' || jobStatus === 'failed') && logs.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Modernization Logs</h2>
                {jobStatus === 'running' && (
                  <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <div className="bg-gray-900 p-4 rounded-lg font-mono text-xs max-h-72 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1 leading-relaxed break-all">
                    <span
                      className={
                        log.status === 'success'
                          ? 'text-green-400'
                          : log.status === 'error'
                          ? 'text-red-400'
                          : 'text-gray-300'
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
                {jobStatus === 'running' && (
                  <div className="animate-pulse text-green-400 mt-1">▋</div>
                )}
                <div ref={logsEndRef} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
