import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trash2, CreditCard, Check, MoreVertical } from 'lucide-react';

import { fmt, fmtDate, initials } from '../utils/format';

export default function CustomerCard({ customer, onDelete, onPay, index, selected, onToggleSelect, isSelectionMode }) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleRowClick = () => {
    if (isSelectionMode) {
      onToggleSelect();
    } else {
      navigate(`/customer/${customer.id}`);
    }
  };

  const getStatusClass = () => {
    switch (customer.status) {
      case 'active': return 'active';
      case 'partial': return 'partial';
      case 'paid': return 'paid';
      default: return '';
    }
  };

  const getStatusText = () => {
    switch (customer.status) {
      case 'active': return 'Outstanding';
      case 'partial': return 'Partial';
      case 'paid': return 'Paid';
      default: return customer.status;
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
      {}
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
      {}
      <td className="col-receipt hide-mobile" style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>
        {customer.receipt_numbers && customer.receipt_numbers.length > 0 ? `#${customer.receipt_numbers[0]}` : '—'}
      </td>

      {}
      <td className="col-name">
        <div className="table-avatar-cell">
          <div className="row-avatar" style={{ border: '1px solid rgba(0, 245, 160, 0.2)' }}>{initials(customer.name)}</div>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{customer.name}</span>
        </div>
      </td>

      {}
      <td className="col-date" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
        {fmtDate(customer.date_borrowed)}
      </td>

      {}
      <td className="col-init-balance hide-mobile">
        {customer.original_debt > 0
          ? <span style={{ fontWeight: 700, color: 'var(--status-active-text)' }}>{fmt(customer.original_debt)}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>
        }
      </td>

      {}
      <td className="col-balance">
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(customer.balance)}</span>
      </td>

      {}
      <td className="col-status hide-tablet">
        <div className="status-dot">
          <span className={`dot ${getStatusClass()}`}></span>
          {getStatusText()}
        </div>
      </td>

      {}
      <td className="col-actions" onClick={(e) => e.stopPropagation()}>
        <div className="action-cell">
          {}
          <div className="desktop-actions" style={{ display: 'flex', gap: 10 }}>
            {customer.status !== 'paid' && (
              <button
                className="btn-icon-sm"
                onClick={(e) => { e.stopPropagation(); onPay(customer); }}
                title="Record Payment"
                style={{
                  background: 'var(--status-active-bg)',
                  color: 'var(--status-active-text)',
                  border: '1px solid var(--status-active-bg)'
                }}
              >
                <CreditCard size={18} />
              </button>
            )}
            <button
              className="btn-icon-sm"
              onClick={(e) => { e.stopPropagation(); onDelete(customer); }}
              title="Delete Record"
              style={{
                background: 'rgba(255, 77, 77, 0.08)',
                color: '#FF4D4D',
                border: '1px solid rgba(255, 77, 77, 0.1)'
              }}
            >
              <Trash2 size={18} />
            </button>
          </div>

          {}
          <div className="mobile-actions" ref={menuRef} style={{ position: 'relative' }}>
            <button
              className="btn-icon-sm"
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              style={{ background: 'transparent', border: '1px solid transparent' }}
            >
              <MoreVertical size={20} />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 4,
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    boxShadow: 'var(--shadow-md)',
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    zIndex: 100,
                    minWidth: 140
                  }}
                >
                  {customer.status !== 'paid' && (
                    <button
                      className="btn-menu-item"
                      onClick={(e) => { e.stopPropagation(); setShowMenu(false); onPay(customer); }}
                    >
                      <CreditCard size={16} /> Record Payment
                    </button>
                  )}
                  <button
                    className="btn-menu-item"
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(customer); }}
                    style={{ color: '#FF4D4D' }}
                  >
                    <Trash2 size={16} /> Delete Record
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </td>
    </motion.tr>
  );
}
