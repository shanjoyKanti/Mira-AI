import { useState, useEffect } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { ChevronDown, ChevronRight, Columns2, AlignJustify, Loader2, FilePlus2, FileX2 } from 'lucide-react';
import { apiService } from '../../utils/api';

// GitHub-PR-style colors for the diff panes.
const DIFF_STYLES = {
  variables: {
    light: {
      diffViewerBackground: '#ffffff',
      addedBackground: '#e6ffec',
      addedColor: '#1f2328',
      removedBackground: '#ffebe9',
      removedColor: '#1f2328',
      wordAddedBackground: '#abf2bc',
      wordRemovedBackground: '#ffc0c0',
      addedGutterBackground: '#ccffd8',
      removedGutterBackground: '#ffd7d5',
      gutterBackground: '#f6f8fa',
      gutterColor: '#57606a',
      codeFoldBackground: '#f1f8ff',
      codeFoldGutterBackground: '#dbedff',
      emptyLineBackground: '#fafbfc',
    },
  },
  contentText: { fontSize: '12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  lineNumber: { fontSize: '11px' },
};

// Count +/- lines from a unified diff for the GitHub-style "+12 −4" chip.
const countDiffLines = (diff) => {
  let added = 0, removed = 0;
  for (const line of (diff || '').split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) added++;
    else if (line.startsWith('-') && !line.startsWith('---')) removed++;
  }
  return { added, removed };
};

/**
 * Collapsible GitHub-PR-style before/after viewer for a single file of a
 * modernization job. Fetches original + upgraded content from the API when
 * expanded and renders a line-by-line comparison (split or unified view).
 */
export const FileDiffViewer = ({ jobId, filePath, status, changesCount, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [splitView, setSplitView] = useState(true);

  useEffect(() => {
    if (!expanded || !jobId || !filePath || diff) return;
    setLoading(true);
    setError(null);
    apiService.getModernizationFileDiff(jobId, filePath)
      .then(({ data }) => setDiff(data))
      .catch((err) => {
        const detail = err?.response?.data?.detail;
        setError(typeof detail === 'string' ? detail : 'Failed to load diff');
      })
      .finally(() => setLoading(false));
  }, [expanded, jobId, filePath, diff]);

  const { added, removed } = countDiffLines(diff?.diff);
  const hasChanges = diff && (added > 0 || removed > 0);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
      >
        {expanded
          ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        <span className={`flex-shrink-0 text-sm ${status === 'failed' ? 'text-red-500' : 'text-green-500'}`}>
          {status === 'failed' ? '✗' : '✓'}
        </span>
        <span className="font-mono text-xs sm:text-sm text-gray-700 truncate flex-1" title={filePath}>
          {filePath}
        </span>
        {diff ? (
          <span className="flex items-center gap-1.5 text-xs font-mono flex-shrink-0">
            <span className="text-green-600 font-semibold">+{added}</span>
            <span className="text-red-600 font-semibold">−{removed}</span>
          </span>
        ) : changesCount > 0 ? (
          <span className="text-xs text-gray-500 flex-shrink-0">({changesCount} changes)</span>
        ) : null}
      </button>

      {expanded && (
        <div className="border-t border-gray-200">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 p-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading before/after comparison from your server…
            </div>
          )}
          {error && <div className="text-sm text-red-600 p-4">{error}</div>}
          {diff && !loading && (
            <div>
              {/* Toolbar: view-mode toggle + new/unchanged notices */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {diff.original_missing && (
                    <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                      <FilePlus2 className="w-3 h-3" /> New file
                    </span>
                  )}
                  {diff.upgraded_missing && (
                    <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                      <FileX2 className="w-3 h-3" /> Not in upgraded output (unchanged)
                    </span>
                  )}
                  {!diff.original_missing && !diff.upgraded_missing && !hasChanges && (
                    <span>No line changes in this file</span>
                  )}
                </div>
                <div className="flex rounded-md border border-gray-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSplitView(true)}
                    title="Side-by-side view"
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${splitView ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                  >
                    <Columns2 className="w-3.5 h-3.5" /> Split
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitView(false)}
                    title="Unified view"
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors border-l border-gray-300 ${!splitView ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                  >
                    <AlignJustify className="w-3.5 h-3.5" /> Unified
                  </button>
                </div>
              </div>

              <div className="max-h-[32rem] overflow-auto text-xs">
                <ReactDiffViewer
                  oldValue={diff.original || ''}
                  newValue={diff.upgraded ?? diff.original ?? ''}
                  splitView={splitView}
                  compareMethod={DiffMethod.WORDS}
                  leftTitle="Before (original)"
                  rightTitle="After (modernized)"
                  styles={DIFF_STYLES}
                  useDarkTheme={false}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
