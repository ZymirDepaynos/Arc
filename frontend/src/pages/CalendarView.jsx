import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Menu,
  Bell,
  Grid as GridIcon,
  User,
  Settings,
  Calendar as CalendarIcon
} from 'lucide-react';
import axios from 'axios';
import MobileNav from '../components/MobileNav';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function CalendarView() {
  const navigate = useNavigate();
  const [debtors, setDebtors] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState('Month'); // Year, Month, Week
  const [dropdownOpen, setDropdownOpen] = useState(null); // 'month' or 'year' or null
  const [selectedDayEvents, setSelectedDayEvents] = useState(null); // { date: '...', events: [] }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/debtors`);
        setDebtors(res.data);
      } catch (err) {
        console.error('Failed to fetch debtors for calendar', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  const allHistoryEvents = (Array.isArray(debtors) ? debtors : [])
    .filter(d => Array.isArray(d.payment_history))
    .flatMap(d => d.payment_history.map(p => ({ ...p, name: d.name, debtorId: d.id })))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const calendarDays = [];
  const startDay = firstDayOfMonth(year, month);
  const totalDays = daysInMonth(year, month);

  // Pad start (prev month days)
  for (let i = 0; i < startDay; i++) {
    calendarDays.push({ day: null, type: 'prev' });
  }
  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    calendarDays.push({ day: i, type: 'current' });
  }
  // Pad end
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push({ day: null, type: 'next' });
  }

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const events = [];

    (Array.isArray(debtors) ? debtors : []).forEach(d => {
      // Purchase Event
      if (d.date_borrowed) {
        // Handle both "YYYY-MM-DD" and ISO strings safely
        const isMatch = d.date_borrowed.includes('T') 
          ? new Date(d.date_borrowed).getFullYear() === year && new Date(d.date_borrowed).getMonth() === month && new Date(d.date_borrowed).getDate() === day
          : d.date_borrowed.startsWith(dateStr);
          
        if (isMatch) {
          events.push({
            type: 'borrowed',
            debtor: d,
            name: d.name,
            amount: d.balance + (d.advance_payment || 0),
            label: 'PURCHASED'
          });
        }
      }
      // Payment Events
      if (Array.isArray(d.payment_history)) {
        d.payment_history.forEach(p => {
          if (p.date) {
            const pDate = new Date(p.date);
            if (pDate.getFullYear() === year && pDate.getMonth() === month && pDate.getDate() === day) {
              events.push({
                type: 'paid',
                debtor: d,
                name: d.name,
                amount: p.amount,
                balance_after: p.balance_after
              });
            }
          }
        });
      }
    });
    return events;
  };

  return (
    <div className="calendar-container">
      {/* Sidebar - Left Section */}
      <div className="calendar-sidebar">
        <button className="btn-icon-sm" onClick={() => navigate('/')} style={{ marginBottom: 20 }}>
          <ArrowLeft size={20} />
        </button>

        <div className="today-display">
          <div className="today-number">{today.getDate()}</div>
          <div className="today-month">{monthNames[today.getMonth()]} {today.getFullYear()}</div>
        </div>

        <button className="sidebar-calendar-btn">
          <CalendarIcon size={18} />
          Calendar
        </button>

        <div className="history-section">
          <h3 className="history-title">Recent Payments</h3>
          <div className="history-list">
            {allHistoryEvents.length === 0 && (
              <div className="history-empty">No payments yet.</div>
            )}
            {allHistoryEvents.map((ev, i) => (
              <div key={i} className="history-item" onClick={() => navigate(`/debtor/${ev.debtorId}`)}>
                <div className="history-item-header">
                  <span className="history-name">{ev.name}</span>
                  <span className="history-date">{new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="history-amount">₱{(ev.amount ?? 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - Right Section */}
      <div className="calendar-main">
        {/* Top Header */}
        <div className="calendar-header">
          <div className="calendar-title-area">
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Records</h2>
          </div>

          <div className="view-filters">
            <span className="filter-label">View:</span>

            {/* Month Dropdown */}
            <div className="custom-dropdown-container">
              <div
                className="filter-select-ui"
                onClick={() => setDropdownOpen(dropdownOpen === 'month' ? null : 'month')}
              >
                {monthNames[month]} <ChevronRight size={14} className={`arrow-icon ${dropdownOpen === 'month' ? 'open' : ''}`} />
              </div>
              {dropdownOpen === 'month' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="dropdown-list"
                >
                  {monthNames.map((m, i) => (
                    <div
                      key={m}
                      className={`dropdown-item ${month === i ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentDate(new Date(year, i, 1));
                        setDropdownOpen(null);
                      }}
                    >
                      {m}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Year Dropdown */}
            <div className="custom-dropdown-container">
              <div
                className="filter-select-ui"
                onClick={() => setDropdownOpen(dropdownOpen === 'year' ? null : 'year')}
              >
                {year} <ChevronRight size={14} className={`arrow-icon ${dropdownOpen === 'year' ? 'open' : ''}`} />
              </div>
              {dropdownOpen === 'year' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="dropdown-list"
                >
                  {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => (
                    <div
                      key={y}
                      className={`dropdown-item ${year === y ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentDate(new Date(y, month, 1));
                        setDropdownOpen(null);
                      }}
                    >
                      {y}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="calendar-body">
          <div className="weekday-header">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
              <div key={d} className="weekday-label">{d}</div>
            ))}
          </div>

          <div className="days-grid">
            {calendarDays.map((item, idx) => {
              const events = getEventsForDay(item.day);
              const isToday = item.day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const hasEvents = events.length > 0;

              return (
                <div
                  key={idx}
                  className={`day-cell ${item.type} ${isToday ? 'active' : ''} ${hasEvents ? 'has-records' : ''}`}
                  onClick={() => hasEvents && setSelectedDayEvents({
                    date: `${monthNames[month]} ${item.day}, ${year}`,
                    events
                  })}
                >
                  <span className="cell-number">{item.day || ''}</span>
                  <div className="cell-events">
                    {events.slice(0, 3).map((ev, i) => (
                      <div
                        key={i}
                        className={`mini-event-tag ${ev.type}`}
                      >
                        <span className="mini-event-name">{ev.name}</span>
                      </div>
                    ))}
                    {events.length > 3 && (
                      <div className="more-indicator">+{events.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Day Detail Modal */}
      {selectedDayEvents && (
        <div className="modal-overlay" onClick={() => setSelectedDayEvents(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="day-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">{selectedDayEvents.date}</h3>
              <button className="btn-icon" onClick={() => setSelectedDayEvents(null)}><ArrowLeft size={20} /></button>
            </div>

            <div className="modal-scroll">
              <div className="events-list">
                {selectedDayEvents.events.map((ev, i) => (
                  <div
                    key={i}
                    className={`detail-event-item ${ev.type}`}
                    onClick={() => navigate(`/debtor/${ev.debtor.id}`)}
                  >
                    <div className="event-info">
                      <span className="event-name">{ev.name}</span>
                      <span className="event-type-badge">{ev.label || ev.type}</span>
                    </div>
                    <div className="event-money">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        {ev.amount !== undefined && (
                          <span className="amount">₱{(ev.amount ?? 0).toLocaleString()}</span>
                        )}
                        {ev.balance_after !== undefined && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>
                            Bal: ₱{(ev.balance_after ?? 0).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .calendar-container {
          display: flex;
          height: calc(100vh - 48px);
          background: var(--bg-page);
          border-radius: 32px;
          overflow: hidden;
          border: 1px solid var(--border);
          position: relative;
          padding-bottom: 0;
        }

        @media (max-width: 1024px) {
          .calendar-container {
            flex-direction: column;
            height: auto;
            border-radius: 20px;
            padding-bottom: 100px;
          }
        }

        /* Sidebar Styling */
        .calendar-sidebar {
          width: 280px;
          background: var(--bg-card);
          display: flex;
          flex-direction: column;
          padding: 24px;
          color: var(--text-primary);
          border-right: 1px solid var(--border);
        }

        @media (max-width: 1024px) {
          .calendar-sidebar {
            width: 100%;
            padding: 16px;
            border-right: none;
            border-bottom: 1px solid var(--border);
          }
        }

        .sidebar-dashboard-btn {
          background: var(--bg-page);
          color: var(--text-primary);
          border: 1px solid var(--border);
          padding: 14px 20px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 20px;
        }
        .sidebar-dashboard-btn:hover {
          transform: translateY(-2px);
        }
        .today-display {
          margin: 20px 0;
          text-align: center;
        }

        @media (max-width: 1024px) {
          .today-display {
            display: none;
          }
        }

        .today-number {
          font-size: 80px;
          font-weight: 800;
          line-height: 1;
          color: var(--accent);
          font-family: 'Montserrat', sans-serif;
          text-shadow: 0 0 40px rgba(0, 122, 255, 0.2);
        }
        .today-month {
          font-size: 16px;
          font-weight: 700;
          margin-top: 4px;
        }
        .sidebar-calendar-btn {
          background: var(--accent);
          color: white;
          border: none;
          padding: 14px 20px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 600;
          font-size: 15px;
          box-shadow: 0 8px 30px rgba(0, 122, 255, 0.2);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .sidebar-calendar-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }

        @media (max-width: 1024px) {
          .sidebar-calendar-btn {
            display: none;
          }
        }

        .history-section {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }

        @media (max-width: 1024px) {
          .history-section {
            margin-top: 20px;
            max-height: 300px;
          }
        }

        .history-title {
          font-size: 14px;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 16px;
        }
        .history-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-right: 8px;
        }
        .history-list::-webkit-scrollbar { width: 4px; }
        .history-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .history-empty {
          font-size: 13px;
          color: var(--text-muted);
          text-align: center;
          padding: 20px 0;
        }
        .history-item {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 12px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          border-left: 3px solid #30D158;
        }
        .history-item:hover {
          background: rgba(255, 255, 255, 0.06);
          transform: translateX(2px);
        }
        .history-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .history-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
        }
        .history-date {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
        }
        .history-amount {
          font-size: 14px;
          font-weight: 800;
          color: #30D158;
        }

        /* Main Content Styling */
        .calendar-main {
          flex: 1;
          background: var(--bg-page);
          padding: 20px 32px;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        @media (max-width: 768px) {
          .calendar-main {
            padding: 16px;
          }
        }

        /* Header Styling */
        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }

        @media (max-width: 768px) {
          .calendar-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        .view-filters {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .filter-label { font-size: 13px; font-weight: 700; color: var(--text-muted); }
        
        .custom-dropdown-container {
          position: relative;
        }
        .filter-select-ui {
          background: var(--bg-card);
          padding: 6px 12px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          border: 1px solid var(--border);
          transition: all 0.2s ease;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .filter-select-ui {
            padding: 4px 10px;
            font-size: 12px;
          }
        }
        .filter-select-ui:hover {
          transform: translateY(-1px);
        }
        .arrow-icon {
          transition: transform 0.2s ease;
          transform: rotate(90deg);
        }
        .arrow-icon.open {
          transform: rotate(-90deg);
        }
        
        .dropdown-list {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          width: 160px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 8px;
          z-index: 100;
          box-shadow: var(--shadow-lg);
          backdrop-filter: blur(10px);
        }
        .dropdown-item {
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dropdown-item:hover {
          background: rgba(255,255,255,0.05);
          color: var(--text-primary);
        }
        .dropdown-item.active {
          color: #FF5A36;
          background: rgba(255, 90, 54, 0.05);
        }

        /* Calendar Body Styling */
        .calendar-body {
          flex: 1;
          overflow-y: auto;
          padding-right: 4px;
        }
        .weekday-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          margin-bottom: 8px;
        }
        .weekday-label {
          text-align: center;
          font-size: 12px;
          font-weight: 800;
          color: #FF9F0A;
          padding: 4px;
        }

        @media (max-width: 768px) {
          .weekday-label {
            font-size: 10px;
          }
        }

        .days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 10px;
        }

        @media (max-width: 768px) {
          .days-grid {
            gap: 4px;
          }
        }

        .day-cell {
          background: var(--bg-card);
          min-height: clamp(60px, 12vh, 85px);
          border-radius: 14px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          border: 1px solid var(--border);
          transition: all 0.2s ease;
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .day-cell {
            min-height: 48px;
            padding: 4px;
            border-radius: 8px;
            gap: 2px;
          }
        }

        .day-cell.has-records {
          pointer-events: auto;
          cursor: pointer;
        }
        .day-cell.current.has-records:hover { 
          transform: translateY(-2px); 
        }
        .day-cell.prev, .day-cell.next { opacity: 0.15; }
        .day-cell.active { border: 2px solid var(--accent); box-shadow: 0 0 20px rgba(0, 122, 255, 0.1); }
        .cell-number { font-size: 16px; font-weight: 700; color: var(--text-primary); align-self: flex-end; }
        
        @media (max-width: 768px) {
          .cell-number { font-size: 12px; }
        }

        .cell-events {
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow: hidden;
        }
        .mini-event-tag {
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          background: rgba(255, 255, 255, 0.05);
          border-left: 2px solid #666;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 768px) {
          .mini-event-tag {
            font-size: 8px;
            padding: 1px 2px;
          }
          .mini-event-name {
            display: none;
          }
          .mini-event-tag {
            width: 100%;
            height: 3px;
            border-left: none;
            border-radius: 1.5px;
            margin-bottom: 1px;
          }
          .mini-event-tag.borrowed { background: #FF9F0A; }
          .mini-event-tag.due { background: #FF3B30; }
          .mini-event-tag.paid { background: #30D158; }
        }

        .mini-event-tag.borrowed { border-left-color: #FF9F0A; }
        .mini-event-tag.due { border-left-color: #FF3B30; }
        .mini-event-tag.paid { border-left-color: #30D158; }
        .mini-event-name { color: var(--text-primary); }
        
        .more-indicator {
          font-size: 9px;
          color: var(--text-muted);
          font-weight: 700;
          padding-left: 4px;
        }

        /* Modal Styling */
        .day-detail-modal {
          background: var(--bg-page);
          width: 95%;
          max-width: 440px;
          border-radius: 22px;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 85vh;
        }
        .modal-header {
          padding: 40px 24px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .modal-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }
        .modal-header .btn-icon {
          background: var(--bg-card);
          border: 1px solid var(--border);
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .modal-header .btn-icon:hover {
          transform: scale(1.1);
          color: var(--accent);
          border-color: var(--accent);
          box-shadow: var(--shadow-sm);
        }
        
        body.light-mode .modal-header .btn-icon {
          background: #FFFFFF;
          border-color: rgba(0, 0, 0, 0.08);
        }
        
        body.light-mode .modal-header .btn-icon:hover {
          background: #FFFFFF;
          color: var(--accent);
        }
        .modal-scroll {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }
        .events-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .detail-event-item {
          background: var(--bg-card);
          padding: 18px;
          border-radius: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-left: 4px solid #666;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .detail-event-item:hover {
          transform: scale(1.02);
        }
        .detail-event-item.borrowed { border-left-color: var(--accent); }
        .detail-event-item.due { border-left-color: #FF3B30; }
        .detail-event-item.paid { border-left-color: #30D158; }

        .event-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .event-type-badge {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
        }
        .event-money {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--text-secondary);
        }
        .event-money .amount {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .detail-event-item.paid .amount { color: #30D158; }
        .detail-event-item.borrowed .amount { color: #FF9F0A; }
      `}} />
      <MobileNav />
    </div>
  );
}
