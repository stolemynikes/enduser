import { Routes, Route, Navigate } from 'react-router-dom';
import Form from '../pages/Form.tsx';
import AdminLogin from '../pages/AdminLogin.tsx';
import Dashboard from '../pages/Dashboard.tsx';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('adminToken');
  return token ? <>{children}</> : <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Form />} />
      <Route path="/form" element={<Form />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
    </Routes>
  );
}
