import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Dashboard from './pages/Dashboard';
import CustomerDetail from './pages/CustomerDetail';
import CalendarView from './pages/CalendarView';
import LoginPage from './pages/LoginPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-page)',
        color: 'var(--text-muted)',
        fontSize: 14,
        fontWeight: 600,
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-page)',
        color: 'var(--text-muted)',
        fontSize: 14,
        fontWeight: 600,
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><div className="app-layout"><main className="main-content"><Dashboard /></main></div></ProtectedRoute>} />
      <Route path="/debtor/:id" element={<ProtectedRoute><div className="app-layout"><main className="main-content"><CustomerDetail /></main></div></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><div className="app-layout"><main className="main-content"><CalendarView /></main></div></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: '#18181B',
              color: '#FFFFFF',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(10px)',
            },
            success: { iconTheme: { primary: '#39FF14', secondary: '#000' } },
            error: { iconTheme: { primary: '#FF3131', secondary: '#000' } },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
