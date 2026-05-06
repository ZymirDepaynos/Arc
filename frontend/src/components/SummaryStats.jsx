import { TrendingDown, CheckCircle, Calendar, ArrowUpRight, BarChart3 } from 'lucide-react';

const fmt = (n) =>
  '₱' + parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SummaryStats({ totals }) {
  return (
    <div className="stats-container">
      {/* Box 1: Total Outstanding */}
      <div className="stat-box">
        <div className="stat-box-header">
          <span className="stat-box-title">Total Outstanding</span>
          <div className="row-avatar" style={{ background: 'var(--status-active-bg)', color: 'var(--status-active-text)' }}>
            <TrendingDown size={16} />
          </div>
        </div>
        
        <div>
          <div className="stat-box-value">
            {fmt(totals?.totalBalance || 0)}
          </div>
          <div style={{ marginTop: 8 }}>
            <span className="stat-sub-value" style={{ marginLeft: 0, background: 'var(--status-paid-bg)', color: 'var(--status-paid-text)' }}>
              Outstanding Customers
            </span>
          </div>
          
          {/* Animated trend bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 40, marginTop: 24, opacity: 0.8 }}>
            {[30, 45, 35, 60, 45, 55, 80, 45, 70, 35, 50, 40, 60, 30].map((h, i) => (
              <div 
                key={i} 
                style={{ 
                  flex: 1, 
                  background: i === 6 ? 'var(--accent)' : 'var(--border)', 
                  height: `${h}%`, 
                  borderRadius: '3px 3px 0 0',
                  boxShadow: i === 6 ? '0 0 15px var(--accent)' : 'none',
                  transition: 'all 0.3s ease'
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>

      {/* Box 2: Total Collected */}
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
  );
}
