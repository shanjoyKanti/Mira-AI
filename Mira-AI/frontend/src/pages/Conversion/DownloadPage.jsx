import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import MainProgressBar from '../../components/ui/MainProgressBar';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export const DownloadPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { jobId, jobResult } = location.state || {};
  const [downloading, setDownloading] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    if (!jobId && !jobResult) {
      navigate(`/analysis/${id}/converting`);
    }
  }, [jobId, jobResult, id, navigate]);

  const totalFiles = jobResult?.total_files ?? 0;
  const upgradedFiles = jobResult?.upgraded ?? 0;
  const validationPassed = jobResult?.validation_passed ?? 0;
  const validationFailed = jobResult?.validation_failed ?? 0;
  const projectName = jobResult?.project_name || id;

  const handleDownloadCode = async () => {
    if (!jobId) {
      toast.error('No job available. Run modernization first.');
      return;
    }
    setDownloading(true);
    try {
      const { data } = await api.get(`/agents/run-code-modernization/status/${jobId}`);
      if (data.status === 'completed' && data.result) {
        const blob = new Blob([JSON.stringify(data.result, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName}_modernization_result.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Modernization result downloaded');
      } else {
        toast.error('Job not completed or no result available');
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!jobResult) {
      toast.error('No result data available for report');
      return;
    }
    const lines = [
      `# Modernization Report: ${projectName}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      `## Summary`,
      `- Total files: ${totalFiles}`,
      `- Upgraded: ${upgradedFiles}`,
      `- Validation passed: ${validationPassed}`,
      `- Validation failed: ${validationFailed}`,
      '',
      `## Changelog`,
      jobResult.changelog || 'No changelog available.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}_modernization_report.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  const handlePushToRepo = () => {
    if (!repoUrl) {
      toast.error('Please enter a repository URL to push to');
      return;
    }
    setPushing(true);
    toast('Git push is not yet available. Your code lives on your server via SSH.', { duration: 5000 });
    setPushing(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Conversion Complete
          </h1>
          <p className="text-gray-600">
            Step 5 of 5 - Download your modernized application
          </p>
        </div>

        {/* Progress Indicator */}
         
        <MainProgressBar step={5} totalSteps={5} title="Download" />

        <div className="space-y-6 mt-12">
          {/* Success Message */}
          <Alert
            type="success"
            title="Conversion Successful"
            message="Your legacy application has been successfully modernized and is ready for download."
          />

          {/* Success Banner */}
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Your Project is Ready
              </h2>
              <p className="text-lg text-gray-600">
                Download your modernized codebase and migration documentation
              </p>
            </div>
          </Card>

          {/* Download Options */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <div className="text-center">
                <div className="text-4xl mb-4">📦</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Converted Code
                </h3>
                <p className="text-gray-600 mb-6">
                  Complete modernization result with all upgraded files and changelog
                </p>
                <Button 
                  fullWidth 
                  onClick={handleDownloadCode}
                  disabled={downloading}
                >
                  {downloading ? 'Preparing...' : 'Download Result (JSON)'}
                </Button>
              </div>
            </Card>

            <Card>
              <div className="text-center">
                <div className="text-4xl mb-4">📄</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Migration Report
                </h3>
                <p className="text-gray-600 mb-6">
                  Detailed documentation of changes, deployment guide, and known limitations
                </p>
                <Button 
                  fullWidth 
                  variant="outline"
                  onClick={handleDownloadReport}
                >
                  Download Report (PDF)
                </Button>
              </div>
            </Card>
            {/* Push to Repository */}
            <Card>
              <div className="text-center">
                <div className="text-4xl mb-4">🔁</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Push to Repository</h3>
                <p className="text-gray-600 mb-4">Push the converted code directly to your Git repository</p>
                <div className="space-y-3">
                  <Input
                    label="Repository URL"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo.git"
                  />
                  <Button
                    fullWidth
                    variant="outline"
                    onClick={handlePushToRepo}
                    disabled={pushing}
                  >
                    {pushing ? 'Pushing...' : 'Push to Repo'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Project Summary */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Project Summary
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Project:</span>
                <span className="font-medium text-gray-900">{projectName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Total Files:</span>
                <span className="font-medium text-gray-900">{totalFiles}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Upgraded Files:</span>
                <span className="font-medium text-gray-900">{upgradedFiles}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Validation:</span>
                <span className={`font-medium ${validationFailed === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {validationPassed} passed{validationFailed > 0 ? `, ${validationFailed} failed` : ''}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium text-green-600">Modernization Complete</span>
              </div>
            </div>
          </Card>

          {/* Known Limitations */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Known Limitations & Next Steps
            </h2>
            <div className="space-y-3 text-gray-600">
              <div className="flex items-start space-x-2">
                <span className="text-yellow-600 mt-1">⚠</span>
                <p>Review all environment variables in the .env file before deployment</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-yellow-600 mt-1">⚠</span>
                <p>Manual testing of authentication flows is recommended</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 mt-1">ℹ</span>
                <p>Database migrations are included but should be reviewed before applying</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 mt-1">ℹ</span>
                <p>Documentation includes deployment guide for major cloud providers</p>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button 
              variant="outline"
              onClick={() => navigate(`/analysis/${id}/testing`, { state: { jobId, jobResult } })}
            >
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
              <Button onClick={() => navigate('/analyze/select')}>
                Start New Analysis
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// Dev: Shanjoy Kanti - 2026-05-31
