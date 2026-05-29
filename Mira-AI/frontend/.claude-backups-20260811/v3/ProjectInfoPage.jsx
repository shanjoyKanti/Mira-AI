import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { TextArea } from '../../components/ui/TextArea';
import { Button } from '../../components/ui/Button';
import { useCreateProjectMutation } from '../../store/slices/projectsApiSlice';

export const ProjectInfoPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get SSH and LLM data from previous page
  const sshLlmData = location.state || null;

  // Redirect if no previous data
  if (!sshLlmData) {
    navigate('/project/new');
    return null;
  }

  // Form state
  const [projectName, setProjectName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [industry, setIndustry] = useState('');
  const [projectType, setProjectType] = useState('webapp');
  const [legacyTech, setLegacyTech] = useState('php');
  const [traffic, setTraffic] = useState('low');
  const [concurrentUsers, setConcurrentUsers] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // RTK Query mutation for creating project
  const [createProject, { isLoading: isCreatingProject }] = useCreateProjectMutation();

  const projectTypes = [
    { value: 'webapp', label: 'Web Application', disabled: false },
    { value: 'mobile', label: 'Mobile App (Coming Soon)', disabled: true },
    { value: 'desktop', label: 'Desktop App (Coming Soon)', disabled: true }
  ];

  const legacyTechnologies = [
    { value: 'php', label: 'PHP', disabled: false },
    { value: 'aspnet', label: 'ASP.NET (Coming Soon)', disabled: true },
    { value: 'dotnet', label: '.NET Framework (Coming Soon)', disabled: true }
  ];

  const trafficLevels = [
    { value: 'low', label: 'Low (< 10K monthly)', disabled: false },
    { value: 'medium', label: 'Medium (10K - 100K monthly)', disabled: false },
    { value: 'high', label: 'High (100K - 1M monthly)', disabled: false },
    { value: 'enterprise', label: 'Enterprise (> 1M monthly)', disabled: false }
  ];

  const regionsOptions = [
    { value: 'north-america', label: 'North America' },
    { value: 'south-america', label: 'South America' },
    { value: 'europe', label: 'Europe' },
    { value: 'middle-east', label: 'Middle East' },
    { value: 'south-asia', label: 'South Asia' },
    { value: 'east-asia', label: 'East Asia' },
    { value: 'africa', label: 'Africa' },
    { value: 'oceania', label: 'Oceania' },
    { value: 'other', label: 'Other' }
  ];

  const [regions, setRegions] = useState([]);  
  const [customRegion, setCustomRegion] = useState('');
  const [showCustomRegionInput, setShowCustomRegionInput] = useState(false);
  
  const industries = [
    { value: 'finance', label: 'Financial Services' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'ecommerce', label: 'E-commerce' },
    { value: 'technology', label: 'Technology' },
    { value: 'education', label: 'Education' },
    { value: 'government', label: 'Government' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'other', label: 'Other' }
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!projectName.trim()) newErrors.projectName = 'Project name is required';
    if (!projectType) newErrors.projectType = 'Project type is required';
    if (!legacyTech) newErrors.legacyTech = 'Legacy technology is required';
    if (!traffic) newErrors.traffic = 'Traffic level is required';
    if (!concurrentUsers || concurrentUsers < 1) newErrors.concurrentUsers = 'Valid user count required';

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
      // Map form data to API payload format
      const apiPayload = {
        project_name: projectName,
        organization_name: organizationName || '',
        project_description: additionalNotes || '',
        source_path: (sshLlmData.sourcePath || '').trim() || null, // From SSH config - must be valid path for scans
        project_type: projectType === 'webapp' ? 'web' : projectType,
        legacy_technology: [legacyTech],
        frameworks: [], // Can be populated later if needed
        industry: industry || '',
        deployment_regions: regions.map(r => r.label.toLowerCase().replace(/\s+/g, '_')),
        monthly_traffic: traffic,
        peak_concurrent_users: parseInt(concurrentUsers, 10),
        conversion_environment: sshLlmData.selectedVM === 'on-premises' ? 'on_premises_server' : 'miraai_hosted',
        code_source_type: sshLlmData.codeLocation === 'already-on-server' ? 'exists_on_server' : 'git_repository',
        git_repo_url: sshLlmData.gitRepoUrl || null,
        additional_files: sshLlmData.additionalFiles || [],
        // Two LLM choices: 'onprem-hosted' uses the on-prem gateway; 'commercial-api' uses the cloud backend.
        llm_option: sshLlmData.selectedLLM === 'onprem-hosted' ? 'on_premises' : 'commercial',
        llm_provider: sshLlmData.llmProvider || (sshLlmData.selectedLLM === 'onprem-hosted' ? 'onprem' : 'groq'),
        // Write-only: the user's key for that provider (handed off via
        // sessionStorage — never router state, which browsers persist to disk).
        // Backend stores it encrypted on the account; removed below on success.
        llm_api_key: (() => {
          try { return sessionStorage.getItem('mira-pending-llm-key') || null; }
          catch { return null; }
        })(),
        // SSH credentials from previous page
        ssh_host: sshLlmData.sshHost,
        ssh_username: sshLlmData.sshUsername,
        ssh_port: parseInt(sshLlmData.sshPort, 10) || 22,
        ssh_private_key: sshLlmData.pemFileContent || null,
        private_key_password: sshLlmData.privateKeyPassword || null,
      };

      // Call API to create project
      const response = await createProject(apiPayload).unwrap();

      // Key is stored server-side now — drop the local copy immediately.
      try { sessionStorage.removeItem('mira-pending-llm-key'); } catch { /* noop */ }

      // Navigate to dashboard with success message
      navigate('/dashboard', { 
        state: { 
          projectCreated: true, 
          projectName: response.project.project_name,
          projectId: response.project.id 
        } 
      });
    } catch (error) {
      console.error('Error creating project:', error);
      const errorMessage = error?.data?.detail || error?.data?.message || 'Failed to create project. Please try again.';
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Project Information
          </h1>
          <p className="text-gray-600">
            Step 2 of 2 - Provide your legacy project details
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">Step 2 of 2</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-primary-600 h-2 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Basics */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Project Basics
            </h2>
            <div className="space-y-4">
              <Input
                label="Project Name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., E-commerce Platform"
                required
                error={errors.projectName}
              />

              <Input
                label="Organization Name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Acme Corporation"
              />

              <Select
                label="Industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                options={industries}
              />

              <Select
                label="Project Type"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                options={projectTypes}
                required
                error={errors.projectType}
              />

              <Select
                label="Legacy Technology"
                value={legacyTech}
                onChange={(e) => setLegacyTech(e.target.value)}
                options={legacyTechnologies}
                required
                error={errors.legacyTech}
              />
            </div>
          </Card>

          {/* Project Description */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Project Description
            </h2>
            <TextArea
              label="Details about your project"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Describe your project as an end user, or context about your project ..."
              rows={6}
              helperText="Optional: Add any additional information that might help with analysis"
            />
          </Card>

          {/* Traffic Information */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Traffic Information
            </h2>
            
            {/* Regions selection with tags */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Deployment Regions</label>
              <p className="text-sm text-gray-500 mb-3">Select all regions where your application is deployed</p>
              
              {/* Multi-select checkboxes */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                {regionsOptions.map((option) => (
                  <label 
                    key={option.value} 
                    className="flex items-center space-x-2 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={regions.some(r => r.value === option.value)}
                      onChange={(e) => {
                        if (option.value === 'other') {
                          setShowCustomRegionInput(e.target.checked);
                          if (!e.target.checked) {
                            // Remove "other" from regions when unchecked
                            setRegions(prev => prev.filter(r => r.value !== 'other'));
                          }
                        } else {
                          if (e.target.checked) {
                            setRegions(prev => [...prev, { value: option.value, label: option.label }]);
                          } else {
                            setRegions(prev => prev.filter(r => r.value !== option.value));
                          }
                        }
                      }}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>

              {/* Custom region input - shows when "Other" is checked */}
              {showCustomRegionInput && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      label=""
                      value={customRegion}
                      onChange={(e) => setCustomRegion(e.target.value)}
                      placeholder="Enter custom region name (e.g., Central Asia)"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!customRegion.trim()) return;
                      if (!regions.some(r => r.value === customRegion.toLowerCase().replace(/\s+/g, '-'))) {
                        setRegions((prev) => [...prev, { 
                          value: customRegion.toLowerCase().replace(/\s+/g, '-'), 
                          label: customRegion, 
                          custom: true 
                        }]);
                      }
                      setCustomRegion('');
                    }}
                  >
                    Add
                  </Button>
                </div>
              )}

              {/* Selected regions tags - show custom regions */}
              {regions.filter(r => r.custom).length > 0 && (
                <div className="mt-3">
                  <span className="text-xs font-medium text-gray-500 mb-2 block">Custom regions:</span>
                  <div className="flex flex-wrap gap-2">
                    {regions.filter(r => r.custom).map((r, index) => (
                      <div key={`${r.value}-${index}`} className="inline-flex items-center bg-primary-50 border border-primary-200 rounded-full px-3 py-1 text-sm">
                        <span className="mr-2 text-primary-700 font-medium">{r.label}</span>
                        <button
                          type="button"
                          onClick={() => setRegions((prev) => prev.filter(region => region.value !== r.value))}
                          className="text-primary-600 hover:text-primary-800 font-bold text-lg leading-none"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Select
                label="Monthly Traffic"
                value={traffic}
                onChange={(e) => setTraffic(e.target.value)}
                options={trafficLevels}
                required
                error={errors.traffic}
              />

              <Input
                label="Peak Concurrent Users"
                type="number"
                value={concurrentUsers}
                onChange={(e) => setConcurrentUsers(e.target.value)}
                placeholder="e.g., 1000"
                required
                error={errors.concurrentUsers}
                helperText="Estimated number of simultaneous users during peak times"
              />
            </div>
          </Card>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-red-700">{errors.submit}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button variant="secondary" onClick={() => navigate('/project/new')}>
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting || isCreatingProject}>
              {(isSubmitting || isCreatingProject) ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Project...</span>
                </div>
              ) : (
                'Create Project'
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default ProjectInfoPage;

// Dev: Mohiuzzaman Anik - 2026-03-17

// Dev: Arafat Uddin - 2026-05-29
