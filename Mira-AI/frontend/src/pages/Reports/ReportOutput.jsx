import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { REPORT_TYPES } from '../../utils/languageConfig';

export const ReportOutput = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const wizardData = location.state?.wizardData || {};
  const reportTypes = wizardData.reportTypes || [];

  const steps = [
    { id: 'select-report-types', title: 'Report Types' },
    { id: 'run-analysis', title: 'Run Analysis' },
    { id: 'download-reports', title: 'Download Reports' }
  ];
  const currentStepIndex = 2;

  const getReportConfig = (id) => REPORT_TYPES.find((r) => r.id === id) || { id, label: id, icon: '📄', description: '' };

  const handleDownloadPDF = (reportId) => {
    const config = getReportConfig(reportId);
    toast.success(`PDF download started for ${config.label}`);
  };

  const handleDownloadDOCX = (reportId) => {
    const config = getReportConfig(reportId);
    toast.success(`DOCX download started for ${config.label}`);
  };

  const handleViewReport = (reportId) => {
    navigate(`/reports/view/${reportId}`, { state: { wizardData } });
  };

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Wizard Stepper */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center space-x-6">
              {steps.map((step, idx) => {
                const isActive = idx === currentStepIndex;
                const isCompleted = idx < currentStepIndex;
                return (
                  <li key={step.id} className="flex items-center">
                    <div className="flex items-center">
                      <div
                        aria-current={isActive ? 'step' : undefined}
                        className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-colors ${
                          isCompleted
                            ? 'bg-green-600 text-white'
                            : isActive
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {isCompleted ? '✓' : idx + 1}
                      </div>
                      <div className="ml-3">
                        <div className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                          {step.title}
                        </div>
                      </div>
                    </div>
                    {idx < steps.length - 1 && (
                      <div
                        className={`flex-1 h-px ${isCompleted ? 'bg-green-200' : 'bg-gray-200'} ml-4`}
                        style={{ minWidth: 24 }}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        <Card>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Analysis Complete!</h2>
            <p className="text-gray-600">
              Your security reports have been generated and are ready for download.
            </p>
          </div>

          <div className="space-y-4">
            {reportTypes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No report types selected. Please start a new analysis.
              </div>
            ) : (
              reportTypes.map((reportType) => {
                const config = getReportConfig(reportType);
                return (
                  <div
                    key={reportType}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="text-3xl">{config.icon}</div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {config.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">{config.description}</p>
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center">
                              <Badge variant="completed">Ready</Badge>
                            </div>
                            <div className="text-gray-500">
                              Generated: {formatDate()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center space-x-3 pt-4 border-t border-gray-100">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewReport(reportType)}
                      >
                        View Report
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownloadPDF(reportType)}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download PDF
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadDOCX(reportType)}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download DOCX
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {wizardData.projectName && (
                  <span>
                    All reports for <span className="font-medium text-gray-900">{wizardData.projectName}</span> are ready.
                  </span>
                )}
              </div>
              <Button variant="primary" onClick={() => navigate('/reports')}>
                Go to Reports Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ReportOutput;

// Dev: Mohiuzzaman Anik - 2026-03-30
