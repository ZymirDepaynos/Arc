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

  const allHistoryEvents = debtors
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

    debtors.forEach(d => {
      // Borrowing Event
      if (d.date_borrowed && d.date_borrowed.startsWith(dateStr)) {
        events.push({
          type: 'borrowed',
          debtor: d,
          name: d.name,
          amount: d.balance + d.advance_payment
        });
      }
      // Due Date Event
      if (d.due_date && d.due_date.startsWith(dateStr)) {
        events.push({
          type: 'due',
          debtor: d,
          name: d.name
        });
      }
      // Payment Events
      if (Array.isArray(d.payment_history)) {
        d.payment_history.forEach(p => {
          if (p.date && p.date.startsWith(dateStr)) {
            events.push({
              type: 'paid',
              debtor: d,
              name: d.name,
              amount: p.amount,
              balance_after: p.balance_after
            });
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
        <button className="sidebar-dashboard-btn" onClick={() => navigate('/')}>
          <GridIcon size={20} /> Dashboard
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
                  <span className="history-date">{new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="history-amount">₱{ev.amount.toLocaleString()}</div>
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
                      <span className="event-type-badge">{ev.type}</span>
                    </div>
                    <div className="event-money">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        {ev.amount !== undefined && (
                          <span className="amount">₱{ev.amount.toLocaleString()}</span>
                        )}
                        {ev.balance_after !== undefined && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>
                            Bal: ₱{ev.balance_after.toLocaleString()}
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
        }

        /* Sidebar Styling */
        .calendar-sidebar {
          width: 280px;
          background: var(--bg-card);
          display: flex;
          flex-direction: column;
          padding: 32px;
          color: var(--text-primary);
          border-right: 1px solid var(--border);
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

        .history-section {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
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

        .sidebar-footer {
          margin-top: auto;
        }
        .sidebar-link {
          background: none;
          border: none;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          padding: 12px 0;
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

        /* Header Styling */
        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
        }
        .view-tabs {
          display: flex;
          background: var(--bg-card);
          padding: 4px;
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        .view-tab {
          padding: 8px 20px;
          border-radius: 10px;
          border: none;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          background: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .view-tab.active {
          background: #FF5A36;
          color: white;
          box-shadow: 0 4px 12px rgba(255, 90, 54, 0.3);
        }

        .view-filters {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .filter-label { font-size: 13px; font-weight: 700; color: var(--text-muted); }
        
        .custom-dropdown-container {
          position: relative;
        }
        .filter-select-ui {
          background: var(--bg-card);
          padding: 8px 16px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          border: 1px solid var(--border);
          transition: all 0.2s ease;
          cursor: pointer;
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

        .header-icons {
          display: flex;
          align-items: center;
          gap: 24px;
          color: var(--text-secondary);
        }
        .notification-btn { position: relative; }
        .notification-btn .badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #FF5A36;
          color: white;
          font-size: 9px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #000;
        }
        .user-avatar {
          width: 44px;
          height: 44px;
          background: #FF5A36;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
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
        .days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 10px;
        }
        .day-cell {
          background: var(--bg-card);
          min-height: 85px;
          border-radius: 14px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          border: 1px solid var(--border);
          transition: all 0.2s ease;
          pointer-events: none;
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
          width: 90%;
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
          padding: 56px 28px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .modal-title {
          font-size: 20px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
        }
        .modal-header .btn-icon {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
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
          background: rgba(255, 255, 255, 0.12);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateX(-3px) scale(1.05);
          color: #FFF;
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
    </div>
  );
}
