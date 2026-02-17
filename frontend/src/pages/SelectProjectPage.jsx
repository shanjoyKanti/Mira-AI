import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useGetRecentProjectsQuery, useDeleteProjectMutation } from '../store/slices/projectsApiSlice';
import { FolderOpen, AlertCircle, Plus, ChevronRight, CheckCircle2, Calendar, Building2, Search, Trash2, Loader2 } from 'lucide-react';

export const SelectProjectPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Determine the flow type from URL or state
    const isComplianceReport = location.pathname.includes('report') || location.state?.flow === 'compliance';
    const flowType = isComplianceReport ? 'compliance' : 'analysis';

    const [selectedProject, setSelectedProject] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    // Fetch projects from API
    const { data: projectsData, isLoading, isError, error } = useGetRecentProjectsQuery();
    const [deleteProject] = useDeleteProjectMutation();

    const getProjectId = (p) => p?.id ?? p?.project_id ?? p?._id ?? null;

    const handleDeleteProject = async (e, project) => {
        e.stopPropagation();
        const pid = getProjectId(project);
        const name = project.project_name || 'this project';
        if (!pid) {
            window.alert(`Cannot delete "${name}" - project has no server id. Please refresh and try again.`);
            return;
        }
        const confirmed = window.confirm(
            `Delete "${name}"? This will also delete all analysis reports and cannot be undone.`
        );
        if (!confirmed) return;
        try {
            setDeletingId(pid);
            await deleteProject(pid).unwrap();
            if (selectedProject && String(getProjectId(selectedProject)) === String(pid)) {
                setSelectedProject(null);
            }
        } catch (err) {
            const detail = err?.data?.detail || err?.error || 'Failed to delete project.';
            window.alert(detail);
        } finally {
            setDeletingId(null);
        }
    };
    const projects = projectsData?.projects || projectsData || [];
    // Filter projects based on search query
    const filteredProjects = projects.filter(project => {
        const query = searchQuery.toLowerCase();
        return (
            project.project_name?.toLowerCase().includes(query) ||
            project.organization_name?.toLowerCase().includes(query) ||
            project.legacy_technology?.some(tech => tech.toLowerCase().includes(query)) ||
            project.industry?.toLowerCase().includes(query)
        );
    });


    const handleContinue = () => {
        if (!selectedProject) return;

        if (flowType === 'analysis') {
            // Navigate to repo page (Step 2 of analysis)
            //   navigate('/analysis/repo', { state: selectedProject });
            navigate('/analysis/analysis-reports', { state: selectedProject });
        } else {
            // Navigate to compliance report wizard (skipping Step 1)
            navigate('/new-report', { state: { project: selectedProject, skipProjectSetup: true } });
        }
    };

    const getTitle = () => {
        return flowType === 'analysis' ? 'Analyze Project' : 'Compliance Report';
    };

    const getDescription = () => {
        return flowType === 'analysis'
            ? 'Select a project to start analysis'
            : 'Select a project to generate compliance report';
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {getTitle()}
                    </h1>
                    <p className="text-gray-600">
                        {getDescription()}
                    </p>
                </div>

                <Card>
                    <div className="p-6">
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <FolderOpen className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900">Your Projects</h2>
                                        <p className="text-sm text-gray-500">
                                            {projects.length > 0 ? `${projects.length} project${projects.length !== 1 ? 's' : ''} available` : 'No projects yet'}
                                        </p>
                                    </div>
                                </div>
                                <Button onClick={() => navigate('/project/new')}>
                                    <div className="flex items-center">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Project
                                    </div>
                                </Button>
                            </div>

                            {projects.length > 0 && (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search projects by name, organization, technology, or industry..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : isError ? (
                            <div className="text-center py-12 border-2 border-dashed border-red-200 rounded-lg bg-red-50">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Projects</h3>
                                <p className="text-gray-600 mb-6">
                                    {error?.data?.detail || 'Unable to fetch projects. Please try again.'}
                                </p>
                                <Button onClick={() => window.location.reload()}>Retry</Button>
                            </div>
                        ) : projects.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertCircle className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Projects Found</h3>
                                <p className="text-gray-600 mb-6">
                                    Create your first project to get started with analysis and modernization.
                                </p>
                                <Button onClick={() => navigate('/project/new')}>
                                    <div className="flex items-center">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Project
                                    </div>
                                </Button>
                            </div>
                        ) : (
                            <>
                                {filteredProjects.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                                        <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
                                        <p className="text-gray-600 mb-4">
                                            No projects match your search "{searchQuery}"
                                        </p>
                                        <Button variant="secondary" onClick={() => setSearchQuery('')}>
                                            Clear Search
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3 mb-6  max-h-96 overflow-y-auto p-3 rounded-lg">
                                        {filteredProjects.map((project, index) => {
                                            const isSelected = selectedProject != null && (
                                                (project.id != null && selectedProject.id != null && String(project.id) === String(selectedProject.id)) ||
                                                (project.id == null && selectedProject.id == null && project.project_name === selectedProject.project_name)
                                            );
                                            
                                            return (
                                            <div
                                                key={project.id ?? `project-${index}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedProject(project);
                                                }}
                                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${isSelected
                                                        ? 'border-primary-500 bg-primary-50'
                                                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-4 flex-1">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary-100' : 'bg-gray-100'
                                                            }`}>
                                                            <FolderOpen className={`w-5 h-5 ${isSelected ? 'text-primary-600' : 'text-gray-400'
                                                                }`} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="text-base font-semibold text-gray-900 mb-1">
                                                                {project.project_name}
                                                            </h3>
                                                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                                                                {project.organization_name && (
                                                                    <span className="flex items-center">
                                                                        <Building2 className="w-4 h-4 mr-1" />
                                                                        {project.organization_name}
                                                                    </span>
                                                                )}
                                                                {project.legacy_technology && project.legacy_technology.length > 0 && (
                                                                    <span className="uppercase">{project.legacy_technology.join(', ')}</span>
                                                                )}
                                                                {project.created_at && (
                                                                    <span className="flex items-center">
                                                                        <Calendar className="w-4 h-4 mr-1" />
                                                                        {new Date(project.created_at).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                                        {isSelected && (
                                                            <CheckCircle2 className="w-6 h-6 text-primary-600" />
                                                        )}
                                                        {(() => {
                                                            const pid = getProjectId(project);
                                                            const isDeleting = deletingId && String(deletingId) === String(pid);
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleDeleteProject(e, project)}
                                                                    disabled={isDeleting}
                                                                    title="Delete project"
                                                                    aria-label={`Delete ${project.project_name}`}
                                                                    className="p-2 rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                                                >
                                                                    {isDeleting ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                    ) : (
                                                                        <Trash2 className="w-4 h-4" />
                                                                    )}
                                                                </button>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                )}

                                {selectedProject && (
                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Project Details</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-500">Industry:</span>
                                                <span className="ml-2 text-gray-900 capitalize">{selectedProject.industry || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Project Type:</span>
                                                <span className="ml-2 text-gray-900 capitalize">{selectedProject.project_type || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">LLM Option:</span>
                                                <span className="ml-2 text-gray-900">
                                                    {selectedProject.llm_provider === 'onprem'
                                                        ? 'On-Prem Hosted LLM'
                                                        : 'Commercial API'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <Button
                                        onClick={handleContinue}
                                        disabled={!selectedProject}
                                        size="lg"
                                    >
                                        <div className="flex items-center">
                                            Continue
                                            <ChevronRight className="w-5 h-5 ml-2" />
                                        </div>
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default SelectProjectPage;
