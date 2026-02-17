import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import api from '../../utils/api';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { WizardProvider, useWizard } from '../../components/wizard';
import { Stepper } from '../../components/wizard/Stepper';
import { WizardLayout } from '../../components/wizard/WizardLayout';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Toggle } from '../../components/ui/Toggle';
import { Checkbox } from '../../components/ui/Checkbox';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ReportCard } from '../../components/ui/ReportCard';
import { REPORT_TYPES } from '../../utils/languageConfig';

const TASKS = [
  { id: 1, label: 'Scanning codebase structure', duration: 1500 },
  { id: 2, label: 'Detecting vulnerabilities', duration: 2000 },
  { id: 3, label: 'Mapping security frameworks', duration: 1800 },
  { id: 4, label: 'Analyzing dependencies', duration: 1600 },
  { id: 5, label: 'Generating report', duration: 1200 },
];


// Step 1: Select Report Types
const SelectReportTypesStep = () => {
  const { data, setStepData } = useWizard();

  const toggleReportType = (id) => {
    const current = data.reportTypes || [];
    const updated = current.includes(id)
      ? current.filter((t) => t !== id)
      : [...current, id];
    setStepData({ reportTypes: updated });
  };

  const selected = data.reportTypes || [];

  return (
    <Card>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Report Types</h2>
      <p className="text-sm text-gray-600 mb-6">
        Choose one or more report types to generate for this analysis.
      </p>

      <div className="space-y-4 mb-8">
        {REPORT_TYPES.map((rt) => (
          <div
            key={rt.id}
            onClick={() => toggleReportType(rt.id)}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selected.includes(rt.id)
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start">
              <Checkbox
                checked={selected.includes(rt.id)}
                onChange={() => toggleReportType(rt.id)}
                className="mt-1"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{rt.icon}</span>
                  <h3 className="text-base font-semibold text-gray-900">{rt.label}</h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">{rt.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Conditional PCI Fields */}
      {selected.includes('pci_dss') && (
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">PCI DSS Configuration</h3>
          <div className="space-y-4">
            <Select
              label="Merchant Level"
              value={data.pciMerchantLevel || ''}
              onChange={(e) => setStepData({ pciMerchantLevel: e.target.value })}
              options={[
                { label: 'Level 1 (6M+ transactions/year)', value: 'level1' },
                { label: 'Level 2 (1M-6M transactions/year)', value: 'level2' },
                { label: 'Level 3 (20K-1M transactions/year)', value: 'level3' },
                { label: 'Level 4 (<20K transactions/year)', value: 'level4' }
              ]}
            />
            <Toggle
              label="Stores cardholder data"
              checked={data.pciStoresCardData || false}
              onChange={(checked) => setStepData({ pciStoresCardData: checked })}
            />
            <Toggle
              label="Third-party payment processor used"
              checked={data.pciUsesProcessor || false}
              onChange={(checked) => setStepData({ pciUsesProcessor: checked })}
            />
          </div>
        </div>
      )}

      {/* Conditional ISO Fields */}
      {selected.includes('iso_27001') && (
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">ISO 27001 Configuration</h3>
          <div className="space-y-4">
            <Select
              label="Certification Status"
              value={data.isoCertificationStatus || ''}
              onChange={(e) => setStepData({ isoCertificationStatus: e.target.value })}
              options={[
                { label: 'Not certified', value: 'not-certified' },
                { label: 'In progress', value: 'in-progress' },
                { label: 'Certified', value: 'certified' }
              ]}
            />
            <Toggle
              label="Information Security Management System (ISMS) in place"
              checked={data.isoHasISMS || false}
              onChange={(checked) => setStepData({ isoHasISMS: checked })}
            />
          </div>
        </div>
      )}
    </Card>
  );
};

// Step 5: Run Analysis
const RunAnalysisStep = () => {
  const { data } = useWizard();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [completedTasks, setCompletedTasks] = useState([]);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);

  const apiDoneRef = useRef(false);
  const apiResponseRef = useRef(null);
  const animationActiveRef = useRef(false);

  const projectName = data.projectName || '';
  const apiReportTypes = data.reportTypes?.length ? data.reportTypes : ['generic_security'];

  const startAnalysis = (endpoint = '/analyze/scan/with-llm') => {
    setIsAnalyzing(true);
    setProgress(0);
    setCompletedTasks([]);
    setError(null);
    setAnalysisResult(null);
    apiDoneRef.current = false;
    apiResponseRef.current = null;
    animationActiveRef.current = true;

    api
      .post(endpoint, { project_name: projectName, report_types: apiReportTypes })
      .then(res => { apiResponseRef.current = res.data; apiDoneRef.current = true; })
      .catch(err => {
        apiResponseRef.current = { __error: true, message: err.response?.data?.detail || 'Analysis failed. Please try again.' };
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
            setIsAnalyzing(false);
            setError(result.message);
          } else {
            setCurrentTask('Analysis complete!');
            setCompletedTasks(TASKS.map(t => t.id));
            setProgress(100);
            setTimeout(() => setAnalysisResult(result), 800);
          }
        } else {
          runNextTask();
        }
      }, task.duration);
    };
    runNextTask();
  };

  // ── Results view ──
  if (analysisResult) {
    const reportEntries = Object.entries(analysisResult?.report?.security_reports ?? {});
    return (
      <Card>
        <div className="flex items-center gap-3 mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold text-green-800">Analysis complete</p>
            <p className="text-sm text-green-700">
              {reportEntries.length} report{reportEntries.length !== 1 ? 's' : ''} generated for &ldquo;{projectName}&rdquo;.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {reportEntries.map(([key, report]) => (
            <ReportCard key={key} reportKey={key} report={report} projectName={projectName} reportId={report.report_id ?? report.id} />
          ))}
        </div>
      </Card>
    );
  }

  // ── Summary + progress view ──
  const reportTypes = data.reportTypes || [];
  return (
    <Card>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Review & Run Analysis</h2>

      <div className="space-y-4 mb-8">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Project</h3>
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-2"><dt className="text-gray-500 w-36">Name:</dt><dd className="font-medium text-gray-900">{projectName || '-'}</dd></div>
            {data.organizationName && <div className="flex gap-2"><dt className="text-gray-500 w-36">Organization:</dt><dd className="text-gray-900">{data.organizationName}</dd></div>}
            {data.industry && <div className="flex gap-2"><dt className="text-gray-500 w-36">Industry:</dt><dd className="text-gray-900 capitalize">{data.industry}</dd></div>}
          </dl>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Report Types</h3>
          {reportTypes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {reportTypes.map((id) => {
                const rt = REPORT_TYPES.find((r) => r.id === id);
                return rt ? (
                  <Badge key={id} variant="primary">{rt.icon} {rt.label}</Badge>
                ) : null;
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No report types selected</p>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div role="alert" className="flex items-start gap-3 p-4 mb-5 bg-red-50 border border-red-200 rounded-lg text-sm">
          <p className="text-red-700 flex-1">{error}</p>
          <button
            type="button"
            onClick={() => { setError(null); setIsAnalyzing(false); }}
            className="font-semibold text-red-600 underline hover:text-red-800"
          >Retry</button>
        </div>
      )}

      {/* Run buttons */}
      {!isAnalyzing && !error && (
        <div className="flex flex-col sm:flex-row gap-4 py-6">
          {/* LLM-enhanced */}
          <div className="flex-1 border border-primary-200 rounded-xl p-4 bg-primary-50 flex flex-col gap-3">
            <div>
              <p className="font-semibold text-gray-900 text-sm">AI-Enhanced Report</p>
              <p className="text-xs text-gray-500 mt-1">
                Scanned by SonarQube, then enriched by an LLM for deeper insights, executive summaries, and prioritised recommendations.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => startAnalysis('/analyze/scan/with-llm')}
              disabled={!projectName}
              className="w-full"
            >
              Generate Enhanced Report
            </Button>
          </div>

          {/* SonarQube only */}
          <div className="flex-1 border border-gray-200 rounded-xl p-4 bg-gray-50 flex flex-col gap-3">
            <div>
              <p className="font-semibold text-gray-900 text-sm">SonarQube Report</p>
              <p className="text-xs text-gray-500 mt-1">
                Raw SonarQube scan results: issues, quality gate status, and metrics without LLM post-processing.
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={() => startAnalysis('/analyze/scan/sonarqube')}
              disabled={!projectName}
              className="w-full"
            >
              Generate with SonarQube
            </Button>
          </div>
        </div>
      )}

      {/* Progress */}
      {isAnalyzing && (
        <div role="status" aria-live="polite" className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-800 truncate">{currentTask}</span>
            <span className="text-sm font-bold text-primary-600 tabular-nums">{Math.round(progress)}%</span>
          </div>
          <ProgressBar progress={progress} />
          <ol className="mt-2 space-y-2">
            {TASKS.map(task => {
              const isDone = completedTasks.includes(task.id);
              const isActive = currentTask === task.label && !isDone;
              return (
                <li key={task.id} className="flex items-center gap-3 text-sm">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isDone ? 'bg-green-100 text-green-700' : isActive ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-gray-100 text-gray-400'
                  }`}>{isDone ? '✓' : task.id}</span>
                  <span className={isDone ? 'text-gray-900 font-medium' : isActive ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                    {task.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </Card>
  );
};

// Main wizard page
export const NewReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get project data from SelectProjectPage
  const projectFromState = location.state?.project;
  const skipProjectSetup = location.state?.skipProjectSetup || false;

  // Define steps - skip ProjectSetupStep if coming from SelectProjectPage
  const allSteps = [
  
    {
      id: 'select-report-types',
      title: 'Report Types',
      component: SelectReportTypesStep,
      validate: async (data) => {
        if (!data.reportTypes || data.reportTypes.length === 0) {
          return 'Please select at least one report type';
        }
        return true;
      }
    },
    {
      id: 'run-analysis',
      title: 'Run Analysis',
      component: RunAnalysisStep
    }
  ];

  const steps = allSteps;

  // Initial data includes project info if coming from SelectProjectPage
  const initialData = projectFromState ? {
    projectName: projectFromState.project_name || projectFromState.projectName || '',
    organizationName: projectFromState.organization_name || projectFromState.organizationName || '',
    industry: projectFromState.industry || '',
    projectId: projectFromState.id,
  } : {};

  const handleFinish = (data) => {
    navigate('/report/select');
    
  };

  // Redirect to select project page if no project selected
  if (!projectFromState) {
    navigate('/report/select');
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Report</h1>
          <p className="text-gray-600">
            Project: <span className="font-semibold">{projectFromState?.projectName}</span> - Select report options and run analysis.
          </p>
        </div>

        <WizardProvider 
          steps={steps} 
          initialData={initialData} 
          onFinish={handleFinish}
        >
          <WizardContent steps={steps} />
        </WizardProvider>
      </div>
    </DashboardLayout>
  );
};

// Wizard content component
const WizardContent = ({ steps }) => {
  const { currentIndex } = useWizard();
  const CurrentStepComponent = steps[currentIndex].component;

  return (
    <div>
      <div className="mb-8">
        <Stepper />
      </div>
      
      <WizardLayout>
        <CurrentStepComponent />
      </WizardLayout>
    </div>
  );
};

export default NewReportPage;

// Dev: Mohiuzzaman Anik - 2026-02-17
