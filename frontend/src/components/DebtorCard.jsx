import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trash2, CreditCard, Check } from 'lucide-react';

const fmt = (n) =>
  '₱' + parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const isDateOnly = d.length === 10 || !d.includes('T');
    const date = isDateOnly ? new Date(d + 'T12:00:00') : new Date(d);
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

export default function DebtorCard({ debtor, onDelete, onPay, index, selected, onToggleSelect, isSelectionMode }) {
  const navigate = useNavigate();

  const handleRowClick = () => {
    if (isSelectionMode) {
      onToggleSelect();
    } else {
      navigate(`/debtor/${debtor.id}`);
    }
  };

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
      case 'paid': return 'Paid';
      default: return debtor.status;
    }
  };

  return (
    <motion.tr
      className={`data-row ${selected ? 'selected-row' : ''} ${isSelectionMode ? 'selection-mode' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      onClick={handleRowClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Selection Checkbox */}
      {isSelectionMode && (
        <td className="col-selection">
          <div 
            className={`checkbox-custom ${selected ? 'checked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
          >
            {selected && <Check size={14} />}
          </div>
        </td>
      )}
      {/* ID */}
      <td className="col-receipt hide-mobile" style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>
        {debtor.receipt_numbers && debtor.receipt_numbers.length > 0 ? `#${debtor.receipt_numbers[0]}` : '—'}
      </td>

      {/* Name */}
      <td className="col-name">
        <div className="table-avatar-cell">
          <div className="row-avatar" style={{ border: '1px solid rgba(0, 245, 160, 0.2)' }}>{initials(debtor.name)}</div>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{debtor.name}</span>
        </div>
      </td>

      {/* Date of Purchase — fills the empty column slot */}
      <td className="col-date" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
        {fmtDate(debtor.date_borrowed)}
      </td>

      {/* Initial Balance */}
      <td className="col-init-balance hide-mobile">
        {debtor.original_debt > 0
          ? <span style={{ fontWeight: 700, color: 'var(--status-active-text)' }}>{fmt(debtor.original_debt)}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>
        }
      </td>

      {/* Balance */}
      <td className="col-balance">
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(debtor.balance)}</span>
      </td>

      {/* Status */}
      <td className="col-status hide-tablet" style={{ textAlign: 'center' }}>
        <div className="status-dot" style={{ display: 'inline-flex', justifyContent: 'center', width: '100%' }}>
          <span className={`dot ${getStatusClass()}`}></span>
        </div>
      </td>

      {/* Actions */}
      <td className="col-actions" onClick={(e) => e.stopPropagation()}>
        <div className="action-cell" style={{ display: 'flex', gap: 10 }}>
          {debtor.status !== 'paid' && (
            <button
              className="btn-icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onPay(debtor);
              }}
              title="Record Payment"
              style={{
                background: 'var(--status-active-bg)',
                color: 'var(--status-active-text)',
                width: 38,
                height: 38,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--status-active-bg)',
                transition: 'all 0.2s ease'
              }}
            >
              <CreditCard size={18} />
            </button>
          )}
          <button
            className="btn-icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(debtor);
            }}
            title="Delete Record"
            style={{
              background: 'rgba(255, 77, 77, 0.08)',
              color: '#FF4D4D',
              width: 38,
              height: 38,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 77, 77, 0.1)',
              transition: 'all 0.2s ease'
            }}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}
