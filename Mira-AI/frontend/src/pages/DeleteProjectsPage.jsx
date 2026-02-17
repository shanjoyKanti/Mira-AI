import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  useGetRecentProjectsQuery,
  useDeleteProjectMutation,
} from '../store/slices/projectsApiSlice';
import {
  Trash2, Loader2, AlertCircle, Search, FolderOpen, Building2, Calendar,
  CheckSquare, Square, AlertTriangle,
} from 'lucide-react';

const getProjectId = (p) => p?.id ?? p?.project_id ?? p?._id ?? null;

export const DeleteProjectsPage = () => {
  const { data: projectsData, isLoading, isError, error, refetch } = useGetRecentProjectsQuery();
  const [deleteProject] = useDeleteProjectMutation();

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const projects = projectsData?.projects || projectsData || [];

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => {
      return (
        p.project_name?.toLowerCase().includes(q) ||
        p.organization_name?.toLowerCase().includes(q) ||
        p.industry?.toLowerCase().includes(q) ||
        p.legacy_technology?.some?.((t) => String(t).toLowerCase().includes(q))
      );
    });
  }, [projects, searchQuery]);

  const selectableIds = useMemo(
    () => filteredProjects.map(getProjectId).filter(Boolean).map(String),
    [filteredProjects]
  );
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const someSelected = selectableIds.some((id) => selectedIds.has(id)) && !allSelected;

  const toggleOne = (project) => {
    const pid = getProjectId(project);
    if (!pid) return;
    const key = String(pid);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        selectableIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      selectableIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedProjects = useMemo(
    () => projects.filter((p) => selectedIds.has(String(getProjectId(p)))),
    [projects, selectedIds]
  );

  const runDelete = async () => {
    if (selectedProjects.length === 0) return;
    setIsDeleting(true);
    let ok = 0;
    let failed = 0;
    const failures = [];
    for (const p of selectedProjects) {
      const pid = getProjectId(p);
      if (!pid) {
        failed += 1;
        failures.push(`${p.project_name || 'Unnamed'} (no server id)`);
        continue;
      }
      try {
        await deleteProject(pid).unwrap();
        ok += 1;
      } catch (err) {
        failed += 1;
        const detail = err?.data?.detail || err?.error || 'Request failed';
        failures.push(`${p.project_name || pid}: ${detail}`);
      }
    }
    setIsDeleting(false);
    setConfirmOpen(false);
    clearSelection();
    refetch?.();
    if (ok > 0 && failed === 0) {
      toast.success(`Deleted ${ok} project${ok === 1 ? '' : 's'}`);
    } else if (ok > 0 && failed > 0) {
      toast(`Deleted ${ok}, failed ${failed}.`, { icon: '⚠️' });
      failures.forEach((f) => toast.error(f));
    } else {
      toast.error(`Failed to delete ${failed} project${failed === 1 ? '' : 's'}`);
      failures.forEach((f) => toast.error(f));
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Delete Projects</h1>
            <p className="text-gray-600">
              Select one or more projects and delete them. This also removes their analysis reports and cannot be undone.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => refetch?.()} disabled={isLoading}>
              Refresh
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={selectedProjects.length === 0 || isDeleting}
              className="!bg-red-600 !hover:bg-red-700 !text-white"
            >
              <div className="flex items-center">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected ({selectedProjects.length})
              </div>
            </Button>
          </div>
        </div>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, organization, technology..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={toggleAll}
                disabled={selectableIds.length === 0}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-40"
              >
                {allSelected ? (
                  <CheckSquare className="w-5 h-5 text-red-600" />
                ) : someSelected ? (
                  <CheckSquare className="w-5 h-5 text-red-300" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
                {allSelected ? 'Unselect all' : 'Select all'}
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : isError ? (
              <div className="text-center py-12 border-2 border-dashed border-red-200 rounded-lg bg-red-50">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load projects</h3>
                <p className="text-gray-600 mb-4">
                  {error?.data?.detail || 'Unable to fetch projects. Please try again.'}
                </p>
                <Button onClick={() => refetch?.()}>Retry</Button>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <FolderOpen className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects to delete</h3>
                <p className="text-gray-600">You don't have any projects yet.</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <Search className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches</h3>
                <p className="text-gray-600 mb-3">No projects match "{searchQuery}"</p>
                <Button variant="secondary" onClick={() => setSearchQuery('')}>Clear search</Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {filteredProjects.map((project, index) => {
                  const pid = getProjectId(project);
                  const key = pid ? String(pid) : `noid-${index}`;
                  const isChecked = pid ? selectedIds.has(String(pid)) : false;
                  const disabled = !pid;
                  return (
                    <div
                      key={key}
                      onClick={() => !disabled && toggleOne(project)}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        disabled
                          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                          : isChecked
                          ? 'border-red-400 bg-red-50 cursor-pointer'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {isChecked ? (
                            <CheckSquare className="w-6 h-6 text-red-600" />
                          ) : (
                            <Square className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isChecked ? 'bg-red-100' : 'bg-gray-100'
                          }`}
                        >
                          <FolderOpen
                            className={`w-5 h-5 ${isChecked ? 'text-red-600' : 'text-gray-400'}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {project.project_name || '(unnamed project)'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                            {project.organization_name && (
                              <span className="flex items-center">
                                <Building2 className="w-4 h-4 mr-1" />
                                {project.organization_name}
                              </span>
                            )}
                            {project.legacy_technology?.length > 0 && (
                              <span className="uppercase text-xs tracking-wide">
                                {project.legacy_technology.join(', ')}
                              </span>
                            )}
                            {project.created_at && (
                              <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {new Date(project.created_at).toLocaleDateString()}
                              </span>
                            )}
                            {disabled && (
                              <span className="text-xs text-orange-600 font-medium">
                                no server id, cannot delete
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !isDeleting && setConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Delete {selectedProjects.length} project{selectedProjects.length === 1 ? '' : 's'}?
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  This will permanently remove the selected projects and all of their analysis reports.
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto mb-4 border border-gray-200 rounded-lg divide-y divide-gray-100">
              {selectedProjects.map((p, i) => (
                <div key={getProjectId(p) ?? i} className="px-3 py-2 text-sm text-gray-800 truncate">
                  {p.project_name || '(unnamed project)'}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={runDelete}
                disabled={isDeleting}
                className="!bg-red-600 !hover:bg-red-700 !text-white"
              >
                <div className="flex items-center">
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  {isDeleting ? 'Deleting...' : 'Delete permanently'}
                </div>
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DeleteProjectsPage;

// Updated by Arafat Uddin on 2026-05-17
// Added: New feature implementation
