import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import ErrorBoundary from './components/ErrorBoundary';
import LiveWallpaper from './components/LiveWallpaper';
import LandingPage from './pages/LandingPage';
import LoginScreen from './pages/LoginScreen';
import RegisterFlow from './pages/RegisterFlow';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AboutUsPage from './pages/AboutUsPage';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import PatientForm from './pages/PatientForm';
import CaseDetail from './pages/CaseDetail';
import SupportModal from './components/SupportModal';
import SystemOrchestration from './pages/SystemOrchestration';
import AgentFleet from './pages/AgentFleet';
import PatientRecord from './pages/PatientRecord';
import AgentLab from './pages/AgentLab';
import CaseAnalytics from './pages/CaseAnalytics';
import AdminDashboard from './pages/AdminDashboard';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import MessagesPage from './pages/MessagesPage';
import HealthMetricsPage from './pages/HealthMetricsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import PatientsPage from './pages/PatientsPage';
import PrescriptionsPage from './pages/PrescriptionsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import ClinicalNotesPage from './pages/ClinicalNotesPage';
import LabOrdersPage from './pages/LabOrdersPage';
import BillingPage from './pages/BillingPage';
import AdminRolesPage from './pages/AdminRolesPage';
import AdminProvidersPage from './pages/AdminProvidersPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import HealthAnalysisPage from './pages/HealthAnalysisPage';

function RoleGuard({ allow, children }) {
  const { user, isGuest } = useAuth();
  if (isGuest) return children;
  if (allow && user?.role && !allow.includes(user.role)) {
    const roleHome = user.role === 'admin' ? '/admin' : user.role === 'doctor' ? '/doctor' : '/patient';
    return <Navigate to={roleHome} replace />;
  }
  return children;
}

function GuestBanner() {
  const { exitGuestMode } = useAuth();
  return (
    <div className="guest-banner">
      <span>You're browsing in Free Access mode.</span>
      <button onClick={exitGuestMode}>Sign In for Full Access</button>
    </div>
  );
}

function AppShell() {
  const { isAuthenticated, isGuest, user } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterFlow />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/about" element={<AboutUsPage />} />
        <Route path="/health-analysis" element={<HealthAnalysisPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (isGuest) {
    return (
      <WebSocketProvider>
        <LiveWallpaper variant="cool" />
        <GuestBanner />
        <div style={{ height: '100vh', overflowY: 'auto', paddingTop: 48 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/submit" replace />} />
            <Route path="/submit" element={<PatientForm />} />
            <Route path="/health-analysis" element={<HealthAnalysisPage />} />
            <Route path="/cases/:caseId" element={<CaseDetail />} />
            <Route path="/record" element={<PatientRecord />} />
            <Route path="/analytics" element={<CaseAnalytics />} />
            <Route path="/fleet" element={<AgentFleet />} />
            <Route path="/lab" element={<AgentLab />} />
            <Route path="/orchestration" element={<SystemOrchestration />} />
            <Route path="/login" element={<Navigate to="/submit" replace />} />
            <Route path="*" element={<Navigate to="/submit" replace />} />
          </Routes>
        </div>
      </WebSocketProvider>
    );
  }

  const roleHome = user?.role === 'admin' ? '/admin' : user?.role === 'doctor' ? '/doctor' : '/patient';

  return (
    <Routes>
      <Route path="/login" element={<Navigate to={roleHome} replace />} />
      <Route path="/register" element={<Navigate to={roleHome} replace />} />
      <Route path="/forgot-password" element={<Navigate to={roleHome} replace />} />
      <Route path="/" element={<Navigate to={roleHome} replace />} />

      <Route path="/patient" element={
        <RoleGuard allow={['user', 'doctor', 'admin']}>
          <WebSocketProvider><PatientDashboard /></WebSocketProvider>
        </RoleGuard>
      } />
      <Route path="/doctor" element={
        <RoleGuard allow={['doctor', 'admin']}>
          <WebSocketProvider><DoctorDashboard /></WebSocketProvider>
        </RoleGuard>
      } />

      <Route path="*" element={
        <WebSocketProvider>
          <LiveWallpaper variant="default" />
          <div className="app-shell">
            <Sidebar />
            <div className="app-main">
              <Navbar />
              <main className="app-content">
                <Routes>
                  <Route path="/about" element={<AboutUsPage />} />
                  <Route path="/submit" element={<PatientForm />} />
                  <Route path="/health-analysis" element={<HealthAnalysisPage />} />
                  <Route path="/cases/:caseId" element={<CaseDetail />} />
                  <Route path="/record" element={<PatientRecord />} />
                  <Route path="/analytics" element={
                    <RoleGuard allow={['doctor', 'admin']}><CaseAnalytics /></RoleGuard>
                  } />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />

                  <Route path="/patients" element={
                    <RoleGuard allow={['doctor', 'admin']}><PatientsPage /></RoleGuard>
                  } />
                  <Route path="/appointments" element={<AppointmentsPage />} />
                  <Route path="/prescriptions" element={<PrescriptionsPage />} />
                  <Route path="/notes" element={
                    <RoleGuard allow={['doctor', 'admin']}><ClinicalNotesPage /></RoleGuard>
                  } />
                  <Route path="/lab-orders" element={
                    <RoleGuard allow={['doctor', 'admin']}><LabOrdersPage /></RoleGuard>
                  } />
                  <Route path="/messages" element={<MessagesPage />} />

                  <Route path="/health-metrics" element={<HealthMetricsPage />} />
                  <Route path="/billing" element={<BillingPage />} />

                  <Route path="/orchestration" element={
                    <RoleGuard allow={['doctor', 'admin']}><SystemOrchestration /></RoleGuard>
                  } />
                  <Route path="/fleet" element={
                    <RoleGuard allow={['doctor', 'admin']}><AgentFleet /></RoleGuard>
                  } />
                  <Route path="/lab" element={
                    <RoleGuard allow={['doctor', 'admin']}><AgentLab /></RoleGuard>
                  } />

                  <Route path="/admin" element={
                    <RoleGuard allow={['admin']}><AdminDashboard /></RoleGuard>
                  } />
                  <Route path="/admin/users" element={
                    <RoleGuard allow={['admin']}><AdminUsersPage /></RoleGuard>
                  } />
                  <Route path="/admin/roles" element={
                    <RoleGuard allow={['admin']}><AdminRolesPage /></RoleGuard>
                  } />
                  <Route path="/admin/audit" element={
                    <RoleGuard allow={['admin']}><AuditLogsPage /></RoleGuard>
                  } />
                  <Route path="/admin/providers" element={
                    <RoleGuard allow={['admin']}><AdminProvidersPage /></RoleGuard>
                  } />
                  <Route path="/admin/settings" element={
                    <RoleGuard allow={['admin']}><AdminSettingsPage /></RoleGuard>
                  } />

                  <Route path="*" element={<Navigate to={roleHome} replace />} />
                </Routes>
              </main>
            </div>
          </div>
        </WebSocketProvider>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
