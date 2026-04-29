import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, User, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchOverlay({ open, onClose, debtors }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
    }
  }, [open]);

  const filtered = debtors.filter(d => {
    const s = query.toLowerCase();
    return d.name.toLowerCase().startsWith(s) || 
           d.name.toLowerCase().split(' ').some(word => word.startsWith(s));
  }).slice(0, 8);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="search-overlay-wrapper"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="search-overlay-content">
          <div className="search-overlay-header">
            <div className="search-input-group">
              <Search size={20} className="search-icon" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search debtors..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="overlay-search-input"
              />
              <button className="close-search-btn" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="search-results-area">
            {query.length > 0 && filtered.length === 0 ? (
              <div className="no-results">No debtors found for "{query}"</div>
            ) : (
              <div className="results-list">
                {filtered.map(debtor => (
                  <motion.div 
                    key={debtor.id}
                    className="search-result-item"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      navigate(`/debtor/${debtor.id}`);
                      onClose();
                    }}
                  >
                    <div className="result-avatar">
                      {debtor.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="result-info">
                      <div className="result-name">{debtor.name}</div>
                      <div className="result-status">{debtor.status}</div>
                    </div>
                    <ChevronRight size={18} className="result-arrow" />
                  </motion.div>
                ))}
              </div>
            )}
            
            {query.length === 0 && (
              <div className="search-hint">Type a name to start searching...</div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
