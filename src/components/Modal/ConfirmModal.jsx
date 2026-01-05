import React from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';
import './ConfirmModal.css';

const ConfirmModal = ({ isOpen, onConfirm, onCancel, title, message, confirmText = 'Aceptar', cancelText = 'Cancelar', type = 'warning' }) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'logout':
        return <LogOut size={48} strokeWidth={1.5} />;
      case 'warning':
        return <AlertTriangle size={48} strokeWidth={1.5} />;
      default:
        return <AlertTriangle size={48} strokeWidth={1.5} />;
    }
  };

  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onCancel} title="Cerrar">
          <X size={20} />
        </button>

        <div className={`modal-icon-container ${type}`}>
          {getIcon()}
        </div>

        <div className="modal-content">
          <h2 className="modal-title">{title}</h2>
          <p className="modal-message">{message}</p>
        </div>

        <div className="modal-actions">
          <button className="modal-btn modal-btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="modal-btn modal-btn-confirm" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
