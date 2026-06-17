import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useInactivityTimer } from "./hooks/useInactivityTimer";
import { createContext, useContext, useState, useEffect } from "react";
import { ServerCrash, RefreshCw } from "lucide-react";

export const SessionContext = createContext({ updateTimeout: async () => {} });

import Dashboard from "./pages/Dashboard";
import CustomerDetail from "./pages/CustomerDetail";
import CalendarView from "./pages/CalendarView";
import ArchivePage from "./pages/ArchivePage";
import LoginPage from "./pages/LoginPage";

function InactivityGuard({ children }) {
  const { updateTimeout } = useInactivityTimer();
  return (
    <SessionContext.Provider value={{ updateTimeout }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-page)",
          color: "var(--text-muted)",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <InactivityGuard>{children}</InactivityGuard>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    const handleConnectionFailed = () => setConnectionError(true);
    window.addEventListener("connection-failed", handleConnectionFailed);
    return () => window.removeEventListener("connection-failed", handleConnectionFailed);
  }, []);

  if (connectionError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-page)",
          color: "var(--text-primary)",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{
          width: 80, height: 80, borderRadius: 20, 
          background: "rgba(255, 49, 49, 0.1)", color: "#FF3131",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 24
        }}>
          <ServerCrash size={40} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
          Connection Lost
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 400, marginBottom: 32, lineHeight: 1.6 }}>
          The app lost connection to the local database server. This can happen if the background process was killed unexpectedly.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 24px", height: 48, borderRadius: 12, fontSize: 14, fontWeight: 700 }}
        >
          <RefreshCw size={18} /> Restart App
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-page)",
          color: "var(--text-muted)",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <div className="app-layout">
              <main className="main-content">
                <Dashboard />
              </main>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/debtor/:id"
        element={<Navigate to="/customer/:id" replace />}
      />
      <Route
        path="/customer/:id"
        element={
          <ProtectedRoute>
            <div className="app-layout">
              <main className="main-content">
                <CustomerDetail />
              </main>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <div className="app-layout">
              <main className="main-content">
                <CalendarView />
              </main>
            </div>
          </ProtectedRoute>
        }
      />
      <Route
        path="/archive"
        element={
          <ProtectedRoute>
            <div className="app-layout">
              <main className="main-content">
                <ArchivePage />
              </main>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: "Montserrat, sans-serif",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "#18181B",
              color: "#FFFFFF",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              backdropFilter: "blur(10px)",
            },
            success: { iconTheme: { primary: "#39FF14", secondary: "#000" } },
            error: { iconTheme: { primary: "#FF3131", secondary: "#000" } },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}
