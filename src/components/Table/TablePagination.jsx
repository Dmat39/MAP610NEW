import { useLocation } from 'react-router-dom';
import UseUrlParamsManager from '../../hooks/UseUrlParamsManager';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TablePagination = ({ count }) => {
  const { addParams } = UseUrlParamsManager();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  // Obtener página y límite desde URL
  const page = parseInt(queryParams.get('page')) || 1;
  const limit = parseInt(queryParams.get('limit')) || 20;

  // Calcular páginas
  const totalPages = Math.ceil(count / limit);
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, count);

  const handlePageChange = newPage => {
    if (newPage < 1 || newPage > totalPages) return;
    addParams({ page: newPage, limit });
  };

  const handleLimitChange = event => {
    const newLimit = parseInt(event.target.value);
    addParams({ page: 1, limit: newLimit });
  };

  return (
    <div style={styles.container}>
      <div style={styles.info}>
        {from}-{to} de {count}
      </div>

      <div style={styles.controls}>
        <label style={styles.label}>
          Filas por página:
          <select value={limit} onChange={handleLimitChange} style={styles.select}>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>

        <div style={styles.buttons}>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            style={{
              ...styles.button,
              ...(page === 1 ? styles.buttonDisabled : {}),
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <span style={styles.pageInfo}>
            Página {page} de {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            style={{
              ...styles.button,
              ...(page === totalPages ? styles.buttonDisabled : {}),
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    flexWrap: 'wrap',
    gap: '12px',
  },
  info: {
    fontSize: '14px',
    color: '#6b7280',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  label: {
    fontSize: '14px',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  select: {
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  buttons: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  button: {
    padding: '6px',
    backgroundColor: '#4052af',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'background-color 0.2s',
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
    cursor: 'not-allowed',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#374151',
    minWidth: '120px',
    textAlign: 'center',
  },
};

export default TablePagination;
