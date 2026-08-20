import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ToastProvider } from './components/Toast.tsx';
import { ConfirmProvider } from './components/ConfirmDialog.tsx';
import LandingPage from '../pages/LandingPage.tsx';
import Form from '../pages/Form.tsx';
import AdminLogin from '../pages/AdminLogin.tsx';
import Dashboard from '../pages/Dashboard.tsx';
import VerificationComplete from '../pages/VerificationComplete.tsx';
import CompanyRegister from '../pages/CompanyRegister.tsx';
import CompanyLogin from '../pages/CompanyLogin.tsx';
import CompanyDashboard from '../pages/CompanyDashboard.tsx';
import AcceptInvite from '../pages/AcceptInvite.tsx';
import ForgotPassword from '../pages/ForgotPassword.tsx';
import ResetPassword from '../pages/ResetPassword.tsx';
import VerifyEmail from '../pages/VerifyEmail.tsx';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('adminToken');
  return token ? <>{children}</> : <Navigate to="/admin" replace />;
}

function CompanyRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('companyToken');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

// Old share links used /form/:slug — forms now live at the root.
function FormSlugRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/${slug}`} replace />;
}

export default function App() {
  return (
    <ToastProvider>
    <ConfirmProvider>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/form" element={<Form />} />
      <Route path="/form/:slug" element={<FormSlugRedirect />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/verification-complete" element={<VerificationComplete />} />
      {/* Embeddable form: the same form, chrome-free, for an iframe on the
          seller's own website. Kept above the /:slug catch-all. */}
      <Route path="/embed/:slug" element={<Form embed />} />
      <Route path="/register" element={<CompanyRegister />} />
      <Route path="/login" element={<CompanyLogin />} />
      <Route path="/company/dashboard" element={
        <CompanyRoute><CompanyDashboard /></CompanyRoute>
      } />
      <Route path="/invite/:token" element={<AcceptInvite />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/reset/:token" element={<ResetPassword />} />
      <Route path="/verify/:token" element={<VerifyEmail />} />
      {/* Public company forms live at the root — keep this route last. */}
      <Route path="/:slug" element={<Form />} />
    </Routes>
    </ConfirmProvider>
    </ToastProvider>
  );
}
