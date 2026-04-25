import { Search } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Search by name...' }) {
  return (
    <div className="search-wrap">
      <Search size={16} className="search-icon" />
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
    </div>
  );
}
