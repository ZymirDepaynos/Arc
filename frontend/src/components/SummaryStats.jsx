import { TrendingDown, CheckCircle, Search, Lock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const fmt = (n) =>
  '₱' + parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SummaryStats({ totals, filteredTotals, searchLabel, showStats, onRevealClick, onLockClick }) {
  const isFiltered = !!(searchLabel && filteredTotals);

  return (
    <div className="stats-tab-panel">
      {/* Tab Header Bar */}
      <div className="stats-tab-header" onClick={showStats ? onLockClick : onRevealClick}>
        <div className="stats-tab-title-group">
          <div className="stats-tab-icon">
            {showStats ? <EyeOff size={16} /> : <Lock size={16} />}
          </div>
          <div className="stats-tab-title-text">
            <span className="stats-tab-title">
              {showStats ? 'Financial Overview' : 'Financial Overview (Locked)'}
            </span>
            <span className="stats-tab-subtitle">
              {showStats ? 'Click to collapse/lock statistics' : 'Click to authenticate and reveal statistics'}
            </span>
          </div>
        </div>
        
        <button 
          className="stats-tab-btn"
          onClick={(e) => {
            e.stopPropagation(); // Prevent double trigger
            if (showStats) {
              onLockClick();
            } else {
              onRevealClick();
            }
          }}
        >
          {showStats ? (
            <>
              <EyeOff size={14} />
              <span>Lock Stats</span>
            </>
          ) : (
            <>
              <Eye size={14} />
              <span>Reveal Stats</span>
            </>
          )}
        </button>
      </div>

      {/* Expandable Body Content */}
      {showStats && (
        <div className="stats-tab-body">
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
          <div className="stats-container">
            {/* Left Card: Total Outstanding */}
            <div className="stat-box" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="stat-box-header" style={{ marginBottom: 20 }}>
                <span className="stat-box-title">Total Outstanding</span>
                <div className="row-avatar" style={{ background: 'var(--status-active-bg)', color: 'var(--status-active-text)' }}>
                  <TrendingDown size={16} />
                </div>
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: 16 }}>
                <div className="stat-box-value">
                  {fmt(totals?.totalBalance || 0)}
                </div>
                <div style={{ marginTop: 8 }}>
                  <span className="stat-sub-value" style={{ marginLeft: 0, background: 'var(--status-paid-bg)', color: 'var(--status-paid-text)' }}>
                    Outstanding Customers
                  </span>
                </div>
              </div>
            </div>

            {/* Right Card: Total Collected */}
            <div className="stat-box">
              <div className="stat-box-header">
                <span className="stat-box-title">Total Collected</span>
                <div className="row-avatar" style={{ background: 'var(--status-paid-bg)', color: 'var(--status-paid-text)' }}>
                  <CheckCircle size={16} />
                </div>
              </div>

              <div>
                <div className="stat-box-value">
                  {fmt(totals?.totalAdvance || 0)}
                </div>
                <div style={{ marginTop: 8 }}>
                  <span className="stat-sub-value" style={{ marginLeft: 0, background: 'var(--status-paid-bg)', color: 'var(--status-paid-text)' }}>
                    Total Recovery
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 2, height: 6, marginTop: 24, borderRadius: 3, overflow: 'hidden', background: 'var(--bg-white)' }}>
                  <div style={{ flex: totals?.activeCount || 1, background: 'var(--status-active-text)' }}></div>
                  <div style={{ flex: totals?.partialCount || 0, background: 'var(--accent)' }}></div>
                  <div style={{ flex: totals?.paidCount || 0, background: 'var(--status-paid-text)' }}></div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div className="dot active" style={{ width: 6, height: 6 }}></div> Outstanding: {totals?.activeCount || 0}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div className="dot partial" style={{ width: 6, height: 6 }}></div> Partial: {totals?.partialCount || 0}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div className="dot paid" style={{ width: 6, height: 6 }}></div> Paid: {totals?.paidCount || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
