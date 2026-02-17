import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AnalysisProvider } from './contexts/AnalysisContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/accounts/LoginPage';
import { SignupPage } from './pages/accounts/SignupPage';
import { ForgotPasswordPage } from './pages/accounts/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { StackSelectionPage } from './pages/Conversion/StackSelectionPage';
import { ConversionPage } from './pages/Conversion/ConversionPage';
import { ModernizationPage } from './pages/Conversion/ModernizationPage';
import { TestingPage } from './pages/Conversion/TestingPage';
import { DownloadPage } from './pages/Conversion/DownloadPage';
import { TransformWorkflowPage } from './pages/Conversion/TransformWorkflowPage';
import { ReportTypesPage } from './pages/Analysis/ReportTypesPage';
import { SecurityScanPage } from './pages/Analysis/SecurityScanPage';
import { SecurityReportsPage } from './pages/Analysis/SecurityReportsPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { NewReportPage } from './pages/Reports/NewReportPage';
import { ReportOutput } from './pages/Reports/ReportOutput';
import { ReportView } from './pages/Reports/ReportView';
import { SettingsPage } from './pages/SettingsPage';
import { ReferenceGuidePage } from './pages/ReferenceGuidePage';
import { NewProjectPage } from './pages/project/NewProjectPage';
import { ProjectInfoPage } from './pages/project/ProjectInfoPage';
import { SelectProjectPage } from './pages/SelectProjectPage';
import { DeleteProjectsPage } from './pages/DeleteProjectsPage';
import { SelectProjectForTransformPage } from './pages/Conversion/SelectProjectForTransformPage';
import { AnalysisReportPage } from './pages/Analysis/AnalysisReportPage';
import { ContactPage } from './pages/ContactPage';
import { AdminUsagePage } from './pages/admin/AdminUsagePage';
import { ModernizationResultPage } from './pages/Conversion/ModernizationResultPage';
import { ModernizationResultsListPage } from './pages/Conversion/ModernizationResultsListPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnalysisProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route
              path="/admin/usage"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminUsagePage />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <PublicRoute>
                  <SignupPage />
                </PublicRoute>
              } 
            />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
              <ProtectedRoute>
                  <DashboardPage />
               </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
              <ProtectedRoute>
                  <SettingsPage />
               </ProtectedRoute>
              } 
            />
            <Route 
              path="/reference" 
              element={
              <ProtectedRoute>
                  <ReferenceGuidePage />
               </ProtectedRoute>
              } 
            />
            <Route 
              path="/project/new" 
              element={
              <ProtectedRoute>
                  <NewProjectPage />
               </ProtectedRoute>
              } 
            />
            <Route 
              path="/project/info" 
              element={
              <ProtectedRoute>
                  <ProjectInfoPage />
               </ProtectedRoute>
              } 
            />
            <Route 
              path="/analyze/select" 
              element={
               <ProtectedRoute>
                  <SelectProjectPage />
                </ProtectedRoute> 
              }          
            />
            <Route
              path="/report/select"
              element={
              <ProtectedRoute>
                  <SelectProjectPage />
               </ProtectedRoute>
              }
            />
            <Route
              path="/projects/delete"
              element={
                <ProtectedRoute>
                  <DeleteProjectsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transform/select"
              element={
              <ProtectedRoute>
                  <SelectProjectForTransformPage />
               </ProtectedRoute>
              }
            />
            <Route
              path="/transform/stack-selection"
              element={
              <ProtectedRoute>
                  <StackSelectionPage />
               </ProtectedRoute>
              }
            />
            <Route
              path="/transform/workflow"
              element={
              <ProtectedRoute>
                  <TransformWorkflowPage />
               </ProtectedRoute>
              } 
            />      
            <Route 
              path="/analysis/security-scan" 
              element={
              <ProtectedRoute>
                  <SecurityScanPage />
               </ProtectedRoute>
              } 
            />
            <Route 
              path="/analysis/analysis-reports" 
              element={
              <ProtectedRoute>
                  <AnalysisReportPage />
               </ProtectedRoute>
              } 
            />
            <Route 
              path="/analysis/security-reports" 
              element={
              <ProtectedRoute>
                  <SecurityReportsPage />
               </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/analysis/:id/stack-selection" 
              element={
              <ProtectedRoute>
                  <StackSelectionPage />
               </ProtectedRoute>
              } 
            />
            <Route 
              path="/analysis/:id/converting" 
              element={
              <ProtectedRoute>
                  <ConversionPage />
               </ProtectedRoute>
              } 
            />
            <Route 
              path="/analysis/:id/modernizing" 
              element={
              <ProtectedRoute>
                  <ModernizationPage />
               </ProtectedRoute>
              } 
            />
            <Route 
              path="/analysis/:id/testing" 
              element={
              <ProtectedRoute>
                  <TestingPage />
               </ProtectedRoute>
              } 
            />
            <Route 
              path="/analysis/:id/download" 
              element={
              <ProtectedRoute>
                  <DownloadPage />
               </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports" 
              element={
              <ProtectedRoute>
                  <ReportsPage />
               </ProtectedRoute>
              } 
            />
            <Route 
              path="/new-report" 
              element={
              <ProtectedRoute>
                  <NewReportPage />
               </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports/output" 
              element={
              <ProtectedRoute>
                  <ReportOutput />
               </ProtectedRoute>
              } 
            />
            <Route
              path="/reports/view/:reportId"
              element={
              <ProtectedRoute>
                  <ReportView />
               </ProtectedRoute>
              }
            />
            <Route
              path="/transform/results"
              element={
                <ProtectedRoute>
                  <ModernizationResultsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transform/result/:projectName"
              element={
                <ProtectedRoute>
                  <ModernizationResultPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnalysisProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
