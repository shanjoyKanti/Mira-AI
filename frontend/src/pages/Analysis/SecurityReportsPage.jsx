import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import MainProgressBar from '../../components/ui/MainProgressBar';
import { ReportCard } from '../../components/ui/ReportCard';

export const SecurityReportsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { analysisResult, ...prevData } = location.state || {};

  // security_reports is a map of { [reportKey]: { report_label, content, report_type, report_id, ... } }
  const securityReports = analysisResult?.report?.security_reports ?? {};
  const reportEntries = Object.entries(securityReports);

  const projectName =
    analysisResult?.report?.workflow_metadata?.project_name ||
    prevData.project_name ||
    prevData.projectName ||
    '';

  const projectKey = prevData.project_key || prevData.id || prevData.project_name;

  const handleContinue = () => {
      navigate(`/analysis/${projectKey}/stack-selection`, { state: { ...prevData, analysisResult } });
    
  };

  return (
    <DashboardLayout>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Reports Ready</h1>
          <p className="text-sm sm:text-base text-gray-500">Step 3 of 3 - View or download your security reports</p>
        </div>

        <MainProgressBar step={3} totalSteps={3} />

        <div className="mt-8 space-y-5">

          {/* Success banner */}
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold text-green-800">Analysis complete</p>
              <p className="text-sm text-green-700">
                {reportEntries.length} report{reportEntries.length !== 1 ? 's' : ''} generated
                {projectName ? ` for "${projectName}"` : ''}.
              </p>
            </div>
          </div>

          {/* Report cards */}
          {reportEntries.length > 0 ? (
            <div
              role="list"
              aria-label="Generated security reports"
              className="space-y-3"
            >
              {reportEntries.map(([key, report], idx) => (
                <div key={key} role="listitem">
                  <ReportCard
                    reportKey={key}
                    report={report}
                    projectName={projectName}
                    reportId={report.report_id ?? report.id}
                    defaultExpanded={idx === 0}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-10">No reports available.</p>
          )}

          {/* Continue CTA */}
          <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">Ready to proceed with code conversion?</p>
            <Button variant="primary" size="lg" onClick={handleContinue}>
              Continue to Conversion
            </Button>
          </div>

        </div>
      </main>
    </DashboardLayout>
  );
};
