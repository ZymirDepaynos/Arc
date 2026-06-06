import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, ArrowLeft, RotateCcw, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';

const fmt = (n) => '₱' + parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const initials = (name) =>
  (name || '??').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const fmtArchiveDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getStatusClass = (status) => {
  switch (status) {
    case 'active': return 'active';
    case 'partial': return 'partial';
    case 'paid': return 'paid';
    default: return '';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'active': return 'Outstanding';
    case 'partial': return 'Partial';
    case 'paid': return 'Paid';
    default: return status;
  }
};

export default function ArchivePage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [processing, setProcessing] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/api/archive');
      setRecords(res.data);
    } catch {
      toast.error('Failed to load archive');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = records.filter(r =>
    r.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setProcessing(restoreTarget.id);
    try {
      await toast.promise(
        api.post(`/api/archive/${restoreTarget.id}/restore`),
        { loading: 'Restoring...', success: `${restoreTarget.name} restored!`, error: 'Failed to restore' }
      );
      setRecords(prev => prev.filter(r => r.id !== restoreTarget.id));
    } finally {
      setProcessing(null);
      setRestoreTarget(null);
    }
  };

  const handlePermDelete = async () => {
    if (!deleteTarget) return;
    setProcessing(deleteTarget.id);
    try {
      await toast.promise(
        api.delete(`/api/archive/${deleteTarget.id}`),
        { loading: 'Deleting...', success: 'Permanently deleted', error: 'Failed to delete' }
      );
      setRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
    } finally {
      setProcessing(null);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="page-wrapper" style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 0 24px', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => navigate('/')}
              className="btn btn-outline"
              style={{ width: 44, height: 44, padding: 0, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <ArrowLeft size={18} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(239,68,68,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <Archive size={20} style={{ color: '#EF4444' }} />
              </div>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  Archive
                </h1>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
                  {records.length} archived record{records.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', width: 260 }}>
            <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search archived..."
              style={{
                width: '100%', height: 40, padding: '0 14px 0 38px',
                borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--glass-bg)', color: 'var(--text-primary)',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 500, outline: 'none',
              }}
            />
          </div>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
            Loading archive...
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '80px 0' }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Archive size={28} style={{ color: '#EF4444', opacity: 0.5 }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              {search ? 'No results found' : 'Archive is empty'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
              {search ? 'Try a different name' : 'Deleted customer records will appear here'}
            </p>
          </motion.div>
        ) : (
          <div className="table-container">
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 48, textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>Customer</th>
                  <th className="hide-mobile" style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>Original Debt</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>Balance</th>
                  <th className="hide-tablet" style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>Status</th>
                  <th className="hide-tablet" style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>Archived</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((record, i) => {
                    const isProcessing = processing === record.id;
                    return (
                      <motion.tr
                        key={record.id}
                        layout
                        className="data-row"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        style={{ opacity: isProcessing ? 0.4 : 1, transition: 'opacity 0.2s', cursor: 'default' }}
                      >
                        <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                          {i + 1}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div className="table-avatar-cell">
                            <div className="row-avatar" style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', flexShrink: 0 }}>
                              {initials(record.name)}
                            </div>
                            <div style={{ minWidth: 0, overflow: 'hidden' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{record.name}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                {fmtDate(record.date_borrowed)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="hide-mobile" style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--status-active-text)' }}>
                          {record.original_debt > 0 ? fmt(record.original_debt) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {fmt(record.balance)}
                        </td>
                        <td className="hide-tablet" style={{ padding: '14px 16px' }}>
                          <div className="status-dot">
                            <span className={`dot ${getStatusClass(record.status)}`} />
                            {getStatusText(record.status)}
                          </div>
                        </td>
                        <td className="hide-tablet" style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                          {fmtArchiveDate(record.archived_at)}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                              disabled={isProcessing}
                              onClick={() => setRestoreTarget(record)}
                              title="Restore to active"
                              className="btn-icon-sm"
                              style={{
                                background: 'rgba(16,185,129,0.08)',
                                color: '#10B981',
                                border: '1px solid rgba(16,185,129,0.2)',
                              }}
                            >
                              <RotateCcw size={16} />
                            </button>
                            <button
                              disabled={isProcessing}
                              onClick={() => setDeleteTarget(record)}
                              title="Permanently delete"
                              className="btn-icon-sm"
                              style={{
                                background: 'rgba(239,68,68,0.08)',
                                color: '#EF4444',
                                border: '1px solid rgba(239,68,68,0.2)',
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
        title="Restore Customer?"
        message={`This will move ${restoreTarget?.name}'s record back to your active customer list.`}
      />
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handlePermDelete}
        title="Permanently Delete?"
        message={`This will permanently erase ${deleteTarget?.name}'s record and all their payment history. This cannot be undone.`}
      />
    </div>
  );
}
