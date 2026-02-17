import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useTestSSHConnectionMutation, useGetSSHCredentialsQuery } from '../../store/slices/projectsApiSlice';
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
    }, [sshHost, sshUsername, sshPort, privateKeyPassword, pemFileName, selectedLLM, selectedVM, codeLocation, gitRepoUrl, gitAccessToken, sourcePath]);

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
            id: 'commercial-api',
            name: 'Commercial API',
            description: 'Fast cloud inference via our commercial API. Recommended default.',
            icon: Cloud,
            disabled: false,
            badge: 'Recommended',
            badgeColor: 'bg-green-100 text-green-700'
        },
        {
            id: 'onprem-hosted',
            name: 'On-Prem Hosted LLM',
            description: 'Use our on-prem hosted model. Your code never leaves our servers.',
            icon: Server,
            disabled: false,
            badge: 'Available',
            badgeColor: 'bg-blue-100 text-blue-700'
        }
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
                // Backend LLM routing: On-Prem Hosted uses the on-prem gateway; Commercial API uses the cloud backend.
                llmProvider: selectedLLM === 'onprem-hosted' ? 'onprem' : 'groq',
                selectedVM,
                codeLocation,
                gitRepoUrl: codeLocation === 'git-repository' ? gitRepoUrl : null,
                gitAccessToken: codeLocation === 'git-repository' ? gitAccessToken : null,
                additionalFiles,
                sourcePath: codeLocation === 'already-on-server' ? sourcePath : null,
            };

            // Clear persisted data on successful submission
            clearPersistedData();

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
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Page Header */}
                <div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Start New Project
                            </h1>
                            <p className="text-gray-600">
                                Step 1 of 2 - Configure your server connection and select your preferred LLM option
                            </p>
                        </div>
                        {persistedData && (
                            <button
                                onClick={() => {
                                    clearPersistedData();
                                    window.location.reload();
                                }}
                                className="text-sm text-gray-500 hover:text-gray-700 underline"
                                title="Clear saved form data"
                            >
                                Clear Saved Data
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress indicator */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm text-gray-500">Step 1 of 2</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-primary-600 h-2 rounded-full" style={{ width: '50%' }}></div>
                    </div>
                </div>


                <form onSubmit={handleSubmit} className="space-y-8">

                  


                    {/* Code Source Configuration - Only show for on-premises VM */}
                    {selectedVM === 'on-premises' && (
                        <Card>
                            <div className="p-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <GitBranch className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900">Code Source Configuration</h2>
                                        <p className="text-sm text-gray-500">Specify where your legacy code is located</p>
                                    </div>
                                </div>

                                {/* Radio buttons for code location  */}
                                <div className=" md:flex  md:space-x-4 mb-6 ">
                                    <label className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors duration-200 ${codeLocation === 'already-on-server' ? 'border-red-500 bg-primary-50' : 'border-red-200 hover:border-gray-300'}`}>
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
                                                <Server className="w-5 h-5 text-gray-600" />
                                                <span className="font-semibold text-gray-900">Code already exists on server</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">The legacy code is already present on your on-premises server</p>
                                        </div>
                                        {codeLocation === 'already-on-server' && (
                                            <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />
                                        )}
                                    </label>

                                    <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors duration-200 ${codeLocation === 'needs-upload' ? 'border-pr bg-primary-50' : 'border-red-200 hover:border-gray-300'}">
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
                                                <Upload className="w-5 h-5 text-gray-600" />
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


                      {/* LLM Selection Section */}
                    <Card>
                        <div className="p-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Sparkles className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">Select LLM Option</h2>
                                    <p className="text-sm text-gray-500">Choose the AI model for your project analysis</p>
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

                            {/* Note: analysis steps always run on the cloud API; the on-prem model powers code modernization. */}
                            {selectedLLM === 'onprem-hosted' && (
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-2">
                                    <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm text-blue-700">
                                        Code modernization runs on our on-prem model. Project analysis uses the cloud API for best accuracy.
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* SSH Configuration Section */}
                    <Card>
                        <div className="p-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Key className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">SSH Configuration</h2>
                                    <p className="text-sm text-gray-500">Enter your server SSH credentials</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            <div className="mt-6 pt-6  ">
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



                    {/* Error Message */}
                    {errors.submit && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <span className="text-red-700">{errors.submit}</span>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end space-x-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/dashboard')}
                        >
                            Cancel
                        </Button>
                        <div className="flex flex-col items-end">
                            <Button
                                type="submit"
                                size="lg"
                                disabled={isSubmitting || (selectedVM === 'on-premises' && !sshTestResult?.success)}
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Creating Project...</span>
                                    </div>
                                ) : (
                                    'Submit'
                                )}
                            </Button>
                            {selectedVM === 'on-premises' && !sshTestResult?.success && (
                                <p className="mt-2 text-sm text-amber-600 flex items-center space-x-1">
                                    <Info className="w-4 h-4" />
                                    <span>Test SSH connection before submitting</span>
                                </p>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
};

export default NewProjectPage;
