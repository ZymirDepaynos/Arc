import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThemeToggle({ asMenuItem, onClick }) {
  const [isLight, setIsLight] = useState(() => document.body.classList.contains('light-mode'));

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.body.classList.add('light-mode');
      setIsLight(true);
    }
  }, []);

  const toggleTheme = (e) => {
    if (e) e.stopPropagation();
    const newLight = !isLight;
    setIsLight(newLight);
    if (newLight) {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
    if (onClick) onClick();
  };

  if (asMenuItem) {
    return (
      <button
        onClick={toggleTheme}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px', borderRadius: 10, border: 'none',
          background: 'transparent', color: 'var(--text-primary)',
          fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-light)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {isLight ? (
          <>
            <Moon size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span>Switch to Dark Mode</span>
          </>
        ) : (
          <>
            <Sun size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span>Switch to Light Mode</span>
          </>
        )}
      </button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="theme-toggle-btn"
      title="Toggle Theme"
    >
      {isLight ? <Moon size={18} /> : <Sun size={18} />}
    </motion.button>
  );
}
