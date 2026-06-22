import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CompletionPanel } from '../../components/ModernizationResult';
import { apiService } from '../../utils/api';
import { AlertCircle, ArrowLeft, Loader2, Clock } from 'lucide-react';

/**
 * View the persisted results of a completed code-modernization job.
 * Reachable AFTER the live run finishes (e.g. from the transform list),
 * so results are always available - not only while watching the run live.
 *
 * job_id comes from the route param (/transform/result/:jobId) or router state.
 */
export const ModernizationResultPage = () => {
  const { projectName: paramProject } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const projectName = paramProject ? decodeURIComponent(paramProject) : (location.state?.projectName || '');

  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    if (!projectName) {
      setState({ loading: false, error: 'No project specified.', data: null });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiService.getProjectModernizationResult(projectName);
        if (!cancelled) setState({ loading: false, error: null, data: res.data });
      } catch (err) {
        const detail = err?.response?.data?.detail;
        const msg = Array.isArray(detail) ? detail.map(d => d.msg || String(d)).join(', ')
          : (typeof detail === 'string' ? detail : (err.message || 'Could not load results.'));
        if (!cancelled) setState({ loading: false, error: msg, data: null });
      }
    })();
    return () => { cancelled = true; };
  }, [projectName]);

  const { loading, error, data } = state;
  const displayName = data?.result?.project_name || projectName || 'Project';

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Modernization Results</h1>
            <p className="text-gray-500 mt-1 text-sm">{displayName}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/transform/select')}
            className="flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </div>

        <Card>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Loading results…</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Could not load results</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          ) : data?.status === 'completed' ? (
            <CompletionPanel
              result={data.result || {}}
              projectName={displayName}
              jobId={data.job_id}
              onSecurityScan={() => navigate('/analysis/security-scan', { state: { project_name: displayName } })}
              onNewTransform={() => navigate('/transform/select')}
              onDashboard={() => navigate('/dashboard')}
            />
          ) : data?.status === 'running' ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="w-10 h-10 text-blue-500 mb-3" />
              <p className="font-semibold text-gray-800">Migration still in progress</p>
              <p className="text-sm text-gray-500 mt-1 max-w-md">
                This project's modernization is still running. Results will appear here once it completes.
              </p>
              <Button className="mt-5" onClick={() => navigate('/transform/select')}>Back to Projects</Button>
            </div>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6">
              <p className="text-red-800 font-medium">Migration did not complete successfully</p>
              <p className="text-sm text-red-600 mt-1">{data?.error || 'The job failed. You can start a new migration.'}</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

// Updated by Mohiuzzaman Anik on 2026-05-12
// Added: New feature implementation

// Dev: Mohiuzzaman Anik - 2026-06-22
