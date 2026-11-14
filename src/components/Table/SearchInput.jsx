import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import UseUrlParamsManager from '../../hooks/UseUrlParamsManager';

/**
 * Buscador con dos modos:
 * - Controlado (`value` + `onChange`): filtra en memoria, sin tocar la URL. Lo usa, por ejemplo, Radios GPS.
 * - Por URL (sin `onChange`): escribe `?search=` con 800 ms de espera. Lo usan las tablas paginadas en el backend.
 */
const SearchInput = ({ placeholder = 'Buscar...', value, onChange, debounceMs = 250 }) => {
  const controlado = typeof onChange === 'function';
  const url = new URLSearchParams(location.search);
  const { addParams } = UseUrlParamsManager();

  const [searchTerm, setSearchTerm] = useState(controlado ? value ?? '' : url.get('search') || '');
  const timeoutRef = useRef(null);

  // Si el padre limpia o cambia el valor (p. ej. "limpiar filtros"), el input lo refleja
  useEffect(() => {
    if (controlado && (value ?? '') !== searchTerm) setSearchTerm(value ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const handleSearchChange = event => {
    const nuevo = event.target.value;
    setSearchTerm(nuevo);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (controlado) {
      timeoutRef.current = setTimeout(() => onChange(nuevo), debounceMs);
      return;
    }

    // Debounce de 800ms
    timeoutRef.current = setTimeout(() => {
      if (!nuevo.trim()) {
        // Limpiar parámetro si está vacío
        addParams({ search: '', page: 1 });
      } else {
        addParams({
          search: nuevo.trim(),
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
          type="search"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder={placeholder}
          aria-label={placeholder}
          style={styles.input}
        />
      </div>
    </div>
  );
};

const styles = {
  container: {
    width: '240px',
    minWidth: '200px',
    flexShrink: 0,
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
