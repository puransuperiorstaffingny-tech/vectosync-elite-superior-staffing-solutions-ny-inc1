import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import TimeTracking from './pages/TimeTracking';
import Timesheets from './pages/Timesheets';
import Payroll from './pages/Payroll';
import Geofencing from './pages/Geofencing';
import Reports from './pages/Reports';
import MyTimecard from './pages/MyTimecard';
import ThemeSettings from './pages/ThemeSettings';
import DocumentDesigner from './pages/DocumentDesigner';
import EmployeePortal from './pages/EmployeePortal';
import EmployeeSelfServicePortal from './pages/EmployeeSelfServicePortal';
import HRDocuments from './pages/HRDocuments';
import EmployeeRequests from './pages/EmployeeRequests';
import PayrollDashboard from './pages/PayrollDashboard';
import PayrollPayouts from './pages/PayrollPayouts';
import Scheduling from './pages/Scheduling';
import MyPay from './pages/MyPay';
import Onboarding from './pages/Onboarding';
import PerformanceReviews from './pages/PerformanceReviews';
import TrainingLibrary from './pages/TrainingLibrary';
import TrainingDashboard from './pages/TrainingDashboard';
import MyTraining from './pages/MyTraining';
import QuickBooksImport from './pages/QuickBooksImport';
import Expenses from './pages/Expenses';
import ExpenseApproval from './pages/ExpenseApproval';
import EmailNotifications from './pages/EmailNotifications';
import DocumentUploadPortal from './pages/DocumentUploadPortal';
import OrgStructure from './pages/OrgStructure';
import Form1099Management from './pages/Form1099Management';
import CompanyProfile from './pages/CompanyProfile';
import LiveChat from './pages/LiveChat';
import EmployeeSelfService from './pages/EmployeeSelfService';
import TrainingManual from './pages/TrainingManual';
import TrainingCenter from './pages/TrainingCenter';
import AdminWorkspace from './pages/AdminWorkspace';
import PayrollSimulator from './pages/PayrollSimulator';
import AdminCalculator from './pages/AdminCalculator';
import Clients from './pages/Clients';
import Invoicing from './pages/Invoicing';
import BillingTemplates from './pages/BillingTemplates';
import MyAppearance from './pages/MyAppearance';
import AdminControlCenter from './pages/AdminControlCenter';
import AdminCalendar from './pages/AdminCalendar';
import RapidPayExport from './pages/RapidPayExport';
import RapidFunding from './pages/RapidFunding';
import RapidExportStatus from './pages/RapidExportStatus';
import PayrollVariance from './pages/PayrollVariance';
import PgpKeyManager from './pages/PgpKeyManager';
import ReceptionDesk from './pages/ReceptionDesk';
import AchPayrollDashboard from './pages/AchPayrollDashboard';
import MyBankAccount from './pages/MyBankAccount';
import AdminPermissions from './pages/AdminPermissions';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Admin-only routes */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/time-tracking" element={<TimeTracking />} />
        <Route path="/timesheets" element={<Timesheets />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/payroll-payouts" element={<PayrollPayouts />} />
        <Route path="/rapid-pay-export" element={<RapidPayExport />} />
        <Route path="/rapid-funding" element={<RapidFunding />} />
        <Route path="/rapid-export-status" element={<RapidExportStatus />} />
        <Route path="/payroll-variance" element={<PayrollVariance />} />
        <Route path="/pgp-keys" element={<PgpKeyManager />} />
        <Route path="/geofencing" element={<Geofencing />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/my-timecard" element={<MyTimecard />} />
        <Route path="/theme" element={<ThemeSettings />} />
        <Route path="/document-designer" element={<DocumentDesigner />} />
        <Route path="/hr-documents" element={<HRDocuments />} />
        <Route path="/employee-requests" element={<EmployeeRequests />} />
        <Route path="/payroll-dashboard" element={<PayrollDashboard />} />
        <Route path="/scheduling" element={<Scheduling />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/performance-reviews" element={<PerformanceReviews />} />
        <Route path="/training-library" element={<TrainingLibrary />} />
        <Route path="/training-dashboard" element={<TrainingDashboard />} />
        <Route path="/quickbooks-import" element={<QuickBooksImport />} />
        <Route path="/expense-approval" element={<ExpenseApproval />} />
        <Route path="/email-notifications" element={<EmailNotifications />} />
        <Route path="/document-upload" element={<DocumentUploadPortal />} />
        <Route path="/org-structure" element={<OrgStructure />} />
        <Route path="/1099-management" element={<Form1099Management />} />
        <Route path="/company-profile" element={<CompanyProfile />} />
        <Route path="/live-chat" element={<LiveChat />} />
        <Route path="/training-manual" element={<TrainingManual />} />
        <Route path="/training-center" element={<TrainingCenter />} />
        <Route path="/admin-workspace" element={<AdminWorkspace />} />
        <Route path="/payroll-simulator" element={<PayrollSimulator />} />
        <Route path="/calculator" element={<AdminCalculator />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/invoicing" element={<Invoicing />} />
        <Route path="/billing-templates" element={<BillingTemplates />} />
        <Route path="/my-appearance" element={<MyAppearance />} />
        <Route path="/admin-control-center" element={<AdminControlCenter />} />
        <Route path="/calendar-view" element={<AdminCalendar />} />
        <Route path="/reception-desk" element={<ReceptionDesk />} />
        <Route path="/admin-permissions" element={<AdminPermissions />} />
        <Route path="/ach-payroll" element={<AchPayrollDashboard />} />
        
        {/* Employee-accessible routes */}
        <Route path="/employee-portal" element={<EmployeePortal />} />
        <Route path="/self-service" element={<EmployeeSelfService />} />
        <Route path="/my-payroll" element={<EmployeeSelfServicePortal />} />
        <Route path="/my-pay" element={<MyPay />} />
        <Route path="/my-bank-account" element={<MyBankAccount />} />
        <Route path="/my-training" element={<MyTraining />} />
        <Route path="/expenses" element={<Expenses />} />
        
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App