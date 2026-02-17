import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { FileDiffViewer } from './ui/FileDiffViewer';
import { apiService } from '../utils/api';
import {
  CheckCircle, ChevronRight, Code2, FileCode, Server, Shield, RefreshCw, Home, Layers, GitBranch,
  AlertTriangle, ListChecks, GitCompareArrows, Loader2,
} from 'lucide-react';

/**
 * Per-file upgrade breakdown. Shared by the live migration page and the
 * "view completed results" page so both render identically.
 */
export const FileProgressList = ({ fileStatuses }) => {
  if (!fileStatuses || fileStatuses.length === 0) return null;
  const done   = fileStatuses.filter(f => f.status === 'completed').length;
  const failed = fileStatuses.filter(f => f.status === 'failed').length;
  const total  = fileStatuses.length;
  const pct    = Math.round((done / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{done} / {total} files upgraded</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1 mt-2">
        {fileStatuses.slice(0, 50).map((f, i) => (
          <div key={i} className="flex items-center gap-2 text-xs py-0.5">
            <span className={`flex-shrink-0 ${
              f.status === 'completed' ? 'text-green-500' :
              f.status === 'failed'    ? 'text-red-500' :
              f.status === 'running'   ? 'text-blue-500' :
                                         'text-gray-400'
            }`}>
              {f.status === 'completed' ? '✓' :
               f.status === 'failed'    ? '✕' :
               f.status === 'running'   ? '⟳' : '○'}
            </span>
            <span className="truncate text-gray-600 font-mono">{f.file || f.filename || f.path || `file_${i + 1}`}</span>
            {f.status === 'failed' && f.error && (
              <span className="text-red-400 truncate flex-shrink-0 max-w-24" title={f.error}>- {f.error}</span>
            )}
          </div>
        ))}
        {fileStatuses.length > 50 && (
          <p className="text-xs text-gray-400 pt-1">…and {fileStatuses.length - 50} more files</p>
        )}
      </div>
      {failed > 0 && (
        <p className="text-xs text-red-600 mt-1">{failed} file{failed > 1 ? 's' : ''} had errors</p>
      )}
    </div>
  );
};

/**
 * Before/after comparison section: lists every file the modernization job
 * processed and lets the user expand each one into a GitHub-PR-style
 * line-by-line diff (fetched live from their server).
 */
const BeforeAfterSection = ({ jobId }) => {
  const [files, setFiles] = useState(null);
  const [error, setError] = useState(null);
  const MAX_LISTED = 200;

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    apiService.getModernizationFileDiff(jobId)
      .then(({ data }) => { if (!cancelled) setFiles(Array.isArray(data.files) ? data.files : []); })
      .catch((err) => {
        const detail = err?.response?.data?.detail;
        if (!cancelled) setError(typeof detail === 'string' ? detail : 'Could not load the file list for comparison.');
      });
    return () => { cancelled = true; };
  }, [jobId]);

  if (!jobId) return null;

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <p className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
        <GitCompareArrows className="w-4 h-4 text-gray-500" /> Before / after comparison
        {files && <span className="text-xs font-normal text-gray-400">({files.length} file{files.length !== 1 ? 's' : ''})</span>}
      </p>
      <p className="text-xs text-gray-500 mb-3">
        Expand a file to review the exact line-by-line changes, just like a pull-request diff.
        Content is read live from your server.
      </p>
      {error ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{error}</p>
      ) : files === null ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading file list…
        </div>
      ) : files.length === 0 ? (
        <p className="text-sm text-gray-500">No per-file records were kept for this job.</p>
      ) : (
        <div className="space-y-2 max-h-[40rem] overflow-y-auto pr-1">
          {files.slice(0, MAX_LISTED).map((f, i) => (
            <FileDiffViewer
              key={f.path}
              jobId={jobId}
              filePath={f.path}
              status={f.status}
              defaultExpanded={i === 0 && files.length === 1}
            />
          ))}
          {files.length > MAX_LISTED && (
            <p className="text-xs text-gray-400 pt-1">…and {files.length - MAX_LISTED} more files</p>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Completed-migration results panel. Tolerant of both live-run and
 * persisted (re-fetched) result shapes via the field fallbacks below.
 * `jobId` (the step-4 code-modernization job) enables the before/after
 * diff section; omit it and the panel renders without diffs.
 */
export const CompletionPanel = ({ result, projectName, jobId, onSecurityScan, onNewTransform, onDashboard }) => {
  const r            = result || {};
  const outputPath   = r.output_path || r.upgraded_path || '';
  const totalFiles   = r.total_files   ?? r.files_total ?? null;
  const upgraded     = r.files_upgraded ?? r.files_modernized ?? null;
  const withErrors   = r.files_with_errors ?? r.files_failed ?? null;
  const toVersion    = r.to_version;
  const fromVersion  = r.from_version;
  const language     = r.language;
  const framework    = r.framework;
  const fwFrom       = r.framework_from_version ?? r.from_framework_version ?? r.from_laravel;
  const fwTo         = r.framework_to_version   ?? r.to_framework_version   ?? r.to_laravel;
  const hasFramework = framework && (fwFrom || fwTo);
  const hostname     = r.server_hostname || r.hostname;
  const fileStatuses = r.file_statuses || r.files || [];
  const stages       = Array.isArray(r.stages) ? r.stages : [];
  const versionCorrections = Array.isArray(r.version_corrections) ? r.version_corrections : [];
  const fileChanges  = Array.isArray(r.file_changes) ? r.file_changes : [];
  const migratedBase = r.migrated_versions_base || '';
  const langLabel    = language ? language.toUpperCase() : 'Language';
  const fwLabel      = framework ? framework.charAt(0).toUpperCase() + framework.slice(1) : 'Framework';

  const successRate = totalFiles && totalFiles > 0 && upgraded != null
    ? Math.round((upgraded / totalFiles) * 100) : null;

  return (
    <div className="space-y-6">
      {/* Gradient hero banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-600 via-primary-600 to-violet-700 p-6 text-white shadow-lg">
        <div aria-hidden="true" className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden="true" className="absolute -bottom-10 -left-6 w-40 h-40 rounded-full bg-violet-400/20 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xl font-bold">Migration Complete</p>
            <p className="text-sm text-white/80 mt-0.5">
              {projectName} has been successfully modernized{toVersion ? ` to v${toVersion}` : ''}.
            </p>

            {/* Version migration rows: language always, framework when present */}
            <div className="mt-3 space-y-2">
              {(fromVersion || toVersion) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 w-24">
                    <Code2 className="w-4 h-4" /> {langLabel}
                  </span>
                  {fromVersion && <span className="bg-white/15 px-2 py-0.5 rounded font-mono text-sm font-bold">{fromVersion}</span>}
                  {fromVersion && toVersion && <ChevronRight className="w-4 h-4 text-white/60" />}
                  {toVersion && <span className="bg-white/25 px-2 py-0.5 rounded font-mono text-sm font-bold">{toVersion}</span>}
                </div>
              )}
              {hasFramework && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 w-24">
                    <Layers className="w-4 h-4" /> {fwLabel}
                  </span>
                  {fwFrom && <span className="bg-white/15 px-2 py-0.5 rounded font-mono text-sm font-bold">{fwFrom}</span>}
                  {fwFrom && fwTo && <ChevronRight className="w-4 h-4 text-white/60" />}
                  {fwTo
                    ? <span className="bg-white/25 px-2 py-0.5 rounded font-mono text-sm font-bold">{fwTo}</span>
                    : <span className="bg-white/15 px-2 py-0.5 rounded text-xs italic text-white/70">latest compatible</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Version validation notice — e.g. detected PHP "7.5" (never released) → snapped to 7.4 */}
      {versionCorrections.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Version validation
          </p>
          <ul className="mt-2 space-y-1 text-xs text-amber-700 list-disc list-inside">
            {versionCorrections.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {/* Stat tiles — solid tint icon tiles, semibold values (no gradients) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {totalFiles != null && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center mb-3">
              <FileCode className="w-4 h-4" />
            </div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-gray-900">{totalFiles}</p>
            <p className="text-xs text-gray-500 mt-0.5">Files Processed</p>
          </div>
        )}
        {upgraded != null && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mb-3">
              <CheckCircle className="w-4 h-4" />
            </div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-gray-900">{upgraded}</p>
            <p className="text-xs text-gray-500 mt-0.5">Upgraded</p>
          </div>
        )}
        {withErrors != null && withErrors > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <FileCode className="w-4 h-4" />
            </div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-gray-900">{withErrors}</p>
            <p className="text-xs text-gray-500 mt-0.5">Had Errors</p>
          </div>
        )}
        {successRate != null && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Code2 className="w-4 h-4" />
            </div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-gray-900">{successRate}%</p>
            <p className="text-xs text-gray-500 mt-0.5">Success Rate</p>
          </div>
        )}
      </div>

      {outputPath && (
        <div className="p-4 bg-slate-900 rounded-xl">
          <p className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5" /> Upgraded code on your server
          </p>
          <p className="font-mono text-green-400 text-sm break-all">{outputPath}</p>
          {hostname && <p className="text-xs text-slate-500 mt-1.5">Host: {hostname}</p>}
        </div>
      )}

      {migratedBase && (
        <div className="p-4 bg-slate-900 rounded-xl">
          <p className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Per-version stage folders on your server
          </p>
          <p className="font-mono text-sky-300 text-sm break-all">{migratedBase}</p>
          <p className="text-xs text-slate-500 mt-1.5">
            Each version hop is saved in its own <span className="font-mono">stage_XX_*</span> subfolder here, so you can inspect the code at every version.
          </p>
        </div>
      )}

      {stages.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-gray-500" /> Version upgrade ladder
            <span className="text-xs font-normal text-gray-400">({stages.length} stages)</span>
          </p>
          <div className="space-y-2">
            {stages.map((s, i) => {
              const err = (s.errors || 0) > 0;
              return (
                <div key={i}>
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                      err ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {s.index ?? i + 1}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-sm">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-bold">{s.from_version}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      <span className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded font-bold">{s.to_version}</span>
                    </div>
                    <div className="flex-1 text-right text-xs text-gray-500">
                      {s.upgraded != null && <span className="text-green-600 font-medium">{s.upgraded} upgraded</span>}
                      {s.unchanged != null && s.unchanged > 0 && <span className="text-gray-400"> · {s.unchanged} unchanged</span>}
                      {err && <span className="text-red-500 font-medium"> · {s.errors} error{s.errors > 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  {s.remote_snapshot_path && (
                    <p className="ml-9 mt-1 font-mono text-[11px] text-gray-400 break-all" title="Folder for this version on your server">
                      {s.remote_snapshot_path}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {fileChanges.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-gray-500" /> What changed
            <span className="text-xs font-normal text-gray-400">({fileChanges.length} file{fileChanges.length > 1 ? 's' : ''})</span>
          </p>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {fileChanges.slice(0, 100).map((f, i) => (
              <div key={i} className="border-l-2 border-primary-200 pl-3">
                <p className="font-mono text-xs text-gray-700 break-all">{f.path}</p>
                {Array.isArray(f.changes) && f.changes.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-xs text-gray-500 list-disc list-inside">
                    {f.changes.map((c, j) => <li key={j}>{c}</li>)}
                  </ul>
                )}
              </div>
            ))}
            {fileChanges.length > 100 && (
              <p className="text-xs text-gray-400 pt-1">…and {fileChanges.length - 100} more files</p>
            )}
          </div>
        </div>
      )}

      {fileStatuses.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-gray-500" /> File-by-file results
          </p>
          <FileProgressList fileStatuses={fileStatuses} />
        </div>
      )}

      {/* GitHub-PR-style line-by-line before/after diffs */}
      <BeforeAfterSection jobId={jobId} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        {onSecurityScan && (
          <Button onClick={onSecurityScan} variant="outline" className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" /> Security Scan
          </Button>
        )}
        {onNewTransform && (
          <Button onClick={onNewTransform} variant="outline" className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> New Migration
          </Button>
        )}
        {onDashboard && (
          <Button onClick={onDashboard} className="flex items-center justify-center gap-2">
            <Home className="w-4 h-4" /> Dashboard
          </Button>
        )}
      </div>
    </div>
  );
};
