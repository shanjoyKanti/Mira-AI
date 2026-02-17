import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { apiService } from '../../utils/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const ReportView = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const stateReportId = location.state?.reportId;
  const projectName = location.state?.projectName || 'Project';
  const resolvedId = stateReportId || reportId;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [htmlContent, setHtmlContent] = useState(null);
  const [viewMode, setViewMode] = useState('iframe');

  useEffect(() => {
    if (!resolvedId) {
      setError('No report ID provided.');
      return;
    }
    loadReport();
  }, [resolvedId]);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/analyze/reports/${resolvedId}/view`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `HTTP ${res.status}`);
      }
      const html = await res.text();
      setHtmlContent(html);
    } catch (err) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format) => {
    if (!resolvedId) return;
    const loadingToast = toast.loading(`Preparing ${format.toUpperCase()} download...`);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE}/analyze/reports/${resolvedId}/download?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Download failed (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('content-disposition') || '';
      const match = cd.match(/filename=([^;]+)/);
      a.download = match ? match[1].replace(/"/g, '') : `report.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.dismiss(loadingToast);
      toast.success(`${format.toUpperCase()} downloaded!`);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.message || 'Download failed');
    }
  };

  const formatDate = () =>
    new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Compact header: back + title inline, one segmented download control */}
        <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-200/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-gray-900 truncate">Security Report</h1>
              <p className="text-[13px] text-gray-500">Generated {formatDate()} · {projectName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 hidden sm:block">Download</span>
            <div className="flex rounded-lg border border-gray-300 bg-white overflow-hidden shadow-sm">
              {['html', 'pdf', 'docx'].map((f, i) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleDownload(f)}
                  className={`px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-700 transition-colors focus:outline-none focus-visible:bg-primary-50 ${i > 0 ? 'border-l border-gray-200' : ''}`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <Card>
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mr-3" />
              <span className="text-gray-600">Loading report...</span>
            </div>
          </Card>
        )}

        {error && !loading && (
          <Card>
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Report Unavailable</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={loadReport}>Retry</Button>
            </div>
          </Card>
        )}

        {htmlContent && !loading && (
          <Card className="p-0 overflow-hidden">
            <iframe
              srcDoc={htmlContent}
              title="Security Report"
              className="w-full border-0"
              style={{ minHeight: '80vh' }}
              sandbox="allow-same-origin"
            />
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReportView;
