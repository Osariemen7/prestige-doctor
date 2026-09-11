import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { isAuthenticated, tryRestoreSession } from './api';
import { loginForPath, safeDoctorPath } from './pwa/safePath';
import PwaStatus from './pwa/PwaStatus';
const DoctorAuth = lazy(() => import('./components/DoctorAuth'));
const DoctorVNextApp = lazy(() => import('./vnext/DoctorVNextApp'));
const LegacyWorkspace = lazy(() => import('./pwa/LegacyWorkspace'));
const Loading = () => <div className="doctor-loading" role="status">Preparing your workspace…</div>;
function ProtectedRoute({ children }) {
  const location = useLocation();
  return isAuthenticated() ? children : <Navigate to={loginForPath(`${location.pathname}${location.search}${location.hash}`)} replace />;
}
function PublicRoute() {
  const location = useLocation();
  return isAuthenticated() ? <Navigate to={safeDoctorPath(new URLSearchParams(location.search).get('next'))} replace /> : <DoctorAuth />;
}
function CaseRedirect() { const { publicId } = useParams(); return <Navigate to={`/app/cases/${encodeURIComponent(publicId)}`} replace />; }
function PatientRedirect() { const { patientId } = useParams(); return <Navigate to={`/app/patients/${encodeURIComponent(patientId)}`} replace />; }
function ConversationRedirect() { const { conversationId } = useParams(); return <Navigate to={conversationId ? `/app/messages/${encodeURIComponent(conversationId)}` : '/app/messages'} replace />; }
export default function App() {
  const [ready, setReady] = useState(false);
  const location = useLocation(); const navigate = useNavigate();
  useEffect(() => { let active = true; tryRestoreSession().catch(() => false).finally(() => { if (active) setReady(true); }); return () => { active = false; }; }, []);
  useEffect(() => { const expired = () => navigate(loginForPath(`${location.pathname}${location.search}${location.hash}`), { replace: true }); window.addEventListener('doctor-auth-required', expired); return () => window.removeEventListener('doctor-auth-required', expired); }, [location, navigate]);
  return <><PwaStatus />{!ready ? <Loading /> : <Suspense fallback={<Loading />}><Routes>
    {['/login', '/register', '/register/:referralCode', '/doctor-register', '/doctor-login'].map((path) => <Route key={path} path={path} element={<PublicRoute />} />)}
    <Route path="/app/diagnostics/*" element={<ProtectedRoute><LegacyWorkspace /></ProtectedRoute>} />
    <Route path="/app/*" element={<ProtectedRoute><DoctorVNextApp /></ProtectedRoute>} />
    {process.env.NODE_ENV !== 'production' && <Route path="/demo/doctor" element={<DoctorVNextApp demo />} />}
    {['/reviews/:publicId', '/review/:publicId', '/record/:publicId'].map((path) => <Route key={path} path={path} element={<CaseRedirect />} />)}
    {['/patient/:patientId', '/patient/:patientId/media'].map((path) => <Route key={path} path={path} element={<PatientRedirect />} />)}
    {['/care/:conversationId', '/care-coordinator/:conversationId', '/messages/:conversationId'].map((path) => <Route key={path} path={path} element={<ConversationRedirect />} />)}
    {['/care', '/care-coordinator', '/messages'].map((path) => <Route key={path} path={path} element={<Navigate to="/app/messages" replace />} />)}
    {['/work', '/investigations/*', '/clinical-services/*'].map((path) => <Route key={path} path={path} element={<Navigate to="/app/diagnostics" replace />} />)}
    <Route path="*" element={<Navigate to="/app/queue" replace />} />
  </Routes></Suspense>}</>;
}
