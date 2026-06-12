import { useState, Fragment } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { useGetAdminUsageQuery } from '../../store/slices/projectsApiSlice';
import {
  Coins, DollarSign, FileCode2, Briefcase, ChevronDown, ChevronRight,
  RefreshCw, AlertCircle, Cloud, Server, Users,
} from 'lucide-react';

const fmtTokens = (n) => {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};
const fmtCost = (n) => `$${(n ?? 0).toFixed(n >= 100 ? 0 : n >= 1 ? 2 : 4)}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '-');
const fmtDuration = (sec) => {
  if (!sec) return '-';
  if (sec < 90) return `${Math.round(sec)}s`;
  if (sec < 5400) return `${(sec / 60).toFixed(0)}m`;
  return `${(sec / 3600).toFixed(1)}h`;
};

const StatTile = ({ icon: Icon, value, label, sub, iconBg }) => (
  <div className="rounded-2xl p-6 border border-gray-200 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 shadow-sm ${iconBg}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <p className="text-3xl font-extrabold mb-1 text-gray-900">{value}</p>
    <p className="text-sm font-medium text-gray-600">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const ProviderBadge = ({ p }) =>
  p === 'onprem'
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-100 text-violet-700"><Server className="w-3 h-3" /> On-Prem</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-100 text-sky-700"><Cloud className="w-3 h-3" /> Cloud</span>;

export const AdminUsagePage = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useGetAdminUsageQuery();
  const [openUser, setOpenUser] = useState(null);

  const totals = data?.totals || {};
  const users = data?.users || [];
  const rates = data?.rates || {};

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Usage & <span className="bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent">Billing</span>
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Token consumption and estimated LLM cost per user and project. Ground truth for pricing the paid plan.
            </p>
          </div>
          <button onClick={() => refetch()}
            className="btn-secondary flex items-center gap-2 text-sm px-4 py-2 rounded-xl self-start">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="rounded-2xl border border-gray-200 p-6 animate-pulse bg-gray-100 h-36" />)}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium">Failed to load usage data</p>
              <p className="text-sm text-red-600">{error?.data?.detail || 'Are you signed in as an admin?'}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Global tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile icon={DollarSign} value={fmtCost(totals.estimated_cost_usd)} label="Estimated LLM cost"
                sub={`cloud @ $${rates?.groq?.input_per_mtok}/M in · $${rates?.groq?.output_per_mtok}/M out`}
                iconBg="bg-gradient-to-br from-green-500 to-emerald-600" />
              <StatTile icon={Coins} value={fmtTokens(totals.total_tokens)} label="Total tokens"
                sub={`${fmtTokens(totals.prompt_tokens)} in · ${fmtTokens(totals.completion_tokens)} out`}
                iconBg="bg-gradient-to-br from-primary-500 to-violet-600" />
              <StatTile icon={FileCode2} value={totals.files_processed ?? 0} label="Files modernized"
                sub={`${totals.jobs ?? 0} jobs run`}
                iconBg="bg-gradient-to-br from-orange-500 to-amber-600" />
              <StatTile icon={Users} value={totals.users_with_usage ?? 0} label="Active users"
                sub={`${totals.registered_users ?? 0} registered · ${totals.projects_with_usage ?? 0} projects with usage`}
                iconBg="bg-gradient-to-br from-violet-500 to-purple-600" />
            </div>

            {/* Per-user table */}
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage by user</h2>
              {users.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center text-sm text-gray-500">
                  No token usage recorded yet. Usage appears here after modernization jobs run.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">User</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Projects</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Jobs</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Files</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Tokens</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Est. cost</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Last activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <Fragment key={u.user_id}>
                          <tr
                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => setOpenUser(openUser === u.user_id ? null : u.user_id)}>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {openUser === u.user_id
                                  ? <ChevronDown className="w-4 h-4 text-gray-400" />
                                  : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                <div>
                                  <div className="font-medium text-gray-900">{u.email}</div>
                                  <div className="text-xs text-gray-400">{u.username}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right text-sm text-gray-600">{u.projects_count}</td>
                            <td className="py-3 px-4 text-right text-sm text-gray-600">{u.jobs}</td>
                            <td className="py-3 px-4 text-right text-sm text-gray-600">{u.files_processed}</td>
                            <td className="py-3 px-4 text-right text-sm font-mono text-gray-700">{fmtTokens(u.total_tokens)}</td>
                            <td className="py-3 px-4 text-right text-sm font-bold text-green-700">{fmtCost(u.estimated_cost_usd)}</td>
                            <td className="py-3 px-4 text-right text-xs text-gray-400">{fmtDate(u.last_activity)}</td>
                          </tr>

                          {openUser === u.user_id && u.projects.map((p) => (
                            <tr key={`${u.user_id}-${p.project_name}`} className="border-b border-gray-50 bg-gray-50/60">
                              <td className="py-2.5 px-4 pl-14">
                                <div className="flex items-center gap-2">
                                  <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-800">{p.project_name}</span>
                                  {(p.llm_providers || []).map((pr) => <ProviderBadge key={pr} p={pr} />)}
                                </div>
                                <div className="text-[11px] text-gray-400 mt-0.5 pl-6">
                                  {(p.job_types || []).join(' · ')} · runtime {fmtDuration(p.duration_sec)}
                                  {p.files_failed > 0 && <span className="text-red-500"> · {p.files_failed} files failed</span>}
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-right text-xs text-gray-400">-</td>
                              <td className="py-2.5 px-4 text-right text-sm text-gray-600">
                                {p.jobs}
                                {p.failed_jobs > 0 && <span className="text-red-500 text-xs"> ({p.failed_jobs} failed)</span>}
                              </td>
                              <td className="py-2.5 px-4 text-right text-sm text-gray-600">{p.files_processed}</td>
                              <td className="py-2.5 px-4 text-right text-sm font-mono text-gray-600">
                                {fmtTokens(p.total_tokens)}
                                <div className="text-[10px] text-gray-400">{fmtTokens(p.prompt_tokens)} in · {fmtTokens(p.completion_tokens)} out</div>
                              </td>
                              <td className="py-2.5 px-4 text-right text-sm font-semibold text-green-600">{fmtCost(p.estimated_cost_usd)}</td>
                              <td className="py-2.5 px-4 text-right text-xs text-gray-400">{fmtDate(p.last_job_at)}</td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Rate card note */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
              <span className="font-semibold">How cost is estimated:</span>{' '}
              cloud tokens are priced at ${rates?.groq?.input_per_mtok}/M input and ${rates?.groq?.output_per_mtok}/M output
              (configurable via <code className="font-mono text-xs">LLM_COST_GROQ_*</code> env vars). On-prem tokens are
              costed at ${rates?.onprem?.input_per_mtok ?? 0}/M - the on-prem box is a fixed cost; set{' '}
              <code className="font-mono text-xs">LLM_COST_ONPREM_*</code> to amortize it per token. Token usage is
              recorded on code-modernization jobs (Step 3), the dominant LLM spend.
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

// Dev: Mohiuzzaman Anik - 2026-06-12
