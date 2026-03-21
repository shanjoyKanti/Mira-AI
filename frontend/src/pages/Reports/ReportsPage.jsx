import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { apiService } from '../../utils/api';
import { REPORT_TYPES } from '../../utils/languageConfig';

const STATUS_BADGE = {
  completed: 'success',
  failed: 'danger',
  running: 'warning',
};

export const ReportsPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportTypeFilter, setReportTypeFilter] = useState('');

  useEffect(() => {
    apiService.getReports()
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.reports ?? []);
        setReports(data);
      })
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredReports = reports.filter((report) => {
    const name = report.project_name || report.projectName || '';
    const matchesSearch = searchQuery
      ? name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesType = reportTypeFilter
      ? (report.report_type || report.reportType) === reportTypeFilter
      : true;
    return matchesSearch && matchesType;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getLabelForType = (typeId) => {
    const rt = REPORT_TYPES.find((r) => r.id === typeId);
    return rt ? `${rt.icon} ${rt.label}` : (typeId || '-');
  };

  return (
    <DashboardLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">All Reports</h1>
          <Button variant="primary" onClick={() => navigate('/report/select')}>
            New Report
          </Button>
        </div>

        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Search by project name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select
              placeholder="All Report Types"
              value={reportTypeFilter}
              onChange={(e) => setReportTypeFilter(e.target.value)}
              options={REPORT_TYPES.map((rt) => ({ label: rt.label, value: rt.id }))}
            />
          </div>
        </Card>

        <Card>
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton lines={8} />
            </div>
          ) : filteredReports.length === 0 ? (
            <EmptyState
              title="No reports found"
              description="No reports match your current filters. Try adjusting your search or create a new report."
              action={
                <Button variant="primary" onClick={() => navigate('/report/select')}>
                  Create New Report
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Project</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Created</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => {
                    const id = report.report_id || report.id;
                    const projectName = report.project_name || report.projectName || '-';
                    const status = report.status || 'completed';
                    const typeId = report.report_type || report.reportType;
                    return (
                      <tr key={id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{projectName}</div>
                          {id && <div className="text-xs text-gray-400 font-mono">{id}</div>}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700">{getLabelForType(typeId)}</td>
                        <td className="py-3 px-4">
                          <Badge variant={STATUS_BADGE[status] || 'info'}>{status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">{formatDate(report.created_at || report.createdAt)}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/reports/view/${id}`, { state: { reportId: id, projectName, typeId } })}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

// Dev: Moshiur Rahman - 2026-03-21
