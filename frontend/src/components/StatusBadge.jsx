const CONFIG = {
  active: { label: 'Outstanding', color: 'var(--status-active-text)' },
  partial: { label: 'Partial', color: 'var(--accent)' },
  paid: { label: 'Paid', color: 'var(--status-paid-text)' },
};

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] || CONFIG.active;
  return (
    <div className="status-dot" style={{ color: cfg.color }}>
      <span className="dot" style={{ 
        background: 'currentColor',
        boxShadow: `0 0 10px ${cfg.color}`
      }}></span>
      {cfg.label}
    </div>
  );
}
