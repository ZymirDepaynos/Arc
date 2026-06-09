import { TrendingDown, CheckCircle, Search, Lock, EyeOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const fmt = (n) =>
  '₱' + parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SummaryStats({ totals, filteredTotals, searchLabel, onClose, onLockClick }) {
  const isFiltered = !!(searchLabel && filteredTotals);

  return (
    <div className="modal-overlay" style={{ zIndex: 300 }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="modal modal-stats"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', marginBottom: 24, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--accent-light)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px var(--accent-light)'
            }}>
              <TrendingDown size={16} />
            </div>
            <h2 className="modal-title" style={{ fontSize: 20, margin: 0, letterSpacing: '-0.5px' }}>
              Financial Overview
            </h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={onLockClick}
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                padding: '6px 12px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--status-danger)';
                e.currentTarget.style.borderColor = 'var(--status-danger)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
              title="Lock Statistics"
            >
              <EyeOff size={12} />
              <span>Lock Overview</span>
            </button>

            <button
              className="modal-close-btn"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div>
          {/* Active Search Filtered Stats */}
          <AnimatePresence>
            {isFiltered && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                  marginBottom: 16,
                }}
              >
                {/* Search Term Banner */}
                <div
                  style={{
                    gridColumn: '1 / -1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 20px',
                    background: 'var(--accent-light)',
                    border: '1px solid var(--accent)',
                    borderRadius: 14,
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    letterSpacing: '-0.2px',
                  }}
                >
                  <Search size={14} />
                  Results for&nbsp;<span style={{ fontWeight: 900 }}>"{searchLabel}"</span>
                  &nbsp;—&nbsp;{(filteredTotals.activeCount + filteredTotals.partialCount + filteredTotals.paidCount)} customer(s) found
                </div>

                {/* Filtered Outstanding Card */}
                <div
                  style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--status-active-bg)', color: 'var(--status-active-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TrendingDown size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total Outstanding</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.8px' }}>
                      {fmt(filteredTotals.totalBalance)}
                    </div>
                  </div>
                </div>

                {/* Filtered Collected Card */}
                <div
                  style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--status-paid-bg)', color: 'var(--status-paid-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Total Collected</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.8px' }}>
                      {fmt(filteredTotals.totalAdvance)}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Stats Cards Grid */}
          <div className="stats-container" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, display: 'grid' }}>
            {/* Left Card: Total Outstanding */}
            <div className="stat-box" style={{ display: 'flex', flexDirection: 'column', padding: 24 }}>
              <div className="stat-box-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-box-title" style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Total Outstanding</span>
                <div className="row-avatar" style={{ background: 'var(--status-active-bg)', color: 'var(--status-active-text)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingDown size={16} />
                </div>
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 16 }}>
                <div className="stat-box-value" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                  {fmt(totals?.totalBalance || 0)}
                </div>
                <div style={{ marginTop: 8 }}>
                  <span className="stat-sub-value" style={{ marginLeft: 0, background: 'var(--status-paid-bg)', color: 'var(--status-paid-text)', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                    Outstanding Customers
                  </span>
                </div>
              </div>
            </div>

            {/* Right Card: Total Collected */}
            <div className="stat-box" style={{ padding: 24 }}>
              <div className="stat-box-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-box-title" style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Total Collected</span>
                <div className="row-avatar" style={{ background: 'var(--status-paid-bg)', color: 'var(--status-paid-text)', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={16} />
                </div>
              </div>

              <div>
                <div className="stat-box-value" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                  {fmt(totals?.totalAdvance || 0)}
                </div>
                <div style={{ marginTop: 8 }}>
                  <span className="stat-sub-value" style={{ marginLeft: 0, background: 'var(--status-paid-bg)', color: 'var(--status-paid-text)', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                    Total Recovery
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 2, height: 6, marginTop: 24, borderRadius: 3, overflow: 'hidden', background: 'var(--border)' }}>
                  <div style={{ flex: totals?.activeCount || 1, background: 'var(--status-active-text)' }}></div>
                  <div style={{ flex: totals?.partialCount || 0, background: 'var(--accent)' }}></div>
                  <div style={{ flex: totals?.paidCount || 0, background: 'var(--status-paid-text)' }}></div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div className="dot active" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-active-text)' }}></div> Outstanding: {totals?.activeCount || 0}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div className="dot partial" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }}></div> Partial: {totals?.partialCount || 0}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div className="dot paid" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-paid-text)' }}></div> Paid: {totals?.paidCount || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
