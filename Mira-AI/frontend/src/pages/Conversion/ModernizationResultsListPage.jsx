import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { apiService } from '../../utils/api';
import {
  CheckCircle2, FileCode2, ChevronRight, AlertCircle, Loader2, RefreshCw, Sparkles, FolderGit2, Zap,
} from 'lucide-react';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');

export const ModernizationResultsListPage = () => {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: null, items: [] });

  const load = async () => {
    setState(s => ({ ...s, loading: true }));
    try {
      const res = await apiService.listTransforms();
      const all = res.data || [];
      // Only projects whose Step-4 code modernization actually completed,
      // deduped to the LATEST completed run per project (a project can be
      // re-migrated many times; users want one card per project).
      const byProject = new Map();
      for (const t of all) {
        if (t.step_4_status !== 'completed' || !t.step_4_job_id) continue;
        const key = t.project_name;
        const prev = byProject.get(key);
        const ts = new Date(t.updated_at || t.created_at || 0).getTime();
        if (!prev || ts > prev._ts) byProject.set(key, { ...t, _ts: ts });
      }
      const done = [...byProject.values()].sort((a, b) => b._ts - a._ts);
      setState({ loading: false, error: null, items: done });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.map(d => d.msg || String(d)).join(', ')
        : (typeof detail === 'string' ? detail : (err.message || 'Could not load results.'));
      setState({ loading: false, error: msg, items: [] });
    }
  };

  useEffect(() => { load(); }, []);

  const { loading, error, items } = state;

  const open = (t) => navigate(`/transform/result/${encodeURIComponent(t.project_name)}`, {
    state: { projectName: t.project_name },
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Modernization <span className="bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent">Results</span>
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Every project you've successfully modernized. Open one to see its full report.
            </p>
          </div>
          <button onClick={load}
            className="btn-secondary flex items-center gap-2 text-sm px-4 py-2 rounded-xl self-start">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm">Loading your results…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium">Could not load results</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No completed migrations yet</h3>
              <p className="text-sm text-gray-500 max-w-md mb-6">
                Once a project finishes the 4-step modernization pipeline, its results will appear here for you to review any time.
              </p>
              <Button onClick={() => navigate('/transform/select')} className="flex items-center gap-2">
                <Zap className="w-4 h-4" /> Start a Migration
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((t) => (
              <button
                key={t.transform_id}
                onClick={() => open(t)}
                className="group text-left rounded-2xl border border-gray-200 bg-white p-5 hover:border-primary-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-sm">
                    <FolderGit2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 truncate mb-1">{t.project_name}</h3>
                <p className="text-xs text-gray-400 mb-4">Finished {fmtDate(t.updated_at || t.created_at)}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1.5 text-gray-500">
                    <FileCode2 className="w-4 h-4" /> View report
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

// Updated by Arafat Uddin on 2026-06-27
// Added: New feature implementation

// Dev: Arafat Uddin - 2026-05-15
