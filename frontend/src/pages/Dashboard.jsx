import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, UserX, Search, Download, Bell, Calendar as CalendarIcon, ArrowUpDown, Check, CheckSquare, Square, FileText, FileSpreadsheet } from 'lucide-react';
import MobileNav from '../components/MobileNav';
import SearchOverlay from '../components/SearchOverlay';
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    const handleSearchTrigger = () => setSearchOpen(true);
    window.addEventListener('trigger-search-focus', handleSearchTrigger);
    return () => window.removeEventListener('trigger-search-focus', handleSearchTrigger);
  }, []);

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredDebtors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDebtors.map(d => d.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} records?`)) return;
    try {
      await Promise.all(selectedIds.map(id => deleteDebtor(id)));
      setSelectedIds([]);
      toast.success(`Deleted ${selectedIds.length} records`);
    } catch (err) {
      toast.error('Bulk delete failed');
    }
  };

  const handleBulkPaid = async () => {
    try {
      await Promise.all(selectedIds.map(id => {
        const d = debtors.find(x => x.id === id);
        return recordPayment(id, d.balance);
      }));
      setSelectedIds([]);
      toast.success('Selected debtors marked as paid');
    } catch (err) {
      toast.error('Bulk update failed');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add Branded Header
    doc.setFontSize(22);
    doc.setTextColor(5, 7, 10);
    doc.text('Arc Debt Recovery Report', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${new Date().toLocaleDateString()} | Total Debtors: ${debtors.length}`, 14, 30);
    
    const tableData = debtors.map(d => [
      d.name,
      d.date_borrowed ? new Date(d.date_borrowed).toLocaleDateString('en-PH') : '—',
      'P' + parseFloat(d.advance_payment || 0).toLocaleString(),
      'P' + parseFloat(d.balance || 0).toLocaleString(),
      d.status.toUpperCase()
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['NAME', 'BORROWED', 'ADVANCE', 'BALANCE', 'STATUS']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 7, 10], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      styles: { fontSize: 9, cellPadding: 5 }
    });

    doc.save(`Arc_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Professional PDF Exported');
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Borrowed Date', 'Due Date', 'Advance Payment', 'Balance', 'Status'];
    const rows = debtors.map(d => [
      d.id,
      d.name,
      d.date_borrowed,
      d.due_date || 'N/A',
      d.advance_payment,
      d.balance,
      d.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Arc_Data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Exported for Excel');
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
      {/* Mobile Top Header (App-like) */}
      <div className="hide-desktop" style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Hi, Admin</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Welcome Back</div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="btn-icon-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <Bell size={20} />
            </button>
            <div className="row-avatar" style={{ width: 40, height: 40, borderRadius: 12 }}>AD</div>
          </div>
        </div>
      </div>

      {/* Desktop Top Bar */}
      <div className="top-bar hide-mobile">
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

        <div className="top-main-actions">
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
          
          <div className="action-buttons-group">
            <button 
              className="calendar-pill-btn" 
              onClick={() => navigate('/calendar')}
              title="Calendar"
            >
              <CalendarIcon size={16} />
              <span>Calendar</span>
            </button>
            <button 
              className="calendar-pill-btn" 
              onClick={exportToPDF}
              title="Export PDF"
            >
              <FileText size={16} />
              <span>PDF</span>
            </button>
            <button 
              className="calendar-pill-btn" 
              onClick={exportToCSV}
              title="Export CSV"
            >
              <FileSpreadsheet size={16} />
              <span>CSV</span>
            </button>
            <ThemeToggle />
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <Plus size={18} />
              <span>Add New Record</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="hide-desktop" style={{ padding: '0 24px 24px' }}>
        <div className="search-wrap">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search destination..."
            style={{ borderRadius: 16, padding: '14px 16px 14px 48px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="mobile-search-trigger"
          />
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
            <div className="filter-chips hide-mobile">
              {['All', 'Active', 'Partial'].map(status => (
                <button 
                  key={status} 
                  className={`filter-chip ${filterStatus === status ? 'active' : ''}`}
                  onClick={() => setFilterStatus(status)}
                >
                  {status}
                </button>
              ))}
            </div>

            <select 
              className="filter-select-mobile hide-desktop"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Partial">Partial</option>
            </select>

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
                  <th style={{ width: 40 }}>
                    <div 
                      className={`checkbox-custom ${selectedIds.length > 0 && selectedIds.length === filteredDebtors.length ? 'checked' : ''}`}
                      onClick={toggleAll}
                    >
                      {selectedIds.length > 0 && selectedIds.length === filteredDebtors.length && <Check size={14} />}
                    </div>
                  </th>
                  <th className="hide-mobile">Debtor ID</th>
                  <th>Assigned to</th>
                  <th className="hide-mobile">Borrowed Date</th>
                  <th className="hide-tablet">Due Date</th>
                  <th>Advance / Bal</th>
                  <th className="hide-tablet">Status</th>
                  <th></th>
                </tr>
              </thead>
              <motion.tbody initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {filteredDebtors.map((d, i) => (
                  <DebtorCard
                    key={d.id}
                    debtor={d}
                    index={i}
                    selected={selectedIds.includes(d.id)}
                    onSelect={() => toggleSelect(d.id)}
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
      <MobileNav onAddClick={() => setAddOpen(true)} />

      <SearchOverlay 
        open={searchOpen} 
        onClose={() => setSearchOpen(false)} 
        debtors={debtors} 
      />

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            className="bulk-actions-bar"
            initial={{ y: 100, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: 100, x: '-50%', opacity: 0 }}
          >
            <div className="bulk-count">{selectedIds.length} Selected</div>
            <div className="bulk-btns">
              <button className="btn btn-primary btn-sm" onClick={handleBulkPaid}>Mark as Paid</button>
              <button className="btn btn-outline btn-sm" style={{ borderColor: '#FF4D4D', color: '#FF4D4D' }} onClick={handleBulkDelete}>Delete All</button>
              <button className="btn btn-icon-sm" onClick={() => setSelectedIds([])}><Plus size={18} style={{ transform: 'rotate(45deg)' }} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
