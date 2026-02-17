import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Loading';
import { Alert } from '../../components/ui/Alert';
import { LanguageFrameworkGrid } from '../../components/LanguageFrameworkGrid';
import { apiService } from '../../utils/api';
import toast from 'react-hot-toast';
import { FolderOpen, Plus, Clock, CheckCircle2, XCircle, ArrowRight, History } from 'lucide-react';

export const SelectProjectForTransformPage = () => {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);
  const [transforms, setTransforms] = useState([]);

  useEffect(() => {
    loadProjects();
    loadTransforms();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiService.getRecentProjects();
      const data = response.data?.projects || response.data || [];
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects. Please try again.');
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransforms = async () => {
    try {
      const response = await apiService.listTransforms();
      const data = Array.isArray(response.data) ? response.data : [];
      setTransforms(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (err) {
      console.error('Error loading transforms:', err);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Completed' },
      running: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Running' },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Failed' },
    };
    const config = statusMap[status] || statusMap.running;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4" />
        <span>{config.label}</span>
      </span>
    );
  };

  const handleStartTransform = () => {
    if (!selectedProject) {
      toast.error('Please select a project');
      return;
    }
    navigate('/transform/stack-selection', {
      state: { project_name: selectedProject.project_name || selectedProject.name },
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Code Modernization
          </h1>
          <p className="text-gray-600">
            Select a project to start the 4-step modernization workflow
          </p>
        </header>

        {error && (
          <Alert variant="error" title="Error loading projects">
            {error}
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Selection */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="space-y-6">
              <div className="flex items-center space-x-3 pb-4 border-b">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FolderOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Select Project</h2>
                  <p className="text-sm text-gray-500">
                    {projects.length} project{projects.length !== 1 ? 's' : ''} available
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loading size="md" />
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No projects found</p>
                  <Button onClick={() => navigate('/project/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div
                      key={project.project_key || project.id}
                      onClick={() => setSelectedProject(project)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedProject?.id === project.id ||
                        selectedProject?.project_key === project.project_key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h3 className="font-semibold text-gray-900">
                        {project.project_name || project.name}
                      </h3>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        {project.organization_name && (
                          <p>Organization: {project.organization_name}</p>
                        )}
                        {project.legacy_technology && Array.isArray(project.legacy_technology) && (
                          <p>
                            Technologies:{' '}
                            {project.legacy_technology.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedProject && (
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleStartTransform}
                    disabled={starting}
                    className="w-full"
                  >
                    {starting ? (
                      <Loading size="sm" className="mr-2" />
                    ) : (
                      <ArrowRight className="w-4 h-4 mr-2" />
                    )}
                    Start Modernization Workflow
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Recent Transforms */}
          <div className="space-y-6">
            <Card className="space-y-4">
              <div className="flex items-center space-x-3 pb-4 border-b">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <History className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Recent</h2>
                  <p className="text-sm text-gray-500">
                    {transforms.length} workflow{transforms.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {transforms.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No recent workflows
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {transforms.slice(0, 5).map((transform) => (
                    <div
                      key={transform.transform_id}
                      className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition"
                      onClick={() => {
                        setSelectedProject({
                          name: transform.project_name,
                          project_name: transform.project_name,
                        });
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">
                            {transform.project_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Step {transform.current_step || 0}/4
                          </p>
                        </div>
                        {getStatusBadge(
                          transform.step_4_status === 'completed' ? 'completed'
                            : [transform.step_1_status, transform.step_2_status, transform.step_3_status, transform.step_4_status].includes('running') ? 'running'
                            : [transform.step_1_status, transform.step_2_status, transform.step_3_status, transform.step_4_status].includes('failed') ? 'failed'
                            : 'running'
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(transform.created_at).toLocaleDateString()}
                      </p>
                      {transform.step_4_status === 'completed' && transform.step_4_job_id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/transform/result/${encodeURIComponent(transform.project_name)}`, {
                              state: { projectName: transform.project_name },
                            });
                          }}
                          className="mt-2 w-full text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg py-1.5 transition-colors"
                        >
                          View Results →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Workflow Overview */}
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">4-Step Workflow</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { num: 1, title: 'Structure & Language' },
              { num: 2, title: 'Analysis (Simple)' },
              { num: 3, title: 'Analysis (User Input)' },
              { num: 4, title: 'Modernization' },
            ].map((step, idx) => (
              <div key={step.num} className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-blue-600">{step.num}</span>
                  {idx < 3 && <ArrowRight className="w-4 h-4 text-blue-400" />}
                </div>
                <p className="text-sm font-medium text-gray-900">{step.title}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Supported Languages & Frameworks */}
        <Card className="p-6">
          <LanguageFrameworkGrid />
        </Card>
      </div>

    </DashboardLayout>
  );
};
