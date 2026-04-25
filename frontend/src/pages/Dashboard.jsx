import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, UserX, Search, Download, SlidersHorizontal, ArrowUpDown, Calendar as CalendarIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useDebtors } from '../hooks/useDebtors';
import SummaryStats from '../components/SummaryStats';
import DebtorCard from '../components/DebtorCard';
import DebtorModal from '../components/DebtorModal';
import PayModal from '../components/PayModal';
import ConfirmModal from '../components/ConfirmModal';
import logo from '../assets/logo.png';
import ThemeToggle from '../components/ThemeToggle';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    debtors, loading, error, search, setSearch,
    createDebtor, updateDebtor, deleteDebtor, recordPayment, totals
  } = useDebtors();

  const [addOpen, setAddOpen] = useState(false);
  const [editDebtor, setEditDebtor] = useState(null);
  const [payDebtor, setPayDebtor] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [confirmData, setConfirmData] = useState(null);
  const [deleteData, setDeleteData] = useState(null);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const tableData = debtors.map(d => [
      d.name,
      d.date_borrowed ? new Date(d.date_borrowed).toLocaleDateString('en-PH') : '—',
      'P' + parseFloat(d.advance_payment || 0).toLocaleString(),
      'P' + parseFloat(d.balance || 0).toLocaleString()
    ]);

    doc.setFontSize(18);
    doc.text('Arc Debt Tracker - Debtors Report', 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['NAME', 'BORROWED ON', 'ADVANCE', 'BALANCE']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillStyle: 'DF', fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 5 },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });

    doc.save('Arc-Debtors-Report.pdf');
    toast.success('PDF Downloaded');
  };

  const handleAdd = async (form) => {
    await toast.promise(createDebtor(form), {
      loading: 'Adding debtor...',
      success: 'Debtor added!',
      error: (e) => e?.response?.data?.error || 'Failed to add debtor',
    });
  };

  const handleEdit = async (form) => {
    await toast.promise(updateDebtor(editDebtor.id, form), {
      loading: 'Saving changes...',
      success: 'Changes saved!',
      error: (e) => e?.response?.data?.error || 'Failed to save',
    });
  };

  const handleDelete = async (id) => {
    await toast.promise(deleteDebtor(id), {
      loading: 'Deleting...',
      success: 'Debtor removed.',
      error: 'Failed to delete',
    });
  };

  const handlePay = async (id, amount) => {
    await toast.promise(recordPayment(id, amount), {
      loading: 'Recording payment...',
      success: 'Payment recorded!',
      error: 'Failed to record payment',
    });
  };

  const filteredDebtors = debtors.filter(d => 
    (filterStatus === 'All' && d.status !== 'paid') || d.status === filterStatus.toLowerCase()
  );

  return (
    <>
      {/* Top Bar */}
      <div className="top-bar">
        <div className="logo-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="logo-img-wrapper">
            <img 
              src={logo} 
              alt="Arc Logo" 
              className="logo-img"
            />
          </div>
          <span className="logo-text">Arc</span>
        </div>

        <div className="top-center-actions">
          <div className="search-wrap">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search debtor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            className="calendar-pill-btn" 
            onClick={() => navigate('/calendar')}
          >
            <CalendarIcon size={16} />
            <span>Calendar</span>
          </button>
          <button 
            className="calendar-pill-btn" 
            onClick={exportToPDF}
          >
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>

        <div className="top-actions">
          <ThemeToggle />
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={18} />
            <span>Add New Record</span>
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <SummaryStats totals={totals} />

      {/* Table Section */}
      <div className="table-section">
        <div className="table-header-row">
          <div className="table-title">
            Debtors <span className="table-badge">{debtors.filter(d => d.status !== 'paid').length}</span>
          </div>
          <div className="table-filters">
            {['All', 'Active', 'Partial'].map(status => (
              <button 
                key={status} 
                className={`filter-chip ${filterStatus === status ? 'active' : ''}`}
                onClick={() => setFilterStatus(status)}
              >
                {status}
              </button>
            ))}
            <button className="filter-chip" style={{ padding: '6px 8px' }}>
              <ArrowUpDown size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Loading records...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--danger)' }}>{error}</div>
        ) : filteredDebtors.length === 0 ? (
          <div className="empty-state">
            <UserX size={32} className="empty-state-icon" style={{ margin: '0 auto 16px' }} />
            <div className="empty-state-title">{search ? 'No results found' : 'No debtors yet'}</div>
            <div className="empty-state-sub">Click "Add new record" to get started</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Debtor ID</th>
                  <th>Assigned to</th>
                  <th>Borrowed Date</th>
                  <th>Due Date</th>
                  <th>Advance / Bal</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <motion.tbody initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {filteredDebtors.map((d, i) => (
                  <DebtorCard
                    key={d.id}
                    debtor={d}
                    index={i}
                    onEdit={(deb) => setEditDebtor(deb)}
                    onDelete={(deb) => setDeleteData(deb)}
                    onPay={(deb, amt) => {
                      if (amt !== undefined) {
                        setConfirmData(deb);
                      } else {
                        setPayDebtor(deb);
                      }
                    }}
                  />
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <DebtorModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={handleAdd} />
      <DebtorModal
        open={!!editDebtor}
        onClose={() => setEditDebtor(null)}
        onSubmit={handleEdit}
        initial={editDebtor}
      />
      <PayModal
        open={!!payDebtor}
        onClose={() => setPayDebtor(null)}
        debtor={payDebtor}
        onPay={handlePay}
      />

      <ConfirmModal
        open={!!confirmData}
        onClose={() => setConfirmData(null)}
        onConfirm={() => handlePay(confirmData.id, confirmData.balance)}
        title="Settle Full Debt?"
        message={`This will pay the full balance of ₱${confirmData?.balance?.toLocaleString()} and permanently remove ${confirmData?.name} from the records. Are you sure?`}
      />

      <ConfirmModal
        open={!!deleteData}
        onClose={() => setDeleteData(null)}
        onConfirm={() => handleDelete(deleteData.id)}
        title="Delete Record?"
        message={`Are you sure you want to permanently delete the record for ${deleteData?.name}? This cannot be undone.`}
      />
    </>
  );
}
