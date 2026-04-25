import { Link } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <Link to="/" className="sidebar-logo">
        <div className="sidebar-logo-icon">A</div>
        <span className="sidebar-logo-text">Arc</span>
      </Link>

      {/* Spacer */}
      <div style={{ flex: 1 }}></div>
    </aside>
  );
}
