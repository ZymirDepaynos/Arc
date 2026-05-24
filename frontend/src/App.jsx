import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import DebtorDetail from './pages/DebtorDetail';
import CalendarView from './pages/CalendarView';


export default function App() {
  return (
    <BrowserRouter>
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
      <div className="app-layout">
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/debtor/:id" element={<DebtorDetail />} />
            <Route path="/calendar" element={<CalendarView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
