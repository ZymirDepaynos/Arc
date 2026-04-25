import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trash2, CreditCard } from 'lucide-react';

const fmt = (n) =>
  '₱' + parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
};

const initials = (name) =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default function DebtorCard({ debtor, onEdit, onDelete, onPay, index }) {
  const navigate = useNavigate();

  // Status mapping to LoadLogic dot style
  const getStatusClass = () => {
    switch (debtor.status) {
      case 'active': return 'active'; // yellow-ish
      case 'partial': return 'partial'; // blue-ish
      case 'paid': return 'paid'; // green
      default: return '';
    }
  };

  const getStatusText = () => {
    switch (debtor.status) {
      case 'active': return 'Outstanding';
      case 'partial': return 'Partial';
      case 'paid': return 'Completed';
      default: return debtor.status;
    }
  };

  return (
    <motion.tr
      className="data-row"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      onClick={() => navigate(`/debtor/${debtor.id}`)}
      style={{ cursor: 'pointer' }}
    >
      {/* ID */}
      <td style={{ color: 'var(--text-secondary)' }}>
        #{debtor.id.substring(0, 8)}
      </td>

      {/* Assigned to */}
      <td>
        <div className="table-avatar-cell">
          <div className="row-avatar">{initials(debtor.name)}</div>
          <span style={{ fontWeight: 600 }}>{debtor.name}</span>
        </div>
      </td>

      {/* Borrowed Date */}
      <td>
        {fmtDate(debtor.date_borrowed)}
      </td>

      {/* Due Date */}
      <td style={{ color: debtor.due_date ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {fmtDate(debtor.due_date)}
      </td>

      {/* Balance / Advance */}
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Adv: {fmt(debtor.advance_payment)}</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            Bal: {fmt(debtor.balance)}
          </span>
        </div>
      </td>

      {/* Status */}
      <td>
        <div className="status-dot">
          <span className={`dot ${getStatusClass()}`}></span>
          {getStatusText()}
        </div>
      </td>

      {/* Actions */}
      <td onClick={(e) => e.stopPropagation()}>
        <div className="action-cell" style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn-icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onPay(debtor);
            }}
            title="Record Payment"
            style={{
              background: 'var(--accent-light)',
              color: 'var(--accent)',
              width: 38,
              height: 38,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CreditCard size={18} />
          </button>
          <button
            className="btn-icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(debtor);
            }}
            title="Delete Record"
            style={{
              background: 'rgba(255, 59, 48, 0.08)',
              color: '#FF3B30',
              width: 38,
              height: 38,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}
