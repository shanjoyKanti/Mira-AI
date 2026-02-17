import { useEffect, useState } from 'react';
import api from '../../utils/api';

/**
 * Shows the post-migration validation report for a modernization job:
 *   - Tree-sitter parse results (per file, parallel, local)
 *   - Native linter results (php -l, node --check, python -m py_compile, ...)
 *   - Overall pass/fail badge + summary line
 *
 * The report is fetched from GET /agents/jobs/{jobId}/validation and is
 * produced automatically after code modernization completes. If the report
 * is missing (job still running, or validation layer was skipped), renders
 * a "pending" message instead of an error.
 */
export const ValidationPanel = ({ jobId }) => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [showFiles, setShowFiles] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    const fetchReport = async () => {
      try {
        const { data } = await api.get(`/agents/jobs/${jobId}/validation`);
        if (cancelled) return;
        setReport(data?.validation_report || null);
        setError('');
      } catch (e) {
        if (cancelled) return;
        setError(e?.response?.data?.detail || e.message || 'Failed to load validation report');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchReport();
    return () => { cancelled = true; };
  }, [jobId]);

  if (loading) {
    return (
      <div className="text-xs text-gray-500 italic">Loading validation report…</div>
    );
  }
  if (error) {
    return (
      <div className="text-xs text-red-600">Validation report unavailable: {error}</div>
    );
  }
  if (!report) {
    return (
      <div className="text-xs text-gray-500 italic">
        Validation report will be generated once the modernization job finishes.
      </div>
    );
  }

  const {
    overall_ok,
    overall_summary,
    total_files,
    tree_sitter_passed,
    tree_sitter_failed,
    tree_sitter_not_applicable,
    native_passed,
    native_failed,
    native_skipped,
    native_timed_out,
    sonarqube_fixed_count,
    sonarqube_new_count,
    sonarqube_delta,
    duration_seconds,
    files = [],
    files_truncated,
    files_total_count,
  } = report;

  const badgeClass = overall_ok
    ? 'bg-green-100 text-green-800 border-green-200'
    : 'bg-red-100 text-red-800 border-red-200';

  const failedFiles = files.filter((f) =>
    f.tree_sitter_outcome === 'fail' ||
    f.native_outcome === 'fail' ||
    f.native_outcome === 'timed_out'
  );

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Post-migration validation</h3>
        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${badgeClass}`}>
          {overall_ok ? 'PASS' : 'ISSUES'}
        </span>
      </div>

      {overall_summary && (
        <p className="text-xs text-gray-600 mb-3">{overall_summary}</p>
      )}

      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
        <div className="border border-gray-200 rounded p-2">
          <div className="font-semibold text-gray-700 mb-1">Tree-sitter parse</div>
          <div className="text-gray-600">
            <span className="text-green-700 font-medium">{tree_sitter_passed ?? 0}</span> pass
            {' · '}
            <span className="text-red-700 font-medium">{tree_sitter_failed ?? 0}</span> fail
            {tree_sitter_not_applicable ? (
              <span className="text-gray-500"> · {tree_sitter_not_applicable} N/A</span>
            ) : null}
          </div>
        </div>
        <div className="border border-gray-200 rounded p-2">
          <div className="font-semibold text-gray-700 mb-1">Native linter</div>
          <div className="text-gray-600">
            <span className="text-green-700 font-medium">{native_passed ?? 0}</span> pass
            {' · '}
            <span className="text-red-700 font-medium">{native_failed ?? 0}</span> fail
            {native_timed_out ? (
              <span className="text-amber-700"> · {native_timed_out} timeout</span>
            ) : null}
            {native_skipped ? (
              <span className="text-gray-500"> · {native_skipped} skipped</span>
            ) : null}
          </div>
        </div>
      </div>

      {(sonarqube_fixed_count != null || sonarqube_new_count != null || sonarqube_delta != null) && (
        <div className="border border-gray-200 rounded p-2 text-xs mb-3">
          <div className="font-semibold text-gray-700 mb-1">SonarQube delta</div>
          <div className="text-gray-600">
            {sonarqube_fixed_count != null && (
              <span className="text-green-700 font-medium">{sonarqube_fixed_count} fixed</span>
            )}
            {sonarqube_new_count != null && (
              <span className="ml-2 text-red-700 font-medium">{sonarqube_new_count} new</span>
            )}
            {sonarqube_delta != null && (
              <span className="ml-2 text-gray-700">Δ {sonarqube_delta}</span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {total_files ?? 0} file(s) checked
          {duration_seconds ? ` in ${duration_seconds}s` : ''}
        </span>
        {files.length > 0 && (
          <button
            type="button"
            onClick={() => setShowFiles((s) => !s)}
            className="text-primary-600 hover:text-primary-700 underline"
          >
            {showFiles ? 'Hide' : 'Show'} per-file results ({files.length})
          </button>
        )}
      </div>

      {showFiles && files.length > 0 && (
        <div className="mt-3 max-h-64 overflow-y-auto border border-gray-200 rounded">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-gray-600">
                <th className="px-2 py-1 font-medium">File</th>
                <th className="px-2 py-1 font-medium w-24">Parse</th>
                <th className="px-2 py-1 font-medium w-24">Linter</th>
              </tr>
            </thead>
            <tbody>
              {(failedFiles.length > 0 ? failedFiles : files).slice(0, 500).map((f, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-2 py-1 font-mono text-gray-700 break-all">{f.rel_path}</td>
                  <td className="px-2 py-1">
                    <OutcomeBadge outcome={f.tree_sitter_outcome} />
                  </td>
                  <td className="px-2 py-1">
                    <OutcomeBadge outcome={f.native_outcome} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {files_truncated && (
            <div className="px-2 py-2 text-gray-500 bg-gray-50 text-xs">
              Showing first 2000 of {files_total_count} total files.
            </div>
          )}
          {failedFiles.length > 0 && failedFiles.length < files.length && (
            <div className="px-2 py-2 text-gray-500 bg-gray-50 text-xs">
              Showing only the {failedFiles.length} failing file(s).
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const OutcomeBadge = ({ outcome }) => {
  const classes = {
    pass: 'bg-green-100 text-green-800',
    fail: 'bg-red-100 text-red-800',
    skipped: 'bg-gray-100 text-gray-600',
    timed_out: 'bg-amber-100 text-amber-800',
    not_applicable: 'bg-gray-50 text-gray-500',
  };
  const label = {
    pass: 'PASS',
    fail: 'FAIL',
    skipped: 'skip',
    timed_out: 'timeout',
    not_applicable: 'n/a',
  };
  const cls = classes[outcome] || 'bg-gray-100 text-gray-600';
  const text = label[outcome] || outcome || '-';
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>{text}</span>;
};

// Updated by Shanjoy Kanti on 2026-04-30
// Added: New feature implementation
