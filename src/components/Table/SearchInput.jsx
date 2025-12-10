import { useState, useRef } from 'react';
import { Search } from 'lucide-react';
import UseUrlParamsManager from '../../hooks/UseUrlParamsManager';

const SearchInput = ({ placeholder = 'Buscar...' }) => {
  const url = new URLSearchParams(location.search);
  const { addParams } = UseUrlParamsManager();

  // Inicializar con valor existente en URL
  const [searchTerm, setSearchTerm] = useState(url.get('search') || '');
  const timeoutRef = useRef(null);

  const handleSearchChange = event => {
    const value = event.target.value;
    setSearchTerm(value);

    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce de 800ms
    timeoutRef.current = setTimeout(() => {
      if (!value.trim()) {
        // Limpiar parámetro si está vacío
        addParams({ search: '', page: 1 });
      } else {
        addParams({
          search: value.trim(),
          page: 1,
        });
      }
    }, 800);
  };

  return (
    <div style={styles.container}>
      <div style={styles.inputWrapper}>
        <Search size={18} style={styles.icon} />
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder={placeholder}
          style={styles.input}
        />
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '300px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
    left: '12px',
    color: '#6b7280',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '8px 12px 8px 40px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
};

export default SearchInput;
