import { ChevronLeft, ChevronRight } from 'lucide-react';

const TablePagination = ({ currentPage, totalItems, itemsPerPage, onPageChange, onLimitChange }) => {
  // Calcular páginas
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const from = totalItems > 0 ? (safePage - 1) * itemsPerPage + 1 : 0;
  const to = Math.min(safePage * itemsPerPage, totalItems);

  const handlePageChange = newPage => {
    if (newPage < 1 || newPage > totalPages) return;
    onPageChange(newPage);
  };

  const handleLimitChange = event => {
    const newLimit = parseInt(event.target.value);
    onLimitChange(newLimit);
  };

  return (
    <div style={styles.container}>
      <div style={styles.info}>
        {from}-{to} de {totalItems}
      </div>

      <div style={styles.controls}>
        <label style={styles.label}>
          Filas por página:
          <select value={itemsPerPage} onChange={handleLimitChange} style={styles.select}>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>

        <div style={styles.buttons}>
          <button
            onClick={() => handlePageChange(safePage - 1)}
            disabled={safePage === 1}
            style={{
              ...styles.button,
              ...(safePage === 1 ? styles.buttonDisabled : {}),
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <span style={styles.pageInfo}>
            Página {safePage} de {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(safePage + 1)}
            disabled={safePage === totalPages}
            style={{
              ...styles.button,
              ...(safePage === totalPages ? styles.buttonDisabled : {}),
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
    padding: '16px 24px',
    flexWrap: 'wrap',
    gap: '12px',
    borderTop: '1px solid var(--theme-border)',
    background: 'var(--theme-surface-2)',
  },
  info: {
    fontSize: '14px',
    color: 'var(--theme-text-3)',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  label: {
    fontSize: '14px',
    color: 'var(--theme-text-2)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
  },
  select: {
    padding: '6px 12px',
    border: '1px solid var(--theme-input-border)',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'var(--theme-input-bg)',
    color: 'var(--theme-text-2)',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    outline: 'none',
  },
  buttons: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  button: {
    padding: '8px',
    backgroundColor: '#37a4b7',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  buttonDisabled: {
    backgroundColor: 'var(--theme-border)',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  pageInfo: {
    fontSize: '14px',
    color: 'var(--theme-text-2)',
    minWidth: '140px',
    textAlign: 'center',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
};

export default TablePagination;
