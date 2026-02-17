import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import MainProgressBar from '../../components/ui/MainProgressBar';
import api from '../../utils/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const ConversionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { jobId, transformId, projectName, phase, frameworkOverride } = location.state || {};

  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState([]);
  const [jobStatus, setJobStatus] = useState('running');
  const [errorMessage, setErrorMessage] = useState('');
  const [jobResult, setJobResult] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(phase || 'structure');
  const [currentJobId, setCurrentJobId] = useState(jobId);
  const [userComment, setUserComment] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isModernizing, setIsModernizing] = useState(false);
  const [excludeVendor, setExcludeVendor] = useState(true);
  const [excludeNodeModules, setExcludeNodeModules] = useState(true);
  const [openReport, setOpenReport] = useState(null);
  const [isRegenerated, setIsRegenerated] = useState(false);

  const jobStatusRef = useRef('running');
  const completedRef = useRef(false);
  const regeneratePollRef = useRef(null);
  const logsPollRef = useRef(null);
  const seenLogsCountRef = useRef(0);
  const logsEndRef = useRef(null);
  /** Prevents duplicate "starting/completed" logs when the effect re-runs or polls overlap (async + interval). */
  const structurePhaseKeyRef = useRef(null);
  const structureOutcomeHandledRef = useRef(false);

  const conversionSteps = [
   "structure_analysis",
        "language_analysis",
        "upgrade_analysis",
        "code_modernization"
  ];

  const addLog = (message, status = 'processing') => {
    setLogs((prev) => [
      ...prev,
      { timestamp: new Date().toLocaleTimeString(), message, status }
    ]);
  };

  // Step animation - loops until job completes
  useEffect(() => {
    const stepDuration = 4500;

    const animTimer = setInterval(() => {
      if (completedRef.current) {
        clearInterval(animTimer);
        return;
      }

      setCurrentStep((prev) => {
        const next = (prev + 1) % conversionSteps.length;
        setProgress((p) => {
          if (jobStatusRef.current === 'completed') return 100;
          return Math.min(p + 100 / (conversionSteps.length * 3), 90);
        });
        return next;
      });
    }, stepDuration);

    return () => clearInterval(animTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase 1: Structure and Language Analysis
  useEffect(() => {
    if (currentPhase !== 'structure' || !currentJobId || !transformId) return;

    const phaseKey = `${transformId}:${currentJobId}`;
    if (structurePhaseKeyRef.current !== phaseKey) {
      structurePhaseKeyRef.current = phaseKey;
      structureOutcomeHandledRef.current = false;
      addLog('Starting structure and language analysis...', 'processing');
    }

    let pollTimer = null;
    const poll = async () => {
      if (completedRef.current) return;
      if (structureOutcomeHandledRef.current) return;

      try {
        const { data } = await api.get(
          `/agents/run-structure-and-language/status/${currentJobId}`
        );

        if (data.status === 'completed') {
          if (structureOutcomeHandledRef.current) return;
          structureOutcomeHandledRef.current = true;
          if (pollTimer) clearInterval(pollTimer);

          addLog('Structure and language analysis completed', 'success');

          try {
            const { data: upgradeData } = await api.post(
              '/agents/run-upgrade-analysis-simple',
              {
                transform_id: transformId,
                project_name: projectName || id,
                ...(frameworkOverride ? { framework_override: frameworkOverride } : {}),
              }
            );

            // Set both together AFTER getting the new job_id
            // so Phase 2 effect always starts with the correct upgrade job_id
            setCurrentJobId(upgradeData.job_id);
            setCurrentPhase('upgrade');
            addLog('Upgrade analysis started', 'processing');
          } catch (err) {
            completedRef.current = true;
            jobStatusRef.current = 'failed';
            setJobStatus('failed');
            const msg = err?.response?.data?.detail || 'Failed to start upgrade analysis.';
            setErrorMessage(msg);
            addLog(msg, 'error');
          }
        } else if (data.status === 'failed') {
          if (structureOutcomeHandledRef.current) return;
          structureOutcomeHandledRef.current = true;
          if (pollTimer) clearInterval(pollTimer);
          completedRef.current = true;
          jobStatusRef.current = 'failed';
          setJobStatus('failed');
          const msg = data.error || data.result?.message || 'Structure and language analysis failed.';
          setErrorMessage(msg);
          addLog(msg, 'error');
        }
      } catch (err) {
        const detail = err?.response?.data?.detail || '';
        if (err?.response?.status === 404 || detail.toLowerCase().includes('not found or expired')) {
          if (!structureOutcomeHandledRef.current) {
            structureOutcomeHandledRef.current = true;
            if (pollTimer) clearInterval(pollTimer);
          }
          completedRef.current = true;
          jobStatusRef.current = 'failed';
          setJobStatus('failed');
          setErrorMessage('Job not found or expired.');
          addLog('Job not found or expired', 'error');
          return;
        }
        console.error('Polling error:', err);
        addLog('Failed to fetch job status, retrying...', 'error');
      }
    };

    poll();
    pollTimer = setInterval(poll, 3_000);

    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [currentPhase, currentJobId, transformId, projectName, id]);

  // Phase 2: Upgrade Analysis
  useEffect(() => {
    if (currentPhase !== 'upgrade' || !currentJobId || completedRef.current) return;

    // Reset seen-logs counter whenever a new upgrade job starts
    seenLogsCountRef.current = 0;

    // --- Logs polling (every 2 s) ---
    const pollLogs = async () => {
      try {
        const { data } = await api.get(
          `/agents/run-modernization/status/${currentJobId}/logs`
        );
        const apiLogs = data.logs || [];
        const newLogs = apiLogs.slice(seenLogsCountRef.current);
        if (newLogs.length > 0) {
          seenLogsCountRef.current = apiLogs.length;
          // Append only the genuinely new entries, stripping logger prefix
          // e.g. "2026-03-17 06:10:55,095 - app.services.agents.x - INFO - actual message"
          const stripLogPrefix = (msg) =>
            msg.replace(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d+ - .+? - [A-Z]+ - /, '');
          newLogs.forEach((msg) => addLog(stripLogPrefix(msg), 'processing'));
        }
      } catch (err) {
        console.error('Logs poll error:', err?.response?.data || err);
      }
    };

    // Fire immediately so logs appear without waiting 2 s
    pollLogs();
    logsPollRef.current = setInterval(pollLogs, 2_000);

    // --- Status polling (every 30 s) ---
    const poll = async () => {
      if (completedRef.current) return;
      
      try {
        const { data } = await api.get(
          `/agents/run-upgrade-analysis/status/${currentJobId}`
        );

        if (data.status === 'completed') {
          // Do one final logs fetch before marking complete
          await pollLogs();
          clearInterval(logsPollRef.current);

          completedRef.current = true;
          jobStatusRef.current = 'completed';
          setJobStatus('completed');
          setJobResult(data.result || null);
          setProgress(100);
          setCurrentStep(conversionSteps.length);
          addLog('Upgrade analysis completed successfully!', 'success');
        } else if (data.status === 'failed') {
          clearInterval(logsPollRef.current);
          completedRef.current = true;
          jobStatusRef.current = 'failed';
          setJobStatus('failed');
          const msg = data.result?.message || 'Upgrade analysis failed.';
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
        addLog('Failed to fetch job status, retrying...', 'error');
      }
    };

    poll();
    const pollTimer = setInterval(poll, 30_000);
    return () => {
      clearInterval(pollTimer);
      clearInterval(logsPollRef.current);
    };
  }, [currentPhase, currentJobId]);

  // Cleanup regeneration interval on unmount
  useEffect(() => () => {
    if (regeneratePollRef.current) clearInterval(regeneratePollRef.current);
  }, []);

  // Auto-scroll logs to bottom whenever new entries arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleRegenerate = async () => {
    if (regeneratePollRef.current) clearInterval(regeneratePollRef.current);
    // Clear any previous logs poll and reset counter for the new job
    if (logsPollRef.current) clearInterval(logsPollRef.current);
    seenLogsCountRef.current = 0;

    setIsRegenerating(true);
    addLog('Regenerating upgrade plan...', 'processing');
    try {
      const { data } = await api.post('/agents/run-upgrade-analysis', {
        transform_id: transformId,
        project_name: projectName || id,
        user_input: userComment || null,
      });

      addLog('Regeneration job started', 'processing');
      const newJobId = data.job_id;

      // Poll logs every 2 s for the regeneration job
      const pollRegenLogs = async () => {
        try {
          const { data: logsData } = await api.get(
            `/agents/run-modernization/status/${newJobId}/logs`
          );
          const apiLogs = logsData.logs || [];
          const newLogs = apiLogs.slice(seenLogsCountRef.current);
          if (newLogs.length > 0) {
            seenLogsCountRef.current = apiLogs.length;
            const stripLogPrefix = (msg) =>
              msg.replace(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d+ - .+? - [A-Z]+ - /, '');
            newLogs.forEach((msg) => addLog(stripLogPrefix(msg), 'processing'));
          }
        } catch (err) {
          console.error('Regen logs poll error:', err?.response?.data || err);
        }
      };
      // Fire immediately so there is no 2 s gap before first logs appear
      pollRegenLogs();
      logsPollRef.current = setInterval(pollRegenLogs, 2_000);

      const poll = async () => {
        try {
          const { data: status } = await api.get(
            `/agents/run-upgrade-analysis/status/${newJobId}`
          );
          if (status.status === 'completed') {
            await pollRegenLogs(); // final sweep before closing
            clearInterval(regeneratePollRef.current);
            clearInterval(logsPollRef.current);
            setJobResult(status.result || null);
            setIsRegenerating(false);
            setIsRegenerated(true);
            addLog('Plan regenerated successfully!', 'success');
          } else if (status.status === 'failed') {
            clearInterval(regeneratePollRef.current);
            clearInterval(logsPollRef.current);
            setIsRegenerating(false);
            const msg = status.error || status.result?.message || 'Regeneration failed.';
            addLog(msg, 'error');
          }
        } catch (err) {
          console.error('Regeneration poll error:', err);
        }
      };

      poll();
      regeneratePollRef.current = setInterval(poll, 30_000);
    } catch (err) {
      clearInterval(logsPollRef.current);
      setIsRegenerating(false);
      const msg = err?.response?.data?.detail || 'Failed to regenerate plan.';
      addLog(msg, 'error');
    }
  };

  const handleModernize = async () => {
    setIsModernizing(true);
    try {
      const excludePaths = [];
      if (excludeVendor) excludePaths.push('vendor');
      if (excludeNodeModules) excludePaths.push('node_modules');
      excludePaths.push('.git');
      const { data } = await api.post('/agents/run-code-modernization', {
        transform_id: transformId,
        project_name: projectName || id,
        ...(frameworkOverride ? { framework_override: frameworkOverride } : {}),
        exclude_paths: excludePaths,
      });
      navigate(`/analysis/${id}/modernizing`, {
        state: { jobId: data.job_id, transformId, projectName: projectName || id, frameworkOverride },
      });
    } catch (err) {
      setIsModernizing(false);
      const msg = err?.response?.data?.detail || 'Failed to start modernization.';
      addLog(msg, 'error');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Code Modernization in Progress
          </h1>
          <p className="text-gray-600">
            Step 2 of 5 - Modernizing your legacy code
          </p>
        </div>

        {/* Progress Indicator */}
        <MainProgressBar step={2} totalSteps={5} title="Code Conversion" />

        <div className="space-y-6">
          {/* Job status banner - failed */}
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
                  onClick={() => navigate(`/analysis/${id}/stack-selection`)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  ← Back to Configuration
                </button>
              </div>
            </div>
          )}

          {/* Job status banner - completed */}
          {jobStatus === 'completed' && jobResult && (
            <Card>
              {isRegenerated && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 font-medium">
                  <svg className="w-4 h-4 flex-shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Report regenerated. Showing latest results
                </div>
              )}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Analysis Complete!</h3>
                  <p className="text-sm text-gray-500">
                    {jobResult.timestamp ? new Date(jobResult.timestamp).toLocaleString() : 'Completed'}
                  </p>
                </div>
              </div>
              {jobResult.from_version && jobResult.to_version && (
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-200">
                  PHP {jobResult.from_version} → {jobResult.to_version}
                </span>
              )}
              </div>

              {jobResult.from_version && jobResult.to_version && (
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">PHP {jobResult.from_version} → {jobResult.to_version}</p>
                    <p className="text-xs text-gray-500 mt-1">PHP Version</p>
                  </div>
                  {jobResult.from_laravel && jobResult.to_laravel && (
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-700">Laravel {jobResult.from_laravel} → {jobResult.to_laravel}</p>
                      <p className="text-xs text-gray-500 mt-1">Laravel Version</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2 mb-5">
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 w-32 flex-shrink-0">Project</span>
                  <span className="font-medium text-gray-800">{jobResult.project_name}</span>
                </div>
                {jobResult.source_path && (
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 w-32 flex-shrink-0">Source</span>
                    <span className="font-mono text-gray-700 text-xs bg-gray-100 px-2 py-0.5 rounded">{jobResult.source_path}</span>
                  </div>
                )}
                {jobResult.server_hostname && (
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 w-32 flex-shrink-0">Server</span>
                    <span className="font-medium text-gray-800">{jobResult.server_hostname}</span>
                  </div>
                )}
                {jobResult.step && (
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 w-32 flex-shrink-0">Step</span>
                    <span className="font-medium text-gray-800">{jobResult.step}</span>
                  </div>
                )}
              </div>

              {[
                { key: 'sonarqube_report_content',      label: 'SonarQube Report',      icon: '🔍' },
                { key: 'php_upgrade_guide_content',     label: 'PHP Upgrade Guide',     icon: '🐘' },
                { key: 'laravel_upgrade_guide_content', label: 'Laravel Upgrade Guide', icon: '🚀' },
              ].map(({ key, label, icon }) =>
                jobResult[key] && (
                  <div key={key} className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setOpenReport(openReport === key ? null : key)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
                    >
                      <span> {label}</span>
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${openReport === key ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {openReport === key && (
                      <div className="p-4 bg-white max-h-64 overflow-y-auto prose prose-sm max-w-none text-gray-700">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{jobResult[key]}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Optional comment for regeneration */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Additional Instructions <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  placeholder="e.g. focus on security fixes, rebuild with more detail..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={excludeVendor} onChange={(e) => setExcludeVendor(e.target.checked)} className="rounded" />
                  <span>Exclude vendor/</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={excludeNodeModules} onChange={(e) => setExcludeNodeModules(e.target.checked)} className="rounded" />
                  <span>Exclude node_modules/</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Regenerate Plan is optional (adds a SonarQube / upgrade pass with your comments). You can start modernization as soon as the analysis above is complete.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating || isModernizing}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors flex items-center space-x-2 "
                >
                  {isRegenerating ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                      <span>Regenerating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Regenerate Plan</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleModernize}
                  disabled={isRegenerating || isModernizing}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors flex items-center space-x-2 "
                >
                  {isModernizing ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Start Modernization</span>
                    </>
                  )}
                </button>
              </div>
            </Card>
          )}

          {/* Polling notice */}
          {/* {jobStatus === 'running' && currentJobId && (
            // <div className="flex items-center space-x-2 text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2">
            //   <div className="animate-spin h-3.5 w-3.5 border-2 border-blue-400 border-t-transparent rounded-full flex-shrink-0" />
            //   <span>
            //     {currentPhase === 'structure' 
            //       ? 'Structure and language analysis in progress - checking status every 10 seconds'
            //       : 'Upgrade analysis in progress - checking status every 30 seconds'}
            //   </span>
            </div> */}
         {/* )} */}

          {/* Progress Bar */}
          {/* <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Conversion Progress
            </h2>
            <ProgressBar progress={Math.round(progress)} label="Overall Progress" />
            <div className="mt-4 text-center text-sm text-gray-600">
              {jobStatus === 'completed'
                ? 'Modernization complete! 🎉'
                : jobStatus === 'failed'
                ? 'Modernization failed.'
                : 'Please wait while we modernize your code...'}
            </div>
          </Card> */}

          {/* Conversion Steps */}
          {/* <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Conversion Steps
            </h2>
            <div className="space-y-2">
              {conversionSteps.map((step, index) => {
                const isCompleted =
                  jobStatus === 'completed' || index < currentStep;
                const isActive =
                  jobStatus === 'running' && index === currentStep;
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
                    <span className="text-sm font-medium">{step}</span>
                  </div>
                );
              })}
            </div>
          </Card> */}

          {/* Live Logs - shown while running, failed, regenerating, or starting modernization */}
          {(jobStatus === 'running' || jobStatus === 'failed' || isRegenerating || isModernizing) && logs.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {isRegenerating ? 'Regeneration Logs' : isModernizing ? 'Modernization Logs' : 'Live Logs'}
                </h2>
                {(jobStatus === 'running' || isRegenerating || isModernizing) && (
                  <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-72 overflow-y-auto">
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
                {(jobStatus === 'running' || isRegenerating || isModernizing) && (
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
