import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { apiService } from '../../utils/api';
import {
  SUPPORTED_LANGUAGES,
  getVersionsForLanguage,
  getFrameworksForLanguage,
} from '../../utils/languageConfig';
import { RefreshCw, Code2 } from 'lucide-react';

const LANGUAGE_DISPLAY_NAMES = {
  php: 'PHP', javascript: 'JavaScript', typescript: 'TypeScript',
  python: 'Python', java: 'Java', go: 'Go', ruby: 'Ruby',
  rust: 'Rust', c_sharp: 'C#', csharp: 'C#', kotlin: 'Kotlin',
  scala: 'Scala', cpp: 'C++', c: 'C', tsx: 'TSX',
};

export const StackSelectionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { project_name } = location.state || {};

  const [selectedLang, setSelectedLang] = useState('php');
  const [selectedFramework, setSelectedFramework] = useState('');
  const [targetVersion, setTargetVersion] = useState('');

  // Pre-flight modal state. Populated when the user clicks "Start Migration".
  // The modal shows the project's actual language/file breakdown and estimates
  // runtime + cost BEFORE any pipeline step runs.
  const [estimateData,    setEstimateData]    = useState(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [selectedLangs,   setSelectedLangs]   = useState([]);   // modal checkboxes
  const [targetVersions,  setTargetVersions]  = useState({});   // per-language version picks
  const [versionOptions,  setVersionOptions]  = useState({ ladders: {}, defaults: {} });
  // Per-stack toggles: which streams of the codebase the user wants to migrate.
  // Auto-checked when present in the project; user can uncheck to skip a stack.
  const [selectedStacks,  setSelectedStacks]  = useState({ frontend: false, backend: true, api: false });

  useEffect(() => {
    apiService.getMigrationVersionOptions()
      .then(res => setVersionOptions(res.data || { ladders: {}, defaults: {} }))
      .catch(err => console.warn('Could not fetch migration version options:', err?.message));
  }, []);

  const langList = Object.entries(SUPPORTED_LANGUAGES);
  const versions = getVersionsForLanguage(selectedLang);
  const frameworks = getFrameworksForLanguage(selectedLang);

  const handleLangSelect = (lang) => {
    setSelectedLang(lang);
    setSelectedFramework('');
    setTargetVersion('');
  };

  // "Start Migration" button → open the pre-flight "Ready to start code migration?"
  // modal. User sees the scope + estimate, then confirms to launch the pipeline.
  const handleStart = async () => {
    if (!project_name) {
      toast.error('No project selected');
      navigate('/transform/select');
      return;
    }
    setEstimateLoading(true);
    setEstimateData(null); // open modal in loading state
    try {
      const res = await apiService.estimateMigration({ project_name });
      const data = res.data || {};
      const availableLangs = (data.languages_detected || []).map(l => l.language);
      setEstimateData(data);
      setSelectedLangs(availableLangs);
      // Auto-tick stacks that the backend detected as "present". User can uncheck
      // to skip a stream (e.g. backend-only migration).
      const stacks = data.stacks || {};
      setSelectedStacks({
        frontend: Boolean(stacks.frontend?.present),
        backend:  Boolean(stacks.backend?.present),
        api:      Boolean(stacks.api?.present),
      });
      const defaults = versionOptions.defaults || {};
      const seeded = {};
      for (const lang of availableLangs) {
        // If the user picked a target version on this page AND it matches a
        // detected language, prefer their pick; otherwise fall back to the ladder default.
        if (targetVersion && lang === selectedLang) {
          seeded[lang] = targetVersion;
        } else if (defaults[lang]) {
          seeded[lang] = defaults[lang];
        }
      }
      setTargetVersions(seeded);
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Pre-flight failed';
      toast.error(`Pre-flight failed: ${msg}`);
      setEstimateData(null);
    } finally {
      setEstimateLoading(false);
    }
  };

  // User confirmed the modal - navigate to the workflow page with the chosen
  // languages/versions so Step 1 starts immediately (no re-prompt).
  const confirmPreflight = () => {
    const anyStack = selectedStacks.frontend || selectedStacks.backend || selectedStacks.api;
    if (!anyStack) {
      toast.error('Pick at least one stack (Frontend / Backend / API) to migrate');
      return;
    }
    if (!selectedLangs.length) {
      toast.error('Please tick at least one language to migrate');
      return;
    }
    const estimateSnapshot = estimateData;
    setEstimateData(null);
    navigate('/transform/workflow', {
      state: {
        project_name,
        // Legacy fields kept for backwards compat with single-language PHP paths
        to_version: targetVersion || undefined,
        detected_language: selectedLang,
        detected_framework: selectedFramework || undefined,
        // New pre-flight handoff: pre-selected language list + per-language versions +
        // the full estimate snapshot + per-stack toggles. Workflow page uses these
        // to skip its own modal and pass stack choices to the migration emails.
        preflightLangs: selectedLangs,
        preflightVersions: targetVersions,
        preflightEstimate: estimateSnapshot,
        preflightStacks: selectedStacks,
      },
    });
  };

  const cancelPreflight = () => {
    setEstimateData(null);
    setSelectedLangs([]);
    setTargetVersions({});
  };

  const toggleModalLang = (lang) => {
    setSelectedLangs(ls =>
      ls.includes(lang) ? ls.filter(l => l !== lang) : [...ls, lang]
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Select Target Stack</h1>
          <p className="text-gray-500 mt-1">
            Project: <strong>{project_name}</strong>. Choose target language, framework, and version.
          </p>
          <p className="text-sm text-blue-600 mt-1">
            If left blank, the system auto-detects the language and migrates to the latest stable version.
          </p>
        </div>

        {/* Language Grid */}
        <Card>
          <h2 className="font-semibold text-gray-800 mb-4">Language</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {langList.map(([key, lang]) => (
              <button
                key={key}
                onClick={() => handleLangSelect(key)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors text-center ${
                  selectedLang === key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-2xl">{lang.icon}</span>
                <span className="text-sm font-medium text-gray-800">{lang.name}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Framework (optional) */}
        {frameworks.length > 0 && (
          <Card>
            <h2 className="font-semibold text-gray-800 mb-1">Framework <span className="text-gray-400 font-normal text-sm">(optional)</span></h2>
            <p className="text-xs text-gray-500 mb-4">Leave unselected to let the system auto-detect the framework.</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedFramework('')}
                className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                  selectedFramework === ''
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                Auto-detect
              </button>
              {frameworks.map(fw => (
                <button
                  key={fw}
                  onClick={() => setSelectedFramework(fw)}
                  className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                    selectedFramework === fw
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {fw}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Target version */}
        <Card>
          <h2 className="font-semibold text-gray-800 mb-1">Target Version <span className="text-gray-400 font-normal text-sm">(optional)</span></h2>
          <p className="text-xs text-gray-500 mb-4">Leave unselected to migrate to the latest stable version.</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTargetVersion('')}
              className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                targetVersion === ''
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              Latest stable
            </button>
            {versions.map(v => (
              <button
                key={v}
                onClick={() => setTargetVersion(v)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-mono transition-colors ${
                  targetVersion === v
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </Card>

        {/* Selection summary + Start */}
        <Card className="bg-gray-50 border-gray-200">
          <h2 className="font-semibold text-gray-800 mb-3">Migration Configuration</h2>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Language</p>
              <p className="text-lg font-bold text-gray-900 capitalize">
                {SUPPORTED_LANGUAGES[selectedLang]?.name || selectedLang}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Framework</p>
              <p className="text-lg font-bold text-gray-900">{selectedFramework || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Target Version</p>
              <p className="text-lg font-bold text-gray-900 font-mono">{targetVersion || 'Latest'}</p>
            </div>
          </div>
          <Button onClick={handleStart} className="w-full" disabled={estimateLoading}>
            {estimateLoading ? 'Scanning project…' : 'Start Migration'}
          </Button>
        </Card>
      </div>

      {/* ── Pre-flight "Ready to start code migration?" modal ──────────────
          Pops open when the user clicks "Start Migration" above. Shows the
          project scope + estimated runtime/cost. Confirming navigates to the
          workflow page which starts Step 1 immediately with no second prompt. */}
      {(estimateData || estimateLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preflight-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 id="preflight-title" className="text-xl font-bold text-gray-900">
                {estimateLoading ? 'Scanning project…' : 'Ready to start code migration?'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {estimateLoading
                  ? 'Enumerating files, estimating runtime and cost.'
                  : 'Review the scope below, choose which languages and target versions to migrate, then confirm to start the 4-step pipeline.'}
              </p>
            </div>

            {estimateLoading ? (
              <div className="p-10 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mr-3" />
                <span className="text-sm text-gray-600">Running pre-flight check…</span>
              </div>
            ) : (
              estimateData && (
                <div className="p-6 space-y-5">
                  {!estimateData.within_limits && (
                    <Alert type="warning">
                      <div className="space-y-1">
                        <p className="font-semibold">Project exceeds one or more limits</p>
                        <ul className="list-disc pl-5 text-sm">
                          {(estimateData.warnings || []).map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                        <p className="text-xs text-gray-600">You can still proceed, but expect longer runtime.</p>
                      </div>
                    </Alert>
                  )}

                  {/* Stack toggles - Frontend / Backend / API. Auto-checked when
                      the backend detected files in that stack; user can uncheck to
                      skip a stream (e.g. backend-only migration on a full-stack repo). */}
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
                      Stacks to migrate
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { key: 'frontend', label: 'Frontend', desc: 'UI components, pages, styles' },
                        { key: 'backend',  label: 'Backend',  desc: 'Controllers, services, models' },
                        { key: 'api',      label: 'API',      desc: 'Routes, OpenAPI, .proto' },
                      ].map(({ key, label, desc }) => {
                        const info = (estimateData.stacks || {})[key] || {};
                        const present = Boolean(info.present);
                        const langs = (info.languages || []).map(l => LANGUAGE_DISPLAY_NAMES[l] || l).join(', ');
                        return (
                          <label
                            key={key}
                            className={`flex flex-col gap-1.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedStacks[key]
                                ? 'border-blue-500 bg-blue-50'
                                : present
                                  ? 'border-gray-200 hover:bg-gray-50'
                                  : 'border-gray-100 bg-gray-50 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-blue-600"
                                checked={selectedStacks[key]}
                                onChange={(e) => setSelectedStacks(prev => ({ ...prev, [key]: e.target.checked }))}
                              />
                              <span className="text-sm font-semibold text-gray-800">{label}</span>
                              {!present && (
                                <span className="text-[10px] text-gray-400 ml-auto">not detected</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{desc}</p>
                            <p className="text-xs text-gray-700">
                              {info.files ?? 0} file{(info.files ?? 0) !== 1 ? 's' : ''}
                              {key === 'api' && info.spec_files != null && info.spec_files > 0 && (
                                <span className="text-gray-500"> · {info.spec_files} spec</span>
                              )}
                              {langs && <span className="text-gray-500"> · {langs}</span>}
                            </p>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
                      Detected languages ({(estimateData.languages_detected || []).length})
                    </p>
                    {(estimateData.languages_detected || []).length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No supported source files detected.</p>
                    ) : (
                      <div className="space-y-2">
                        {(estimateData.languages_detected || []).map((l) => {
                          const lang = l.language;
                          const ladder = (versionOptions.ladders || {})[lang] || [];
                          const kb = Math.round((l.bytes || 0) / 1024);
                          return (
                            <label
                              key={lang}
                              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 accent-blue-600"
                                  checked={selectedLangs.includes(lang)}
                                  onChange={() => toggleModalLang(lang)}
                                />
                                <Code2 className="w-4 h-4 text-gray-500" />
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">
                                    {LANGUAGE_DISPLAY_NAMES[lang] || lang}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {l.files} file{l.files !== 1 ? 's' : ''} · {kb} KB
                                  </p>
                                </div>
                              </div>
                              {ladder.length > 0 && (
                                <select
                                  className="text-sm border border-gray-300 rounded px-2 py-1"
                                  value={targetVersions[lang] || (versionOptions.defaults || {})[lang] || ''}
                                  onChange={(e) =>
                                    setTargetVersions((prev) => ({ ...prev, [lang]: e.target.value }))
                                  }
                                >
                                  {ladder.map((v) => (
                                    <option key={v} value={v}>→ {v}</option>
                                  ))}
                                </select>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-3">
                      <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
                        Estimated runtime
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {estimateData.estimate?.wall_clock_human ?? '-'}
                      </p>
                      <p className="text-xs text-gray-500">
                        ~{estimateData.estimate?.avg_seconds_per_file ?? '?'}s per file
                      </p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">
                        Estimated cost
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        ${estimateData.estimate?.estimated_cost_usd?.toFixed?.(2) ?? estimateData.estimate?.estimated_cost_usd ?? '-'}
                      </p>
                      <p className="text-xs text-gray-500">LLM tokens (in+out)</p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 bg-gray-50 rounded p-3 space-y-0.5">
                    <p><span className="font-semibold">Total files:</span> {estimateData.total_files ?? 0}</p>
                    {estimateData.limits?.MIRA_MAX_LLM_FILE_BYTES && (
                      <p>
                        <span className="font-semibold">File size cap:</span>{' '}
                        {Math.round(estimateData.limits.MIRA_MAX_LLM_FILE_BYTES / 1024)} KB per file
                      </p>
                    )}
                  </div>
                </div>
              )
            )}

            {!estimateLoading && estimateData && (
              <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
                <Button variant="ghost" onClick={cancelPreflight}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={confirmPreflight}
                  disabled={
                    selectedLangs.length === 0 ||
                    !(selectedStacks.frontend || selectedStacks.backend || selectedStacks.api)
                  }
                >
                  Run migration ({[
                    selectedStacks.frontend && 'FE',
                    selectedStacks.backend && 'BE',
                    selectedStacks.api && 'API',
                  ].filter(Boolean).join(' + ') || 'no stacks'})
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
