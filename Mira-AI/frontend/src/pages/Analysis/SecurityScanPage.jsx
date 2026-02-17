import { useState, useRef } from 'react';
import api from '../../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import MainProgressBar from '../../components/ui/MainProgressBar';
import { FolderOpen, Building2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

import { REPORT_TYPES } from '../../utils/languageConfig';

const getLabelForType = (id) => {
  const rt = REPORT_TYPES.find((r) => r.id === id);
  return rt ? rt.label : id;
};

const TASKS = [
  { id: 1, label: 'Scanning codebase structure', duration: 1500 },
  { id: 2, label: 'Detecting vulnerabilities', duration: 2000 },
  { id: 3, label: 'Mapping security frameworks', duration: 1800 },
  { id: 4, label: 'Analyzing dependencies', duration: 1600 },
  { id: 5, label: 'Generating reports', duration: 1200 },
];

export const SecurityScanPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prevData = location.state || {};

  // Support both snake_case (from SelectProjectPage) and camelCase (from wizard flow)
  const projectName = prevData.project_name || prevData.projectName || '';
  const orgName = prevData.organization_name || prevData.organizationName;
  const legacyTech = prevData.legacy_technology || [];
  const industry = prevData.industry;

  // reportTypes already use backend IDs (e.g. 'generic_security', 'owasp_top_10')
  const resolvedApiReportTypes = prevData.reportTypes?.length
    ? prevData.reportTypes
    : ['generic_security'];

  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [completedTasks, setCompletedTasks] = useState([]);
  const [error, setError] = useState(null);

  const apiDoneRef = useRef(false);
  const apiResponseRef = useRef(null);
  const animationActiveRef = useRef(false);

  const startScan = (endpoint = '/analyze/scan/with-llm') => {
    setIsScanning(true);
    setProgress(0);
    setCompletedTasks([]);
    setError(null);
    apiDoneRef.current = false;
    apiResponseRef.current = null;
    animationActiveRef.current = true;

    // Fire API in the background; animation loop runs independently until it resolves
    api
      .post(endpoint, {
        project_name: projectName,
        report_types: resolvedApiReportTypes,
      })
      .then(response => {
        apiResponseRef.current = response.data;
        apiDoneRef.current = true;
      })
      .catch(err => {
        apiResponseRef.current = {
          __error: true,
          message: err.response?.data?.detail || 'Analysis failed. Please try again.',
        };
        apiDoneRef.current = true;
      });

    let taskIndex = 0;

    const runNextTask = () => {
      if (!animationActiveRef.current) return;

      const task = TASKS[taskIndex % TASKS.length];
      const isFirstPass = taskIndex < TASKS.length;

      setCurrentTask(task.label);

      setTimeout(() => {
        if (!animationActiveRef.current) return;

        if (isFirstPass) {
          setCompletedTasks(prev => [...prev, task.id]);
          setProgress(prev => Math.min(prev + 90 / TASKS.length, 90));
        }

        taskIndex++;

        if (apiDoneRef.current) {
          animationActiveRef.current = false;
          const result = apiResponseRef.current;

          if (result?.__error) {
            setIsScanning(false);
            setError(result.message);
          } else {
            setCurrentTask('Security analysis complete!');
            setCompletedTasks(TASKS.map(t => t.id));
            setProgress(100);
            setTimeout(() => {
              navigate('/analysis/security-reports', {
                state: { ...prevData, analysisResult: result },
              });
            }, 1000);
          }
        } else {
          runNextTask();
        }
      }, task.duration);
    };

    runNextTask();
  };

  const handleRetry = () => {
    setError(null);
    setIsScanning(false);
  };

  return (
    <DashboardLayout>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Run Analysis</h1>
          <p className="text-sm sm:text-base text-gray-500">Step 2 of 3 - Analyzing codebase for vulnerabilities</p>
        </div>

        <MainProgressBar step={2} totalSteps={3} />

        <div className="mt-8 space-y-5">

          {/* ── Selected project card ── */}
          <section
            aria-label="Selected project"
            className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm"
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Selected Project</p>
            <div className="flex items-start gap-3 sm:gap-4">
              <div
                aria-hidden="true"
                className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary-50 flex items-center justify-center"
              >
                <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 break-all">
                    {projectName || <span className="text-gray-400 italic">No project selected</span>}
                  </h2>
                  {projectName && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-full px-2 py-0.5">
                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                      Selected
                    </span>
                  )}
                </div>

                {/* Project meta */}
                <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  {orgName && (
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                      <dt className="sr-only">Organization</dt>
                      <dd>{orgName}</dd>
                    </div>
                  )}
                  {industry && (
                    <div>
                      <dt className="sr-only">Industry</dt>
                      <dd className="capitalize">{industry}</dd>
                    </div>
                  )}
                  {legacyTech.length > 0 && (
                    <div>
                      <dt className="sr-only">Technology</dt>
                      <dd className="uppercase font-mono text-xs tracking-wide">{legacyTech.join(', ')}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </section>

          {/* ── Analysis configuration & scan UI ── */}
          <Card>
            <div className="p-4 sm:p-6">

              {/* Analysis type */}
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Analysis Type</h2>

              <div
                role="list"
                aria-label="Selected report types"
                className="space-y-2 mb-6"
              >
                {(prevData.reportTypes?.length ? prevData.reportTypes : ['generic']).map(type => (
                  <div
                    key={type}
                    role="listitem"
                    className="flex items-center gap-3 border border-gray-200 rounded-lg p-3.5 bg-gray-50"
                  >
                    <span aria-hidden="true" className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center">
                      <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {getLabelForType(type)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Comprehensive security assessment</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Error banner */}
              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="flex items-start gap-3 p-4 mb-5 bg-red-50 border border-red-200 rounded-lg"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-700">{error}</p>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="mt-2 text-sm font-semibold text-red-600 hover:text-red-800 underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* Run buttons */}
              {!isScanning && !error && (
                <div className="flex flex-col sm:flex-row gap-4 pt-2 pb-4">
                  <div className="flex-1 border border-primary-200 rounded-xl p-4 bg-primary-50 flex flex-col gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">AI-Enhanced Report</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Scanned by SonarQube, then enriched by an LLM for deeper insights,
                        executive summaries, and prioritised recommendations.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => startScan('/analyze/scan/with-llm')}
                      disabled={!projectName}
                      aria-label={`Run AI-enhanced security analysis for ${projectName}`}
                      className="w-full"
                    >
                      Run Analysis
                    </Button>
                  </div>
                  <div className="flex-1 border border-gray-200 rounded-xl p-4 bg-gray-50 flex flex-col gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">SonarQube Report</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Raw SonarQube scan results - issues, quality gate status,
                        and metrics without LLM post-processing.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => startScan('/analyze/scan/sonarqube')}
                      disabled={!projectName}
                      aria-label={`Generate SonarQube analysis for ${projectName}`}
                      className="w-full"
                    >
                      Generate with SonarQube
                    </Button>
                  </div>
                </div>
              )}

              {/* Progress UI */}
              {isScanning && !error && (
                <div
                  role="status"
                  aria-live="polite"
                  aria-label="Analysis in progress"
                  className="space-y-4 pt-2"
                >
                  {/* Progress header */}
                  <div className="flex items-center justify-between gap-4">
                    <p
                      className="text-sm font-medium text-gray-800 truncate"
                      aria-atomic="true"
                    >
                      {currentTask}
                    </p>
                    <span
                      className="text-sm font-bold text-primary-600 tabular-nums flex-shrink-0"
                      aria-label={`${Math.round(progress)} percent complete`}
                    >
                      {Math.round(progress)}%
                    </span>
                  </div>

                  <ProgressBar progress={progress} />

                  {/* Task list */}
                  <ol aria-label="Analysis steps" className="mt-1 space-y-2.5">
                    {TASKS.map(task => {
                      const isDone = completedTasks.includes(task.id);
                      const isActive = currentTask === task.label && !isDone;
                      return (
                        <li
                          key={task.id}
                          className="flex items-center gap-3 text-sm"
                          aria-current={isActive ? 'step' : undefined}
                        >
                          <span
                            aria-hidden="true"
                            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 ${
                              isDone
                                ? 'bg-green-100 text-green-700'
                                : isActive
                                ? 'bg-blue-100 text-blue-600 animate-pulse'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {isDone ? '✓' : task.id}
                          </span>
                          <span
                            className={`transition-colors duration-200 ${
                              isDone
                                ? 'text-gray-900 font-medium'
                                : isActive
                                ? 'text-blue-600 font-medium'
                                : 'text-gray-400'
                            }`}
                          >
                            {task.label}
                          </span>
                          <span className="sr-only">
                            {isDone ? '(completed)' : isActive ? '(in progress)' : '(pending)'}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

            </div>
          </Card>

        </div>
      </main>
    </DashboardLayout>
  );
};

// Updated by Shanjoy Kanti on 2026-07-03
// Added: New feature implementation
