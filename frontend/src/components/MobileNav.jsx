import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, History, Plus, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MobileNav({ onAddClick }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Calendar, label: 'Calendar', path: '/calendar' },
    { icon: Plus, label: 'Add', action: onAddClick, isCenter: true },
    { icon: History, label: 'History', path: '/history' },
    { icon: Search, label: 'Search', action: 'search' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="mobile-nav-shell">
      <div className="mobile-nav-container">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={index}
              whileTap={{ scale: 0.9 }}
              className={`mobile-nav-item ${isActive(item.path) ? 'active' : ''} ${item.isCenter ? 'center-fab' : ''}`}
              onClick={() => {
                if (item.path) navigate(item.path);
                if (item.action === onAddClick) onAddClick();
                if (item.action === 'export') window.dispatchEvent(new CustomEvent('trigger-export'));
                if (item.action === 'search') window.dispatchEvent(new CustomEvent('trigger-search-focus'));
              }}
            >
              <div className="nav-icon-wrapper">
                <Icon size={item.isCenter ? 24 : 22} strokeWidth={isActive(item.path) ? 2.5 : 2} />
              </div>
              <span className="nav-label">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
