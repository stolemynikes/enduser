import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ToastProvider } from './components/Toast.tsx';
import { ConfirmProvider } from './components/ConfirmDialog.tsx';

// The buyer's form is what an ordinary visitor loads, and it was arriving in one
// bundle with both dashboards, the setup wizard and GSAP — roughly a megabyte
// of code for a page that asks eight questions. Everything behind a sign-in is
// split out, so the form carries only itself.
//
// Eagerly imported: the form, the page a buyer returns to after verifying, and
// the seller sign-in. Those are first paint for somebody arriving cold, and a
// spinner there would be worse than the bytes.
import Form from '../pages/Form.tsx';
import VerificationComplete from '../pages/VerificationComplete.tsx';
import CompanyLogin from '../pages/CompanyLogin.tsx';

// Split too: the admin sign-in is a page only platform staff ever open, so
// there is no reason for it to sit in what a buyer downloads.
const AdminLogin = lazy(() => import('../pages/AdminLogin.tsx'));
const LandingPage = lazy(() => import('../pages/LandingPage.tsx'));
const Dashboard = lazy(() => import('../pages/Dashboard.tsx'));
const CompanyDashboard = lazy(() => import('../pages/CompanyDashboard.tsx'));
const CompanyRegister = lazy(() => import('../pages/CompanyRegister.tsx'));
const AcceptInvite = lazy(() => import('../pages/AcceptInvite.tsx'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword.tsx'));
const ResetPassword = lazy(() => import('../pages/ResetPassword.tsx'));
const VerifyEmail = lazy(() => import('../pages/VerifyEmail.tsx'));
const HowItWorks = lazy(() => import('../pages/HowItWorks.tsx'));
const Docs = lazy(() => import('../pages/legal/Docs.tsx'));
const Privacy = lazy(() => import('../pages/legal/Privacy.tsx'));
const Terms = lazy(() => import('../pages/legal/Terms.tsx'));
const Dpa = lazy(() => import('../pages/legal/Dpa.tsx'));
const NotFound = lazy(() => import('../pages/NotFound.tsx'));

/**
 * What a split route shows while its chunk arrives.
 *
 * Deliberately almost nothing: on a fast connection the chunk is there before
 * this would be seen, and a spinner that flashes for 80ms reads as jank rather
 * than as progress. It carries a live region so a screen reader is told that
 * something is happening, which a bare blank div would not.
 */
function RouteLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ minHeight: '100vh', background: '#0f0f10' }}
    >
      <span style={{
        position: 'absolute', width: 1, height: 1, overflow: 'hidden',
        clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
      }}>
        Loading
      </span>
    </div>
  );
}

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
    <Suspense fallback={<RouteLoading />}>
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/form" element={<Form />} />
      <Route path="/form/:slug" element={<FormSlugRedirect />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/verification-complete" element={<VerificationComplete />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/dpa" element={<Dpa />} />
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
      {/* Anything deeper than one segment cannot be a form. */}
      <Route path="*" element={<NotFound />} />
    </Routes>
      </Suspense>
    </ConfirmProvider>
    </ToastProvider>
  );
}
