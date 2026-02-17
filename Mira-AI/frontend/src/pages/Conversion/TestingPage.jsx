import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import MainProgressBar from '../../components/ui/MainProgressBar';
import api from '../../utils/api';

export const TestingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { jobResult, jobId } = location.state || {};

  const [testing, setTesting] = useState(!jobResult);
  const [testResults, setTestResults] = useState(null);
  const [testsFailed, setTestsFailed] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [retryingFailed, setRetryingFailed] = useState(false);

  const [fetchedResult, setFetchedResult] = useState(null);
  const activeResult = jobResult || fetchedResult;

  useEffect(() => {
    if (activeResult) {
      const passed = activeResult.validation_passed ?? 0;
      const failed = activeResult.validation_failed ?? 0;
      const runtimeOk = activeResult.runtime_check?.status === 'ok';
      setTestResults([
        { name: 'Validation', status: failed === 0 ? 'passed' : 'failed', count: passed + failed, passed, failed },
        { name: 'Runtime Check', status: runtimeOk ? 'passed' : 'failed', count: 1 },
      ]);
      setTestsFailed(failed > 0 || !runtimeOk);
      setTesting(false);
    } else if (jobId) {
      setTesting(true);
      api.get(`/agents/run-code-modernization/status/${jobId}`)
        .then(({ data }) => {
          if (data.status === 'completed' && data.result) {
            setFetchedResult(data.result);
          } else if (data.status === 'failed') {
            setTesting(false);
            setTestResults([{ name: 'Modernization', status: 'failed', count: 0 }]);
            setTestsFailed(true);
          }
        })
        .catch(() => {
          setTesting(false);
          setTestResults(null);
        });
    } else {
      navigate(`/analysis/${id}/converting`);
    }
  }, [activeResult, jobId, id, navigate]);

  const handleRetry = () => {
    navigate(`/analysis/${id}/converting`);
  };

  const handleProceed = () => {
    navigate(`/analysis/${id}/download`, { state: { jobId, jobResult: activeResult } });
  };

  const handleRevert = async () => {
    if (!jobId || !window.confirm('Restore source project from backup? This will overwrite the current source with the pre-modernization state.')) return;
    setReverting(true);
    try {
      await api.post(`/agents/run-code-modernization/rollback/${jobId}`);
      window.alert('Reverted to original. Source project restored from backup.');
    } catch (err) {
      window.alert(err?.response?.data?.detail || 'Revert failed.');
    } finally {
      setReverting(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!jobId) return;
    setRetryingFailed(true);
    try {
      const { data } = await api.post('/agents/run-code-modernization/retry-failed', { job_id: jobId });
      navigate(`/analysis/${id}/modernizing`, { state: { jobId: data.job_id, transformId: activeResult?.transform_id, projectName: activeResult?.project_name || id } });
    } catch (err) {
      window.alert(err?.response?.data?.detail || 'Retry failed.');
    } finally {
      setRetryingFailed(false);
    }
  };

  const getStatusBadge = (status) => {
    return status === 'passed' ? (
      <Badge variant="success">Passed</Badge>
    ) : (
      <Badge variant="danger">Failed</Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Testing & Validation
          </h1>
          <p className="text-gray-600">
            Step 4 of 5 - Automated testing of converted code
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          {/* <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step 5 of 6</span>
            <span className="text-sm text-gray-500">Testing & Validation</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-primary-600 h-2 rounded-full" style={{ width: '80%' }} />
          </div> */}
          <MainProgressBar step={4} totalSteps={5} title="Testing & Validation" />
        </div>

        {testing ? (
          <Card>
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary-600 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Loading validation results...
              </h2>
              <p className="text-gray-600">
                No validation data available. Proceed from Modernization page.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {!testsFailed ? (
              <Alert
                type="success"
                title="Validation Passed"
                message="Your converted code has passed syntax, diff, and runtime checks."
              />
            ) : (
              <Alert
                type="error"
                title="Validation Issues"
                message="Some files failed validation or runtime check. Review the details below."
              />
            )}

            {/* Validation Results */}
            <Card>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Validation Results
              </h2>
              <div className="space-y-4">
                {testResults?.map((test, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${
                      test.status === 'passed'
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {test.name}
                      </h3>
                      {getStatusBadge(test.status)}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      {test.count !== undefined && <span>Files: {test.count}</span>}
                      {test.passed !== undefined && <span className="text-green-600">Passed: {test.passed}</span>}
                      {test.failed !== undefined && test.failed > 0 && <span className="text-red-600">Failed: {test.failed}</span>}
                      {test.status === 'passed' && (
                        <span className="text-green-600 font-medium">
                          OK
                        </span>
                      )}
                      {test.status === 'failed' && (
                        <span className="text-red-600 font-medium">
                          Issues found
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Validation Summary */}
            {activeResult && (
              <Card>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Validation Summary
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{activeResult.total_files ?? 0}</div>
                    <div className="text-sm text-gray-600">Total Files</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{activeResult.validation_passed ?? 0}</div>
                    <div className="text-sm text-gray-600">Passed</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{activeResult.validation_failed ?? 0}</div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                </div>
                {activeResult.runtime_check && (
                  <div className="mt-4 p-4 rounded-lg border-2 border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Runtime Check</h3>
                    <p className={`text-sm font-medium ${activeResult.runtime_check.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                      {activeResult.runtime_check.status === 'ok' ? 'Bootstrap OK' : `Bootstrap failed: ${activeResult.runtime_check.error || activeResult.runtime_check.output || 'Unknown error'}`}
                    </p>
                    {activeResult.runtime_check.output && (
                      <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto max-h-24">{activeResult.runtime_check.output}</pre>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* Actions */}
            <div className="flex flex-wrap justify-between gap-3">
              {testsFailed ? (
                <>
                  <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                    Back to Dashboard
                  </Button>
                  <div className="flex gap-2">
                    {activeResult?.backup_path && (
                      <Button variant="secondary" onClick={handleRevert} disabled={reverting}>
                        {reverting ? 'Reverting...' : 'Revert to original'}
                      </Button>
                    )}
                    <Button variant="secondary" onClick={handleRetryFailed} disabled={retryingFailed}>
                      {retryingFailed ? 'Starting...' : 'Retry failed files'}
                    </Button>
                    <Button onClick={handleRetry}>
                      Retry Conversion
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      onClick={() => navigate(`/analysis/${id}/modernizing`, { state: { jobId, jobResult: activeResult } })}
                    >
                      Back
                    </Button>
                    {activeResult?.backup_path && (
                      <Button variant="secondary" onClick={handleRevert} disabled={reverting}>
                        {reverting ? 'Reverting...' : 'Revert to original'}
                      </Button>
                    )}
                  </div>
                  <Button onClick={handleProceed}>
                    Proceed to Download
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
