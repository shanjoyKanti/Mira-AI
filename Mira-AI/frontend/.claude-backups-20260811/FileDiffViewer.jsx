import { useState, useEffect } from 'react';
import api from '../../utils/api';

/**
 * Collapsible diff viewer for a single file.
 * Fetches original/upgraded from API when expanded.
 */
export const FileDiffViewer = ({ jobId, filePath, status, changesCount, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!expanded || !jobId || !filePath) return;
    setLoading(true);
    setError(null);
    api
      .get(`/agents/run-code-modernization/status/${jobId}/files`, { params: { path: filePath } })
      .then(({ data }) => {
        setDiff(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || 'Failed to load diff');
        setLoading(false);
      });
  }, [expanded, jobId, filePath]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-400">{expanded ? '▼' : '▶'}</span>
        <span className={status === 'completed' ? 'text-green-500' : 'text-red-500'}>
          {status === 'completed' ? '✓' : '✗'}
        </span>
        <span className="font-mono text-sm text-gray-700 truncate flex-1" title={filePath}>
          {filePath}
        </span>
        {changesCount > 0 && (
          <span className="text-xs text-gray-500">({changesCount} changes)</span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-primary-600 rounded-full" />
              Loading diff...
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
          {diff && !loading && (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 mb-2 font-mono">{filePath}</div>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-96 overflow-y-auto whitespace-pre">
                {diff.diff ? (
                  diff.diff.split('\n').map((line, i) => {
                    const style = line.startsWith('+') && !line.startsWith('+++')
                      ? 'text-green-400'
                      : line.startsWith('-') && !line.startsWith('---')
                        ? 'text-red-400'
                        : 'text-gray-400';
                    return (
                      <div key={i} className={style}>
                        {line || ' '}
                      </div>
                    );
                  })
                ) : (
                  <span className="text-gray-500">No changes</span>
                )}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Dev: Moshiur Rahman - 2026-06-02

// Dev: Mohiuzzaman Anik - 2026-07-06
