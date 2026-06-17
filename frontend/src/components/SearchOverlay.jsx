import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { parseNaturalDate, formatDisplayDate } from "../utils/dateUtils";
import { getStatusLabel } from "../utils/format";

export default function SearchOverlay({ open, onClose, customers }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const parsedDate = useMemo(() => parseNaturalDate(query), [query]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
    }
  }, [open]);

  const filtered = customers
    .filter((d) => {
      const cleanSearch = query.toLowerCase().trim();
      if (!cleanSearch) return true;

      const s = cleanSearch.startsWith("#")
        ? cleanSearch.substring(1)
        : cleanSearch;

      if (parsedDate) {
        const storedDate = d.date_borrowed
          ? d.date_borrowed.substring(0, 10)
          : "";
        if (storedDate === parsedDate) return true;
      }

      const nameMatch =
        d.name.toLowerCase().startsWith(s) ||
        d.name
          .toLowerCase()
          .split(" ")
          .some((word) => word.startsWith(s));

      return (
        nameMatch ||
        d.id.toString().includes(s) ||
        (d.receipt_numbers &&
          d.receipt_numbers.some((r) => r.toLowerCase().includes(s)))
      );
    })
    .slice(0, 8);

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
                placeholder="Search Name, Receipt, or Date..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="overlay-search-input"
              />
              {query && parsedDate && (
                <div
                  style={{
                    position: "absolute",
                    right: 48,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 11,
                    color: "var(--accent)",
                    fontWeight: 700,
                  }}
                >
                  ✓ {formatDisplayDate(parsedDate)}
                </div>
              )}
              <button className="close-search-btn" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="search-results-area">
            {query.length > 0 && filtered.length === 0 ? (
              <div className="no-results">No customers found for "{query}"</div>
            ) : (
              <div className="results-list">
                {filtered.map((customer) => (
                  <motion.div
                    key={customer.id}
                    className="search-result-item"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      navigate(`/customer/${customer.id}`);
                      onClose();
                    }}
                  >
                    <div className="result-avatar">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="result-info">
                      <div className="result-name">{customer.name}</div>
                      <div className="result-status">
                        {getStatusLabel(customer.status)}
                      </div>
                    </div>
                    <ChevronRight size={18} className="result-arrow" />
                  </motion.div>
                ))}
              </div>
            )}

            {query.length === 0 && (
              <div className="search-hint">
                Type a name to start searching...
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
