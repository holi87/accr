import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/client/LandingPage';
import FormPage from './pages/client/FormPage';
import ConfirmationPage from './pages/client/ConfirmationPage';
import TrackingPage from './pages/client/TrackingPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminSetup from './pages/admin/AdminSetup';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import SubmissionsList from './pages/admin/SubmissionsList';
import SubmissionDetail from './pages/admin/SubmissionDetail';
import FormEditor from './pages/admin/FormEditor';
import Settings from './pages/admin/Settings';
import Users from './pages/admin/Users';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/form" element={<FormPage />} />
      <Route path="/confirmation/:id" element={<ConfirmationPage />} />
      <Route path="/track/:token" element={<TrackingPage />} />

      {/* Admin */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/setup" element={<AdminSetup />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="submissions" element={<SubmissionsList />} />
        <Route path="submissions/:id" element={<SubmissionDetail />} />
        <Route path="form-editor" element={<FormEditor />} />
        <Route path="settings" element={<Settings />} />
        <Route path="users" element={<Users />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
