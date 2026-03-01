import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useTestSSHConnectionMutation, useGetSSHCredentialsQuery } from '../../store/slices/projectsApiSlice';
import { apiService } from '../../utils/api';
import { Server, Key, Upload, Sparkles, AlertCircle, CheckCircle, Cloud, GitBranch, File, HardDriveDownload, Info } from 'lucide-react';

const STORAGE_KEY = 'mira-new-project-form';

export const NewProjectPage = () => {
    const navigate = useNavigate();

    // Load persisted data from localStorage
    const loadPersistedData = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Error loading persisted data:', error);
            return null;
        }
    };

    // Clean up any old persisted data that may contain bad sshTestResult objects
    const raw = loadPersistedData();
    const persistedData = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;

    // Form state with persisted values
    const [sshHost, setSshHost] = useState(persistedData?.sshHost || '');
    const [sshUsername, setSshUsername] = useState(persistedData?.sshUsername || '');
    const [sshPort, setSshPort] = useState(persistedData?.sshPort || '22');
    const [privateKeyPassword, setPrivateKeyPassword] = useState(persistedData?.privateKeyPassword || '');
    const [pemFile, setPemFile] = useState(null);
    const [pemFileName, setPemFileName] = useState(persistedData?.pemFileName || '');
    // Two LLM choices: 'commercial-api' (cloud API backend) or 'onprem-hosted' (MiraAI on-prem model).
    // Older saved forms may hold legacy ids ('miraai-hosted-llm', 'commercial-llm') - normalize them.
    const normalizeSelectedLLM = (saved, savedProvider) => {
        if (saved === 'commercial-api' || saved === 'onprem-hosted') return saved;
        if (saved === 'miraai-hosted-llm' && savedProvider === 'onprem') return 'onprem-hosted';
        return 'commercial-api';
    };
    const [selectedLLM, setSelectedLLM] = useState(
        normalizeSelectedLLM(persistedData?.selectedLLM, persistedData?.llmProvider)
    );
    // Which commercial provider to use when "Commercial LLM API" is selected.
    const [commercialProvider, setCommercialProvider] = useState(
        ['groq', 'anthropic', 'openai', 'google'].includes(persistedData?.commercialProvider)
            ? persistedData.commercialProvider
            : 'groq'
    );
    // The user's API key for the chosen provider. Deliberately NOT persisted to
    // localStorage — secrets only travel to the backend, which stores them encrypted.
    const [llmApiKey, setLlmApiKey] = useState('');
    // Which providers already have a key saved on the account: { groq: {has_key, hint}, ... }
    const [savedKeys, setSavedKeys] = useState(null);
    // Key validation state: idle | testing | ok | fail
    const [keyTest, setKeyTest] = useState({ status: 'idle', message: '' });
    // Conversion environment selector removed from UI - conversion always runs
    // on the user's own server. Kept as a constant for the backend payload.
    const selectedVM = 'on-premises';
    const [codeLocation, setCodeLocation] = useState(persistedData?.codeLocation || 'already-on-server');
    const [gitRepoUrl, setGitRepoUrl] = useState(persistedData?.gitRepoUrl || '');
    const [gitAccessToken, setGitAccessToken] = useState(persistedData?.gitAccessToken || '');
    const [additionalFiles, setAdditionalFiles] = useState([]);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sourcePath, setSourcePath] = useState(persistedData?.sourcePath || '');
    const [sshTestResult, setSshTestResult] = useState(null);
    const [showServerInfo, setShowServerInfo] = useState(false);

    // RTK Query mutation for testing SSH
    const [testSSH, { isLoading: isTestingSSH }] = useTestSSHConnectionMutation();

    // Remove any stale sshTestResult / showServerInfo from persisted storage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if ('sshTestResult' in parsed || 'showServerInfo' in parsed) {
                    delete parsed.sshTestResult;
                    delete parsed.showServerInfo;
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
                }
            }
        } catch (_) {}
    }, []);

    // Fetch saved SSH credentials to pre-populate form (dynamic per user)
    const { data: savedCredentials } = useGetSSHCredentialsQuery(undefined, { skip: false });

    // Which commercial-LLM providers already have an API key on this account
    useEffect(() => {
        let cancelled = false;
        apiService.getLLMCredentials()
            .then(({ data }) => { if (!cancelled) setSavedKeys(data?.providers || {}); })
            .catch(() => { if (!cancelled) setSavedKeys({}); });
        return () => { cancelled = true; };
    }, []);

    // Changing provider or key invalidates any previous test result
    useEffect(() => {
        setKeyTest({ status: 'idle', message: '' });
    }, [commercialProvider, llmApiKey]);

    const handleTestLLMKey = async () => {
        const keyToTest = llmApiKey.trim();
        const hasSaved = savedKeys?.[commercialProvider]?.has_key;
        if (!keyToTest && !hasSaved && commercialProvider !== 'groq') {
            setKeyTest({ status: 'fail', message: 'Enter an API key to test.' });
            return;
        }
        setKeyTest({ status: 'testing', message: '' });
        try {
            const { data } = await apiService.testLLMCredentials(commercialProvider, keyToTest || null);
            if (data?.valid) {
                // Be honest about WHICH key passed: with no key entered and none
                // saved, groq validates via the platform's key — not the user's.
                if (data.key_source === 'platform') {
                    setKeyTest({ status: 'ok', message: `Platform ${commercialProvider} key is working — you haven't saved your own key yet.` });
                } else {
                    setKeyTest({ status: 'ok', message: `${data.key_source === 'account' ? 'Your saved key' : 'Key'} is valid — model: ${data.model || 'ok'}` });
                    toast.success(`${commercialProvider} API key is valid`);
                }
            } else {
                setKeyTest({ status: 'fail', message: data?.error || 'Key validation failed.' });
            }
        } catch (err) {
            const detail = err?.response?.data?.detail;
            setKeyTest({ status: 'fail', message: typeof detail === 'string' ? detail : 'Could not reach the validation service.' });
        }
    };

    // Pre-populate SSH fields from saved credentials when empty (e.g. new device, cleared storage)
    useEffect(() => {
        if (!savedCredentials?.has_credentials) return;
        setSshHost((prev) => prev || savedCredentials.hostname || '');
        setSshUsername((prev) => prev || savedCredentials.username || '');
        setSshPort((prev) => prev || String(savedCredentials.port || 22));
        setSourcePath((prev) => prev || savedCredentials.source_path || '');
    }, [savedCredentials]);

    // Persist form data to localStorage whenever it changes
    useEffect(() => {
        const dataToSave = {
            sshHost,
            sshUsername,
            sshPort,
            privateKeyPassword,
            pemFileName,
            selectedLLM,
            commercialProvider,
            selectedVM,
            codeLocation,
            gitRepoUrl,
            gitAccessToken,
            sourcePath,
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Error saving form data:', error);
        }
    }, [sshHost, sshUsername, sshPort, privateKeyPassword, pemFileName, selectedLLM, commercialProvider, selectedVM, codeLocation, gitRepoUrl, gitAccessToken, sourcePath]);

    // Clear persisted data on successful submission
    const clearPersistedData = () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing persisted data:', error);
        }
    };

    const llmOptions = [
        {
            id: 'onprem-hosted',
            name: 'Mira AI Hosted LLM',
            description: 'Our custom-trained model, optimized specifically for reverse-engineering and legacy code transformation.',
            icon: Server,
            disabled: false,
            badge: 'Option 1',
            badgeColor: 'bg-purple-100 text-purple-700'
        },
        {
            id: 'commercial-api',
            name: 'Commercial LLM API',
            description: 'Groq (Open Models), Anthropic (Claude Series), OpenAI (GPT Series), Google (Gemini Series).',
            icon: Cloud,
            disabled: false,
            badge: 'Option 2',
            badgeColor: 'bg-blue-100 text-blue-700'
        }
    ];

    // Providers offered under the "Commercial LLM API" option.
    const commercialProviders = [
        { id: 'groq',      name: 'Groq',      series: 'Open Models' },
        { id: 'anthropic', name: 'Anthropic', series: 'Claude Series' },
        { id: 'openai',    name: 'OpenAI',    series: 'GPT Series' },
        { id: 'google',    name: 'Google',    series: 'Gemini Series' },
    ];


    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.name.endsWith('.pem')) {
                setPemFile(file);
                setPemFileName(file.name);
                setErrors({ ...errors, pemFile: '' });
            } else {
                setErrors({ ...errors, pemFile: 'Please upload a valid .pem file' });
                setPemFile(null);
                setPemFileName('');
            }
        }
    };

    const handleTestConnection = async () => {
        // Validate required SSH fields
        const testErrors = {};
        if (!sshHost.trim()) testErrors.sshHost = 'SSH host is required';
        if (!sshUsername.trim()) testErrors.sshUsername = 'SSH username is required';
        if (!sshPort || isNaN(sshPort)) testErrors.sshPort = 'Valid port required';

        if (Object.keys(testErrors).length > 0) {
            setErrors({ ...errors, ...testErrors });
            toast.error('Please fill in all required SSH fields');
            return;
        }

        try {
            // Read PEM file if provided
            let privateKeyContent = '';
            if (pemFile) {
                privateKeyContent = await pemFile.text();
            }

            // Backend expects flat SSHCredentials body
            const credentials = {
                hostname: sshHost,
                port: parseInt(sshPort),
                username: sshUsername,
                password: privateKeyPassword || null,
                private_key: privateKeyContent || null,
                private_key_password: privateKeyPassword || null,
                source_path: (sourcePath || '').trim() || null,
            };

            const result = await testSSH(credentials).unwrap();

            setSshTestResult({ success: true, message: result.message || 'SSH connection successful', server_info: result.detail ? { system_info: result.detail } : null });
            setShowServerInfo(true);
            toast.success('SSH connection successful!');
        } catch (error) {
            console.error('SSH test error:', error);
            const detail = error?.data?.detail;
            let msg;
            if (Array.isArray(detail)) {
                msg = detail.map(d => d.msg || String(d)).join(', ');
            } else if (typeof detail === 'string') {
                msg = detail;
            } else {
                msg = 'Failed to test SSH connection';
            }
            setSshTestResult({ success: false, message: msg });
            setShowServerInfo(true);
            toast.error(msg);
        }
    };

    const validateForm = () => {
        const newErrors = {};


        if (!sshHost.trim()) {
            newErrors.sshHost = 'SSH host is required';
        }

        if (!sshUsername.trim()) {
            newErrors.sshUsername = 'SSH username is required';
        }

        if (!sshPort || isNaN(sshPort) || sshPort < 1 || sshPort > 65535) {
            newErrors.sshPort = 'Valid port number required (1-65535)';
        }

        // if (!pemFile) {
        //   newErrors.pemFile = 'PEM key file is required';
        // }

        if (!selectedLLM) {
            newErrors.llm = 'Please select an LLM option';
        }

        // Commercial providers other than Groq have no platform-level key —
        // the user must supply one (either now or previously saved).
        if (selectedLLM === 'commercial-api' && commercialProvider !== 'groq') {
            const hasSaved = savedKeys?.[commercialProvider]?.has_key;
            if (!llmApiKey.trim() && !hasSaved) {
                newErrors.llmApiKey = `An API key is required for ${commercialProvider}. Enter it above or pick a different provider.`;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Read PEM file content if provided
            let pemFileContent = null;
            if (pemFile) {
                pemFileContent = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsText(pemFile);
                });
            }

            const projectData = {
                sshHost,
                sshUsername,
                sshPort,
                pemFileContent,
                privateKeyPassword,
                selectedLLM,
                // Backend LLM routing: Mira AI Hosted uses the on-prem gateway;
                // Commercial LLM API uses the provider the user picked (Groq default).
                llmProvider: selectedLLM === 'onprem-hosted' ? 'onprem' : commercialProvider,
                selectedVM,
                codeLocation,
                gitRepoUrl: codeLocation === 'git-repository' ? gitRepoUrl : null,
                gitAccessToken: codeLocation === 'git-repository' ? gitAccessToken : null,
                additionalFiles,
                sourcePath: codeLocation === 'already-on-server' ? sourcePath : null,
            };

            // Clear persisted data on successful submission
            clearPersistedData();

            // Hand the API key to the next page via sessionStorage, NOT router
            // state: history.state is persisted to disk by browsers and would
            // keep the secret across reloads/Back navigation. ProjectInfoPage
            // reads and deletes this right after the project is created.
            try {
                if (selectedLLM === 'commercial-api' && llmApiKey.trim()) {
                    sessionStorage.setItem('mira-pending-llm-key', llmApiKey.trim());
                } else {
                    sessionStorage.removeItem('mira-pending-llm-key');
                }
            } catch { /* storage unavailable — key simply won't be attached */ }

            // Navigate to project info page (Step 2 of project creation)
            navigate('/project/info', { state: projectData });
        } catch (error) {
            console.error('Error submitting project:', error);
            setErrors({ submit: 'Failed to process project data. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-5">
                {/* Compact header with inline step progress */}
                <div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
                                Start New Project
                            </h1>
                            <p className="text-[13px] text-gray-500 mt-0.5">
                                Choose your machine, enter its credentials, then select your preferred LLM
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {persistedData && (
                                <button
                                    onClick={() => {
                                        clearPersistedData();
                                        window.location.reload();
                                    }}
                                    className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
                                    title="Clear saved form data"
                                >
                                    Clear saved data
                                </button>
                            )}
                            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Step 1 of 2</span>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200/80 rounded-full h-1.5 mt-3">
                        <div className="bg-primary-600 h-1.5 rounded-full" style={{ width: '50%' }}></div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                  


                    {/* Code Source Configuration - Only show for on-premises VM */}
                    {selectedVM === 'on-premises' && (
                        <Card>
                            <div className="p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                                        <GitBranch className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-gray-900">Code Source Configuration</h2>
                                        <p className="text-[13px] text-gray-500">Specify where your legacy code is located</p>
                                    </div>
                                </div>

                                {/* Radio buttons for code location  */}
                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${codeLocation === 'needs-upload' ? 'mb-5' : ''}`}>
                                    <label className={`flex items-start space-x-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all duration-150 ${codeLocation === 'already-on-server' ? 'border-primary-500 bg-primary-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                        <input
                                            type="radio"
                                            name="codeLocation"
                                            value="already-on-server"
                                            checked={codeLocation === 'already-on-server'}
                                            onChange={(e) => setCodeLocation(e.target.value)}
                                            className="mt-1 w-4 h-4 text-primary-600 focus:ring-primary-500"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                                <Server className={`w-5 h-5 ${codeLocation === 'already-on-server' ? 'text-primary-600' : 'text-gray-500'}`} />
                                                <span className="font-semibold text-gray-900">Code already exists on server</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">The legacy code is already present on your on-premises server</p>
                                        </div>
                                        {codeLocation === 'already-on-server' && (
                                            <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />
                                        )}
                                    </label>

                                    <label className={`flex items-start space-x-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all duration-150 ${codeLocation === 'needs-upload' ? 'border-primary-500 bg-primary-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                        <input
                                            type="radio"
                                            name="codeLocation"
                                            value="needs-upload"
                                            checked={codeLocation === 'needs-upload'}
                                            onChange={(e) => setCodeLocation(e.target.value)}
                                            className="mt-1 w-4 h-4 text-primary-600 focus:ring-primary-500"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                                <Upload className={`w-5 h-5 ${codeLocation === 'needs-upload' ? 'text-primary-600' : 'text-gray-500'}`} />
                                                <span className="font-semibold text-gray-900">Code needs to be uploaded</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">Connect to a Git repository to clone the code to your server</p>
                                        </div>
                                        {codeLocation === 'needs-upload' && (
                                            <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />
                                        )}
                                    </label>
                                </div>

                                {/* Git Repository Fields - Show when needs-upload is selected */}
                                {codeLocation === 'needs-upload' && (
                                    <>
                                        <div className="space-y-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <div>
                                                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                                                    <GitBranch className="w-4 h-4" />
                                                    <span>Git Repository Connection</span>
                                                </h3>

                                                <div className="space-y-4">
                                                    <Input
                                                        label="Repository URL"
                                                        type="text"
                                                        placeholder="https://github.com/username/repository.git"
                                                        value={gitRepoUrl}
                                                        onChange={(e) => setGitRepoUrl(e.target.value)}
                                                        error={errors.gitRepoUrl}
                                                        helperText="Supports GitHub, GitLab, Bitbucket, and Azure DevOps"
                                                    />

                                                    <Input
                                                        label="Access Token (Optional)"
                                                        type="password"
                                                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxxx"
                                                        value={gitAccessToken}
                                                        onChange={(e) => setGitAccessToken(e.target.value)}
                                                        helperText="Required for private repositories. Ensure it has read-only access."
                                                    />
                                                </div>
                                            </div>
                                        </div>


                                        {/* Additional Files Upload Section */}
                                        <div className="mt-6 pt-6 border-t border-gray-200">
                                            <div className="flex items-center space-x-2 mb-4">
                                                <File className="w-5 h-5 text-gray-600" />
                                                <h3 className="text-sm font-semibold text-gray-900">Additional Files (Optional)</h3>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-4">
                                                Upload any additional files like .env, configuration files, or other resources needed for the conversion.
                                            </p>

                                            <div>
                                                <input
                                                    type="file"
                                                    multiple
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files);
                                                        setAdditionalFiles(files);
                                                    }}
                                                    className="hidden"
                                                    id="additional-files-upload"
                                                />
                                                <label
                                                    htmlFor="additional-files-upload"
                                                    className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-white hover:bg-gray-50 transition-colors duration-200"
                                                >
                                                    <div className="text-center">
                                                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                                        <div className="text-sm font-medium text-gray-700">Click to upload files</div>
                                                        <div className="text-xs text-gray-500 mt-1">.env, config files, etc.</div>
                                                    </div>
                                                </label>
                                                {additionalFiles.length > 0 && (
                                                    <div className="mt-3 space-y-2">
                                                        {additionalFiles.map((file, index) => (
                                                            <div key={index} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                                                                <div className="flex items-center space-x-2">
                                                                    <File className="w-4 h-4 text-green-600" />
                                                                    <span className="text-sm text-gray-700">{file.name}</span>
                                                                    <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(2)} KB)</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setAdditionalFiles(additionalFiles.filter((_, i) => i !== index));
                                                                    }}
                                                                    className="text-red-500 hover:text-red-700"
                                                                >
                                                                    <AlertCircle className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </Card>
                    )}


                    {/* SSH Configuration Section */}
                    <Card>
                        <div className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                    <Key className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-gray-900">SSH Configuration</h2>
                                    <p className="text-[13px] text-gray-500">Enter your server SSH credentials</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* SSH Host */}
                                <Input
                                    label="SSH Host / IP Address"
                                    type="text"
                                    placeholder="e.g., 192.168.1.1 or myserver.company.com"
                                    value={sshHost}
                                    onChange={(e) => setSshHost(e.target.value)}
                                    error={errors.sshHost}
                                    required
                                />

                                {/* SSH Username */}
                                <Input
                                    label="SSH Username"
                                    type="text"
                                    placeholder="e.g., ubuntu, ec2-user"
                                    value={sshUsername}
                                    onChange={(e) => setSshUsername(e.target.value)}
                                    error={errors.sshUsername}
                                    required
                                />

                                {/* SSH Port */}
                                <Input
                                    label="SSH Port"
                                    type="number"
                                    placeholder="22"
                                    value={sshPort}
                                    onChange={(e) => setSshPort(e.target.value)}
                                    error={errors.sshPort}
                                    required
                                />

                                {/* Privake key password  */}
                                <Input
                                    label="Private Key Password (if any)"
                                    type="password"
                                    placeholder="Enter private key password"
                                    value={privateKeyPassword}
                                    onChange={(e) => setPrivateKeyPassword(e.target.value)}
                                    error={errors.privateKeyPassword}
                                />

                                 {/* Privake key password  */}
                                <Input
                                    label="Source Path on Server (if code already exists on server)"
                                    type="text"
                                    placeholder="e.g., /home/ubuntu/myapp"
                                    value={sourcePath}
                                    onChange={(e) => setSourcePath(e.target.value)}
                                    error={errors.sourcePath}
                                />

                                {/* PEM Key Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        PEM Key File
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept=".pem"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="pem-upload"
                                        />
                                        <label
                                            htmlFor="pem-upload"
                                            className={`flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${errors.pemFile
                                                    ? 'border-red-300 bg-red-50 hover:bg-red-100'
                                                    : pemFileName
                                                        ? 'border-green-300 bg-green-50 hover:bg-green-100'
                                                        : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                                                }`}
                                        >
                                            {pemFileName ? (
                                                <div className="flex items-center space-x-2 text-green-700">
                                                    <CheckCircle className="w-5 h-5" />
                                                    <span className="text-sm font-medium">{pemFileName}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-2 text-gray-600">
                                                    <Upload className="w-5 h-5" />
                                                    <span className="text-sm">Upload .pem key file</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                    {errors.pemFile && (
                                        <p className="mt-1 text-sm text-red-600">{errors.pemFile}</p>
                                    )}
                                </div>
                            </div>

                            {/* Test Connection Button */}
                            <div className="mt-4">
                                <Button
                                    type="button"
                                    onClick={handleTestConnection}
                                    disabled={isTestingSSH}
                                    variant="outline"
                                    className=" bg-gray-50 hover:bg-gray-100 border-gray-300 cursor-pointer shadow-md transition-colors duration-200"
                                >
                                    {isTestingSSH ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span>Testing Connection...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <Key className="w-4 h-4" />
                                            <span>Test SSH Connection</span>
                                        </div>
                                    )}
                                </Button>
                            </div>

                            {/* SSH Test Results */}
                            {sshTestResult && showServerInfo && (
                                <div className="mt-6 p-4 rounded-lg border-2 animate-fadeIn" 
                                     style={{
                                         borderColor: sshTestResult.success ? '#10b981' : '#ef4444',
                                         backgroundColor: sshTestResult.success ? '#f0fdf4' : '#fef2f2'
                                     }}>
                                    <div className="flex items-start space-x-3">
                                        {sshTestResult.success ? (
                                            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                            <h4 className={`font-semibold mb-2 ${
                                                sshTestResult.success ? 'text-green-900' : 'text-red-900'
                                            }`}>
                                                {sshTestResult.message}
                                            </h4>
                                            
                                            {sshTestResult.success && sshTestResult.server_info && (
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                                        <div>
                                                            <span className="text-gray-600">Hostname:</span>
                                                            <span className="ml-2 font-medium text-gray-900">
                                                                {sshTestResult.server_info.hostname}:{sshTestResult.server_info.port}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-600">User:</span>
                                                            <span className="ml-2 font-medium text-gray-900">
                                                                {sshTestResult.server_info.current_user}
                                                            </span>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <span className="text-gray-600">System:</span>
                                                            <span className="ml-2 font-mono text-xs text-gray-900">
                                                                {sshTestResult.server_info.system_info}
                                                            </span>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <span className="text-gray-600">Disk Space:</span>
                                                            <span className="ml-2 font-mono text-xs text-gray-900">
                                                                {sshTestResult.server_info.disk_space}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    {sshTestResult.directory_structure && (
                                                        <details className="mt-4">
                                                            <summary className="cursor-pointer text-sm font-medium text-green-700 hover:text-green-800 flex items-center space-x-2">
                                                                <HardDriveDownload className="w-4 h-4" />
                                                                <span>View Directory Structure ({sshTestResult.directory_structure.total_items} items)</span>
                                                            </summary>
                                                            <div className="mt-3 p-3 bg-white rounded border border-green-200 max-h-48 overflow-y-auto">
                                                                <div className="space-y-1 text-xs font-mono">
                                                                    {sshTestResult.directory_structure.items.slice(0, 10).map((item, idx) => (
                                                                        <div key={idx} className="flex items-center space-x-2 text-gray-700">
                                                                            <span className={item.type === 'directory' ? 'text-blue-600' : 'text-gray-600'}>
                                                                                {item.type === 'directory' ? '📁' : '📄'}
                                                                            </span>
                                                                            <span>{item.name}</span>
                                                                        </div>
                                                                    ))}
                                                                    {sshTestResult.directory_structure.items.length > 10 && (
                                                                        <p className="text-gray-500 italic">...and {sshTestResult.directory_structure.items.length - 10} more</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </details>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {!sshTestResult.success && sshTestResult.error_details && (
                                                <div className="space-y-2 text-sm">
                                                    <div className="text-red-800">
                                                        {sshTestResult.error_details.error_message}
                                                    </div>
                                                    {sshTestResult.error_details.troubleshooting && (
                                                        <div className="mt-3">
                                                            <p className="font-medium text-red-900 mb-1">Troubleshooting:</p>
                                                            <ul className="list-disc list-inside space-y-1 text-red-800">
                                                                {sshTestResult.error_details.troubleshooting.map((tip, idx) => (
                                                                    <li key={idx}>{tip}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowServerInfo(false)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>



                    {/* LLM Selection Section — after the machine + credentials are set */}
                    <Card>
                        <div className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="w-4 h-4 text-violet-600" />
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-gray-900">Select LLM Option</h2>
                                    <p className="text-[13px] text-gray-500">Choose the AI model that will analyze and transform your code</p>
                                </div>
                            </div>

                            {errors.llm && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                    <span className="text-sm text-red-700">{errors.llm}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {llmOptions.map((option) => {
                                    const IconComponent = option.icon;
                                    const isSelected = selectedLLM === option.id;

                                    return (
                                        <div
                                            key={option.id}
                                            onClick={() => !option.disabled && setSelectedLLM(option.id)}
                                            className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${option.disabled
                                                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                                                    : isSelected
                                                        ? 'border-primary-500 bg-primary-50 shadow-md cursor-pointer'
                                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm cursor-pointer'
                                                }`}
                                        >
                                            {/* Badge */}
                                            <div className="absolute -top-3 left-4">
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${option.badgeColor}`}>
                                                    {option.badge}
                                                </span>
                                            </div>

                                            {/* Selection Indicator */}
                                            {isSelected && (
                                                <div className="absolute top-4 right-4">
                                                    <CheckCircle className="w-6 h-6 text-primary-600" />
                                                </div>
                                            )}

                                            {/* Content */}
                                            <div className="text-center pt-2">
                                                <div className={`inline-flex p-3 rounded-xl mb-4 ${option.disabled
                                                        ? 'bg-gray-200'
                                                        : isSelected
                                                            ? 'bg-primary-100'
                                                            : 'bg-gray-100'
                                                    }`}>
                                                    <IconComponent className={`w-8 h-8 ${option.disabled
                                                            ? 'text-gray-400'
                                                            : isSelected
                                                                ? 'text-primary-600'
                                                                : 'text-gray-600'
                                                        }`} />
                                                </div>
                                                <h3 className={`text-lg font-semibold mb-2 ${option.disabled ? 'text-gray-400' : 'text-gray-900'
                                                    }`}>
                                                    {option.name}
                                                </h3>
                                                <p className={`text-sm ${option.disabled ? 'text-gray-400' : 'text-gray-600'
                                                    }`}>
                                                    {option.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Provider picker — only for the Commercial LLM API option */}
                            {selectedLLM === 'commercial-api' && (
                                <div className="mt-5">
                                    <p className="text-sm font-medium text-gray-700 mb-3">Choose your provider</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {commercialProviders.map((p) => {
                                            const isActive = commercialProvider === p.id;
                                            const hasKey = savedKeys?.[p.id]?.has_key;
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => setCommercialProvider(p.id)}
                                                    className={`relative p-2.5 rounded-lg border-2 text-center transition-all duration-150 ${isActive
                                                            ? 'border-primary-500 bg-primary-50 shadow-sm'
                                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                                        }`}
                                                >
                                                    {hasKey && (
                                                        <span
                                                            title="An API key for this provider is saved on your account"
                                                            className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5"
                                                        >
                                                            <Key className="w-2.5 h-2.5" /> key
                                                        </span>
                                                    )}
                                                    <span className={`block text-sm font-semibold ${isActive ? 'text-primary-700' : 'text-gray-800'}`}>
                                                        {p.name}
                                                    </span>
                                                    <span className={`block text-xs mt-0.5 ${isActive ? 'text-primary-600' : 'text-gray-500'}`}>
                                                        {p.series}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* API key for the chosen provider */}
                                    <div className="mt-5 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-medium text-gray-700">
                                                {commercialProviders.find(p => p.id === commercialProvider)?.name} API Key
                                                {commercialProvider !== 'groq' && <span className="text-red-500 ml-0.5">*</span>}
                                            </label>
                                            {savedKeys?.[commercialProvider]?.has_key && (
                                                <span className="text-xs text-green-700 flex items-center gap-1">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    Saved key {savedKeys[commercialProvider].hint || ''} on your account
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="password"
                                                autoComplete="off"
                                                placeholder={savedKeys?.[commercialProvider]?.has_key
                                                    ? 'Enter a new key to replace the saved one (optional)'
                                                    : commercialProvider === 'groq'
                                                        ? 'Optional — platform key is used if left empty'
                                                        : 'Paste your API key'}
                                                value={llmApiKey}
                                                onChange={(e) => setLlmApiKey(e.target.value)}
                                                className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.llmApiKey ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'}`}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleTestLLMKey}
                                                disabled={keyTest.status === 'testing'}
                                                className="whitespace-nowrap"
                                            >
                                                {keyTest.status === 'testing' ? (
                                                    <span className="flex items-center gap-2">
                                                        <span className="w-3.5 h-3.5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                                                        Testing…
                                                    </span>
                                                ) : 'Test Key'}
                                            </Button>
                                        </div>
                                        {keyTest.status === 'ok' && (
                                            <p className="mt-2 text-xs text-green-700 flex items-center gap-1">
                                                <CheckCircle className="w-3.5 h-3.5" /> {keyTest.message}
                                            </p>
                                        )}
                                        {keyTest.status === 'fail' && (
                                            <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {keyTest.message}
                                            </p>
                                        )}
                                        {errors.llmApiKey && (
                                            <p className="mt-2 text-xs text-red-600">{errors.llmApiKey}</p>
                                        )}
                                        <p className="mt-2 text-xs text-gray-500">
                                            Your key is stored encrypted on your account. Code transformation and Sonar fixes run on your chosen provider with this key; analysis and planning steps use the platform's cloud API.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Mira-AI-hosted info note removed from the UI per request (2026-08-11).
                                Restore by uncommenting this block.
                            {selectedLLM === 'onprem-hosted' && (
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-2">
                                    <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-blue-700">
                                        Your code is transformed by our custom-trained model and never leaves our servers. Project analysis uses the cloud API for best accuracy.
                                    </span>
                                </div>
                            )}
                            */}
                        </div>
                    </Card>

                    {/* Error Message */}
                    {errors.submit && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <span className="text-red-700">{errors.submit}</span>
                        </div>
                    )}

                    {/* Submit row: equal-height buttons on one baseline; the
                        SSH hint sits below the row so it never skews alignment */}
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate('/dashboard')}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || (selectedVM === 'on-premises' && !sshTestResult?.success)}
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Creating Project...</span>
                                    </div>
                                ) : (
                                    'Submit'
                                )}
                            </Button>
                        </div>
                        {selectedVM === 'on-premises' && !sshTestResult?.success && (
                            <p className="text-sm text-amber-600 flex items-center gap-1.5">
                                <Info className="w-4 h-4" />
                                <span>Test SSH connection before submitting</span>
                            </p>
                        )}
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
};

export default NewProjectPage;

// Dev: Moshiur Rahman - 2026-03-01
