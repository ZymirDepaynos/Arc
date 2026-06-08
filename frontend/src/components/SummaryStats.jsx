import { TrendingDown, CheckCircle, Search, Lock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const fmt = (n) =>
  '₱' + parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SummaryStats({ totals, filteredTotals, searchLabel, showStats, onRevealClick, onLockClick }) {
  const isFiltered = !!(searchLabel && filteredTotals);

  return (
    <div style={{ position: 'relative', borderRadius: 24, marginBottom: 16 }}>
      {/* Absolute overlay when stats are locked */}
      {!showStats && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          borderRadius: 24,
          border: '1px solid var(--border)',
          padding: 24,
          textAlign: 'center',
          boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.4)',
        }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'var(--accent-light)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            boxShadow: '0 0 25px var(--accent-light)'
          }}>
            <Lock size={22} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6, letterSpacing: '-0.3px' }}>
            Financial Statistics Locked
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, maxWidth: 320, lineHeight: 1.4 }}>
            Please verify your account credentials to reveal the outstanding and collected balances.
          </p>
          <button
            className="btn btn-primary btn-sm"
            onClick={onRevealClick}
            style={{
              padding: '8px 24px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer'
            }}
          >
            <Eye size={14} />
            <span>Reveal Financials</span>
          </button>
        </div>
      )}

      {/* Elegant Header with Lock Button if revealed */}
      {showStats && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 5
        }}>
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
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
            title="Lock Financial Stats"
          >
            <EyeOff size={12} />
            <span>Lock Stats</span>
          </button>
        </div>
      )}

      {/* Main Component Content (Blurred if showStats is false) */}
      <div style={{
        filter: showStats ? 'none' : 'blur(10px)',
        pointerEvents: showStats ? 'auto' : 'none',
        transition: 'filter 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        paddingTop: showStats ? 48 : 0 /* Add spacing for lock button if stats revealed */
      }}>
        <>
      {}
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
            {}
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

            {}
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

            {}
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

      {}
      <div className="stats-container">
        {}
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

        {}
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
      </>
      </div>
    </div>
  );
}
