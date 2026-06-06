import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, ArrowLeft, RotateCcw, Trash2, Search, User, Calendar, PhilippinePeso } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';

const fmt = (n) => parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusColors = {
  active: { bg: 'var(--status-active-bg)', text: 'var(--status-active-text)', label: 'Outstanding' },
  partial: { bg: 'var(--status-partial-bg)', text: 'var(--status-partial-text)', label: 'Partial' },
  paid: { bg: 'var(--status-paid-bg)', text: 'var(--status-paid-text)', label: 'Paid' },
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
        { loading: 'Permanently deleting...', success: 'Record permanently deleted', error: 'Failed to delete' }
      );
      setRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
    } finally {
      setProcessing(null);
      setDeleteTarget(null);
    }
  };

  const formatArchiveDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '0 0 80px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '32px 0 28px' }}>
          <button
            onClick={() => navigate('/')}
            style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--glass-bg)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Archive size={22} style={{ color: '#EF4444' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>Archive</h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
                {records.length} archived record{records.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search archived customers..."
            style={{
              width: '100%', height: 48, padding: '0 16px 0 44px',
              borderRadius: 12, border: '1px solid var(--border)',
              background: 'var(--glass-bg)', color: 'var(--text-primary)',
              fontFamily: 'inherit', fontSize: 14, outline: 'none',
            }}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>
            Loading archive...
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '80px 0' }}
          >
            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Archive size={32} style={{ color: '#EF4444', opacity: 0.5 }} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
              {search ? 'No results found' : 'Archive is empty'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              {search ? 'Try a different name' : 'Deleted customer records will appear here'}
            </p>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AnimatePresence>
              {filtered.map((record, i) => {
                const status = statusColors[record.status] || statusColors.active;
                const isProcessing = processing === record.id;
                return (
                  <motion.div
                    key={record.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                    style={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 16,
                      padding: '18px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      opacity: isProcessing ? 0.5 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <User size={20} style={{ color: '#EF4444' }} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {record.name}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: status.bg, color: status.text }}>
                          {status.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <PhilippinePeso size={11} />
                          Balance: ₱{fmt(record.balance)}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={11} />
                          Archived: {formatArchiveDate(record.archived_at)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        disabled={isProcessing}
                        onClick={() => setRestoreTarget(record)}
                        title="Restore to active records"
                        style={{
                          width: 40, height: 40, borderRadius: 10,
                          border: '1px solid rgba(16,185,129,0.3)',
                          background: 'rgba(16,185,129,0.08)',
                          color: '#10B981',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        disabled={isProcessing}
                        onClick={() => setDeleteTarget(record)}
                        title="Permanently delete"
                        style={{
                          width: 40, height: 40, borderRadius: 10,
                          border: '1px solid rgba(239,68,68,0.3)',
                          background: 'rgba(239,68,68,0.08)',
                          color: '#EF4444',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Restore Confirm */}
      <ConfirmModal
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
        title="Restore Customer?"
        message={`This will move ${restoreTarget?.name}'s record back to your active customer list.`}
      />

      {/* Permanent Delete Confirm */}
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
