import React, { useState, useEffect, useRef } from 'react';

interface SaveSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

const SaveSelectionModal: React.FC<SaveSelectionModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(''); // Reset name when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100); // Small delay to ensure modal is rendered
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div className="save-selection-modal-overlay">
      <div className="save-selection-modal">
        <div className="modal-header">
          <h3>Save File Selection</h3>
          <button className="icon-button close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-content">
          <p>Enter a name for this selection set:</p>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., 'Frontend Components'"
            className="new-workspace-input" // Reusing style for consistency
          />
        </div>
        <div className="modal-actions">
          <button className="primary cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary confirm-button"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            Save Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveSelectionModal;
  