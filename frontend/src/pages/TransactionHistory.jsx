import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Search, 
  Calendar as CalendarIcon, 
  Trash2, 
  Filter, 
  ChevronRight,
  Clock,
  User,
  History as HistoryIcon,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import MobileNav from '../components/MobileNav';

const fmt = (n) =>
  '₱' + parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const date = new Date(d);
    return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return '—'; }
};

export default function TransactionHistory() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('All'); // All, Recent, Payment, Created, Deleted
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  
  const API_URL = import.meta.env.VITE_API_URL || '';

  const fetchAllTransactions = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/debtors`);
      const allHistory = [];
      // clearedAt only applies to local-only logs (deleted records), NOT to real DB payment records
      const clearedAt = localStorage.getItem('arc_history_cleared_at') || 0;
      const hiddenIds = JSON.parse(localStorage.getItem('arc_hidden_transactions') || '[]');
      
      res.data.forEach(customer => {
        // --- Real payment entries from DB ---
        if (customer.payment_history) {
          customer.payment_history.forEach((p, idx) => {
            const tId = `${customer.id}-pay-${idx}`;
            // Use system created_at if available, otherwise fallback to payment date for legacy records
            const entryTime = p.created_at || p.date; 
            if (new Date(entryTime) > new Date(clearedAt) && !hiddenIds.includes(tId)) {
              allHistory.push({
                ...p,
                id: tId,
                customerId: customer.id,
                customerName: customer.name,
                type: 'payment',
                systemDate: entryTime
              });
            }
          });
        }
        
        // --- Account-opened entry ---
        const accountDate = customer.date_borrowed || customer.created_at;
        const cId = `${customer.id}-created`;
        // Use real DB created_at for "when it was added" check
        if (new Date(customer.created_at) > new Date(clearedAt) && !hiddenIds.includes(cId)) {
          allHistory.push({
            id: cId,
            date: accountDate,
            amount: customer.original_debt || (customer.balance + (customer.payment_history?.reduce((acc, p) => acc + p.amount, 0) || 0)),
            customerId: customer.id,
            customerName: customer.name,
            type: 'created',
            systemDate: customer.created_at
          });
        }
      });

      // --- Deleted-record logs: localStorage only, respects clearedAt ---
      const deletedLogs = JSON.parse(localStorage.getItem('arc_deleted_logs') || '[]');
      deletedLogs.forEach(log => {
        if (new Date(log.date) > new Date(clearedAt) && !hiddenIds.includes(log.id)) {
           allHistory.push({
             ...log,
             customerId: log.id,
             systemDate: log.date
           });
        }
      });

      // Sort by date descending
      allHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(allHistory);
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllTransactions(); }, []);

  const filtered = transactions.filter(t => {
    const matchesSearch = t.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesDate = !dateFilter || t.date.startsWith(dateFilter);
    const todayStr = new Date().toLocaleDateString('en-CA');
    const systemDateStr = t.systemDate ? new Date(t.systemDate).toLocaleDateString('en-CA') : t.date;
    const matchesType = typeFilter === 'All' || 
                       (typeFilter === 'Recent' ? systemDateStr === todayStr : t.type === typeFilter.toLowerCase());
    return matchesSearch && matchesDate && matchesType;
  });

  const clearHistory = () => {
    if (window.confirm('Clear all history? This will hide all current entries but keep customer records safe.')) {
      localStorage.setItem('arc_history_cleared_at', new Date().toISOString());
      setTransactions([]);
      toast.success('History cleared');
    }
  };

  const removeEntry = (e, id) => {
    e.stopPropagation();
    const hiddenIds = JSON.parse(localStorage.getItem('arc_hidden_transactions') || '[]');
    localStorage.setItem('arc_hidden_transactions', JSON.stringify([...hiddenIds, id]));
    setTransactions(prev => prev.filter(t => t.id !== id));
    toast.success('Entry removed');
  };

  return (
    <div className="page-container" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button className="btn-icon-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>Global History</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>Track every movement in Arc</p>
        </div>
        <button 
          className="btn-icon-sm" 
          onClick={clearHistory}
          style={{ marginLeft: 'auto', color: 'var(--danger)', background: 'rgba(255, 77, 77, 0.1)' }}
          title="Clear Log"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
          <Search className="search-icon" size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="search-wrap" style={{ width: 160 }}>
          <CalendarIcon className="search-icon" size={16} />
          <input
            type="date"
            className="search-input"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>

        {/* Type Filter Button */}
        <div style={{ position: 'relative' }}>
          <button 
            className="calendar-pill-btn" 
            onClick={() => setTypeMenuOpen(!typeMenuOpen)}
            style={{ 
              height: 46,
              padding: '0 16px',
              borderRadius: 14,
              background: typeFilter !== 'All' ? 'var(--accent)' : 'var(--bg-card)',
              color: typeFilter !== 'All' ? '#000' : 'var(--text-primary)',
              borderColor: typeFilter !== 'All' ? 'var(--accent)' : 'var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 700
            }}
          >
            <Filter size={16} />
            <span>{typeFilter === 'All' ? 'Filter Type' : typeFilter}</span>
          </button>

          <AnimatePresence>
            {typeMenuOpen && (
              <>
                <div 
                  style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
                  onClick={() => setTypeMenuOpen(false)} 
                />
                <motion.div 
                  className="dropdown-menu"
                  style={{ right: 0, top: '100%', marginTop: 8, width: 180 }}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                >
                  {['All', 'Recent', 'Payment', 'Created', 'Deleted'].map(type => (
                    <div 
                      key={type}
                      className={`dropdown-item ${typeFilter === type ? 'active' : ''}`} 
                      onClick={() => {
                        setTypeFilter(type);
                        setTypeMenuOpen(false);
                      }}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span>{type}</span>
                      {typeFilter === type && <ChevronRight size={14} />}
                    </div>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* History List */}
      <div className="timeline-container" style={{ paddingLeft: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Loading history...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <HistoryIcon size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <div>No history found</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((t, idx) => (
              <motion.div 
                key={idx}
                className="detail-field"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => navigate(`/debtor/${t.customerId}`)}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div className="row-avatar" style={{ 
                    width: 40, 
                    height: 40, 
                    background: t.type === 'payment' ? 'var(--status-paid-bg)' : t.type === 'deleted' ? 'rgba(255, 77, 77, 0.1)' : 'var(--accent-light)',
                    color: t.type === 'payment' ? 'var(--status-paid-text)' : t.type === 'deleted' ? 'var(--danger)' : 'var(--accent)',
                    fontSize: 14
                  }}>
                    {t.type === 'payment' ? '$' : t.type === 'deleted' ? <Trash2 size={16} /> : '+'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>
                      {t.customerName}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {fmtDate(t.date)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontWeight: 800, 
                      color: t.type === 'payment' ? 'var(--status-paid-text)' : t.type === 'deleted' ? 'var(--danger)' : 'var(--text-primary)',
                      fontSize: 16
                    }}>
                      {t.type === 'payment' ? '+' : t.type === 'deleted' ? '-' : ''}{fmt(t.amount)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      {t.type === 'payment' ? 'Payment' : t.type === 'deleted' ? 'Deleted' : 'Record Started'}
                    </div>
                  </div>
                  <button 
                    className="btn-icon-sm" 
                    onClick={(e) => removeEntry(e, t.id)}
                    style={{ background: 'transparent', opacity: 0.5 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <MobileNav />
    </div>
  );
}
