import { useState, useEffect } from 'react';
import { Cpu, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../../utils/api';

const PROVIDERS = [
  { id: 'onprem', name: 'Mira AI Hosted', keyless: true },
  { id: 'groq', name: 'Groq', keyless: false },
  { id: 'anthropic', name: 'Anthropic (Claude)', keyless: false },
  { id: 'openai', name: 'OpenAI (GPT)', keyless: false },
  { id: 'google', name: 'Google (Gemini)', keyless: false },
];

/**
 * Change the LLM provider + model for an existing project. The server validates
 * the provider/key/model with a real request BEFORE persisting anything, so a
 * bad key never breaks a project.
 */
export const LLMSwitchDialog = ({ open, project, onClose, onSwitched }) => {
  const projectId = project?.project_id || project?.id || project?._id;
  const [provider, setProvider] = useState(project?.llm_provider || 'groq');
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState(null);
  const [model, setModel] = useState(project?.llm_model || '');
  const [defaultModel, setDefaultModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currentProvider = PROVIDERS.find((p) => p.id === provider);
  const keyless = currentProvider?.keyless;

  // Reset when the dialog opens for a (possibly different) project
  useEffect(() => {
    if (!open) return;
    setProvider(project?.llm_provider || 'groq');
    setApiKey('');
    setModels(null);
    setModel(project?.llm_model || '');
    setDefaultModel('');
    setError('');
  }, [open, project]);

  const fetchModels = async () => {
    if (keyless) return;
    setLoadingModels(true);
    setError('');
    setModels(null);
    try {
      const { data } = await apiService.getLLMModels(provider, apiKey.trim() || null);
      if (data?.valid && Array.isArray(data.models) && data.models.length) {
        setModels(data.models);
        setDefaultModel(data.default_model || data.models[0]);
        setModel(data.default_model || data.models[0]);
        toast.success('Key valid — pick a model');
      } else {
        setError(data?.error || 'Could not validate the key / list models.');
      }
    } catch (err) {
      const d = err?.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Could not reach the model service.');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await apiService.switchProjectLLM(projectId, {
        llm_provider: provider,
        llm_api_key: apiKey.trim() || null,
        llm_model: model.trim() || null,
      });
      toast.success(data?.message || 'LLM switched');
      onSwitched?.(data);
      onClose?.();
    } catch (err) {
      const d = err?.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Switch failed — nothing was changed.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200 pop-in">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary-600" /> Change LLM
          </h3>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500">
            Project <span className="font-medium text-gray-700">{project?.project_name || project?.name}</span>.
            The new provider is tested before it's saved — a bad key changes nothing.
          </p>

          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Provider</label>
            <select
              value={provider}
              onChange={(e) => { setProvider(e.target.value); setModels(null); setModel(''); setApiKey(''); setError(''); }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* API key + model list (commercial providers only) */}
          {!keyless && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                API Key <span className="text-xs font-normal text-gray-400">(leave empty to use your saved key)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  autoComplete="off"
                  placeholder={`${currentProvider?.name} API key`}
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setModels(null); setModel(''); }}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={fetchModels}
                  disabled={loadingModels}
                  className="btn-outline btn-sm whitespace-nowrap"
                >
                  {loadingModels ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Load models'}
                </button>
              </div>
            </div>
          )}

          {models && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Model <span className="text-xs font-normal text-gray-400">{models.length} available</span>
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {models.map((m) => <option key={m} value={m}>{m}{m === defaultModel ? '  (default)' : ''}</option>)}
              </select>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-gray-100">
          <button onClick={onClose} className="btn-outline btn-sm">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || (!keyless && !models && !apiKey.trim() && !project?.llm_provider)}
            className="btn-primary btn-sm"
          >
            {saving ? (
              <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Validating…</span>
            ) : (
              <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Switch</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LLMSwitchDialog;
