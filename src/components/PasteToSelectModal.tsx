      // src/components/PasteToSelectModal.tsx
import React, { useState } from 'react';

interface PasteToSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (pastedText: string) => void;
}

const PasteToSelectModal: React.FC<PasteToSelectModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [pastedText, setPastedText] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleSelectClick = () => {
    onSelect(pastedText);
    onClose();
  };

  return (
    <div className="paste-to-select-modal-overlay">
      <div className="paste-to-select-modal">
        <div className="modal-header">
          <h3>Dosya Yollarını Yapıştırarak Seç</h3>
          <button className="icon-button close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-content">
          <p>
            Her satırın başında '#' olacak şekilde dosya yolları listesini aşağıya yapıştırın.
          </p>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="# client/src/features/feature/Component.tsx..."
            rows={10}
          />
        </div>
        <div className="modal-actions">
          <button className="primary cancel-button" onClick={onClose}>
            İptal
          </button>
          <button className="primary confirm-button" onClick={handleSelectClick}>
            Dosyaları Seç
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasteToSelectModal;
    