import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <div className="navbar-logo-icon">A</div>
          <span className="navbar-logo-text">Arc</span>
        </Link>
        <div className="navbar-actions">
          <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} />
            Debt Tracker
          </span>
        </div>
      </div>
    </nav>
  );
}
