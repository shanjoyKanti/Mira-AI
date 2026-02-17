import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Base query with auth token
const baseQueryWithAuth = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const projectsApi = createApi({
  reducerPath: 'projectsApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Projects', 'ProjectStats', 'AdminStats', 'SSHCredentials', 'Reports', 'Transforms'],
  endpoints: (builder) => ({
    // SSH Credentials
    getSSHCredentials: builder.query({
      query: () => '/ssh/credentials',
      providesTags: ['SSHCredentials'],
    }),
    saveSSHCredentials: builder.mutation({
      query: (credentials) => ({
        url: '/ssh/credentials',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['SSHCredentials'],
    }),
    deleteSSHCredentials: builder.mutation({
      query: () => ({
        url: '/ssh/credentials',
        method: 'DELETE',
      }),
      invalidatesTags: ['SSHCredentials'],
    }),
    testSSHConnection: builder.mutation({
      query: (credentials) => ({
        url: '/ssh/credentials/test',
        method: 'POST',
        body: credentials,
      }),
    }),
    testStoredSSHCredentials: builder.mutation({
      query: () => ({
        url: '/ssh/credentials/test-stored',
        method: 'POST',
      }),
    }),

    // Projects
    getAdminUsage: builder.query({
      query: () => '/admin/usage',
      providesTags: ['AdminStats'],
      keepUnusedDataFor: 60,
      // Always refetch when the usage page mounts so it isn't showing a stale
      // (or previous user's) cached snapshot.
      refetchOnMountOrArgChange: true,
    }),
    getAdminStats: builder.query({
      query: () => '/analyze/projects/stats',
      providesTags: ['AdminStats'],
      keepUnusedDataFor: 120,
      refetchOnMountOrArgChange: true,
    }),
    getProjectStats: builder.query({
      query: () => '/analyze/projects/stats',
      providesTags: ['ProjectStats'],
      keepUnusedDataFor: 300,
      // Refetch on mount so dashboard stat cards aren't stale after a migration
      // or (critically) showing a previous user's numbers after re-login.
      refetchOnMountOrArgChange: true,
    }),
    getRecentProjects: builder.query({
      query: () => '/analyze/projects/recent',
      refetchOnMountOrArgChange: true,
      providesTags: ['Projects'],
      keepUnusedDataFor: 300,
    }),
    createProject: builder.mutation({
      query: (projectData) => ({
        url: '/analyze/projects',
        method: 'POST',
        body: projectData,
      }),
      invalidatesTags: ['ProjectStats', 'Projects'],
    }),
    updateProject: builder.mutation({
      query: ({ id, data }) => ({
        url: `/analyze/projects/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['ProjectStats', 'Projects'],
    }),
    deleteProject: builder.mutation({
      query: (id) => ({
        url: `/analyze/projects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ProjectStats', 'Projects'],
    }),

    // Analysis & Reports
    runAnalysisScan: builder.mutation({
      query: (scanData) => ({
        url: '/analyze/scan',
        method: 'POST',
        body: scanData,
      }),
      invalidatesTags: ['Reports'],
    }),
    getReports: builder.query({
      query: () => '/analyze/reports',
      providesTags: ['Reports'],
    }),
    downloadReport: builder.query({
      query: (id) => `/analyze/reports/${id}/download`,
    }),
    viewReport: builder.query({
      query: (id) => `/analyze/reports/${id}/view`,
    }),

    // Transforms
    listTransforms: builder.query({
      query: () => '/agents/transforms',
      providesTags: ['Transforms'],
    }),
    runStep1: builder.mutation({
      query: (data) => ({
        url: '/agents/run-structure-language-and-version-upgradation',
        method: 'POST',
        body: data,
      }),
    }),
    checkStep1Status: builder.query({
      query: (job_id) => `/agents/run-structure-language-and-version-upgradation/status/${job_id}`,
      refetchInterval: 3000, // Poll every 3 seconds
    }),
    runStep2: builder.mutation({
      query: (data) => ({
        url: '/agents/run-upgrade-analysis-simple',
        method: 'POST',
        body: data,
      }),
    }),
    checkStep2Status: builder.query({
      query: (job_id) => `/agents/run-upgrade-analysis/status/${job_id}`,
      refetchInterval: 3000,
    }),
    runStep3: builder.mutation({
      query: (data) => ({
        url: '/agents/run-upgrade-analysis',
        method: 'POST',
        body: data,
      }),
    }),
    checkStep3Status: builder.query({
      query: (job_id) => `/agents/run-upgrade-analysis/status/${job_id}`,
      refetchInterval: 3000,
    }),
    runStep4: builder.mutation({
      query: (data) => ({
        url: '/agents/run-code-modernization',
        method: 'POST',
        body: data,
      }),
    }),
    checkStep4Status: builder.query({
      query: (job_id) => `/agents/run-code-modernization/status/${job_id}`,
      refetchInterval: 3000,
    }),
    securityTest: builder.mutation({
      query: (data) => ({
        url: '/agents/security-test',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  // SSH
  useGetSSHCredentialsQuery,
  useSaveSSHCredentialsMutation,
  useDeleteSSHCredentialsMutation,
  useTestSSHConnectionMutation,
  useTestStoredSSHCredentialsMutation,
  
  // Projects
  useGetAdminStatsQuery,
  useGetProjectStatsQuery,
  useGetRecentProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,

  // Analysis
  useRunAnalysisScanMutation,
  useGetReportsQuery,
  useDownloadReportQuery,
  useViewReportQuery,

  // Transforms
  useListTransformsQuery,
  useRunStep1Mutation,
  useCheckStep1StatusQuery,
  useRunStep2Mutation,
  useCheckStep2StatusQuery,
  useRunStep3Mutation,
  useCheckStep3StatusQuery,
  useRunStep4Mutation,
  useCheckStep4StatusQuery,
  useSecurityTestMutation,
  useGetAdminUsageQuery,
} = projectsApi;
