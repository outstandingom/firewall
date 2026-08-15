import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SiteProvider, useSite } from './contexts/SiteContext';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Pages
import Login from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Sites } from './pages/Sites';
import { SiteDetail } from './pages/SiteDetail';
import { Traffic } from './pages/Traffic';
import { Sessions } from './pages/Sessions';
import { ApiMonitor } from './pages/ApiMonitor';
import { Errors } from './pages/Errors';
import { Performance } from './pages/Performance';
import { Anomalies } from './pages/Anomalies';
import { Alerts } from './pages/Alerts';
import { Settings } from './pages/Settings';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  
  if (authLoading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-950"><LoadingSpinner size={48} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
}

function SiteRequiredRoute({ children }: { children: React.ReactNode }) {
  const { currentSite, loading: siteLoading } = useSite();
  
  if (siteLoading) return <div className="h-full flex items-center justify-center"><LoadingSpinner size={32} /></div>;
  if (!currentSite) return <Navigate to="/sites" replace />;
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <PrivateRoute>
          <SiteProvider>
            <Layout />
          </SiteProvider>
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="sites" element={<Sites />} />
        <Route path="sites/:id" element={<SiteDetail />} />
        
        <Route path="dashboard" element={<SiteRequiredRoute><Dashboard /></SiteRequiredRoute>} />
        <Route path="traffic" element={<SiteRequiredRoute><Traffic /></SiteRequiredRoute>} />
        <Route path="sessions" element={<SiteRequiredRoute><Sessions /></SiteRequiredRoute>} />
        <Route path="api-monitor" element={<SiteRequiredRoute><ApiMonitor /></SiteRequiredRoute>} />
        <Route path="errors" element={<SiteRequiredRoute><Errors /></SiteRequiredRoute>} />
        <Route path="performance" element={<SiteRequiredRoute><Performance /></SiteRequiredRoute>} />
        <Route path="anomalies" element={<SiteRequiredRoute><Anomalies /></SiteRequiredRoute>} />
        <Route path="alerts" element={<SiteRequiredRoute><Alerts /></SiteRequiredRoute>} />
        <Route path="settings" element={<SiteRequiredRoute><Settings /></SiteRequiredRoute>} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
