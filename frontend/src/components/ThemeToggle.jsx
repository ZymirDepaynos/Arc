import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const [isLight, setIsLight] = useState(() => document.body.classList.contains('light-mode'));

  useEffect(() => {
    
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.body.classList.add('light-mode');
      setIsLight(true);
    }
  }, []);

  const toggleTheme = () => {
    const newLight = !isLight;
    setIsLight(newLight);
    if (newLight) {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    }
  };

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
