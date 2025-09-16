// components/app/NewItemModal.js
import React, { useState, useEffect, useRef } from 'react';
import styles from './NewItemModal.module.css';
import { X, FolderPlus, FileIcon, FileText, AlertCircle } from 'lucide-react';

/**
 * Props:
 *  - isOpen
 *  - onClose()
 *  - onCreate({ type: 'folder'|'file'|'text', name: string }) -> Promise<{success:boolean,error?:string}>
 *  - existingNames: string[] (names in current directory for duplicate validation)
 */
export function NewItemModal({ isOpen, onClose, onCreate, existingNames = [], initialType = 'folder' }) {
  const [name, setName] = useState('');
  const [type, setType] = useState(initialType || 'folder');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visible, setVisible] = useState(isOpen);
  const [closing, setClosing] = useState(false);
  const inputRef = useRef(null);
  const lastTypeRef = useRef('folder');

  const ILLEGAL = /[\\/:*?"<>|]/; // Windows + common FS invalid characters

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setClosing(false);
      setType(initialType || 'folder');
      if (!name) {
        if (initialType === 'text') setName('untitled.txt');
      }
      setTimeout(() => inputRef.current?.focus(), 30);
    } else if (visible) {
      setClosing(true);
      const t = setTimeout(() => {
        setVisible(false);
        setName('');
        setType(initialType || 'folder');
        setError('');
        setIsSubmitting(false);
        setClosing(false);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [isOpen, initialType, name, visible]);

  // Auto append .txt for text type if user did not specify extension
  useEffect(() => {
    if (lastTypeRef.current !== type && type === 'text') {
      // If previous type wasn't text and current name has no dot, suggest base name
      if (name && !name.includes('.')) {
        setName(prev => prev + '.txt');
      }
    }
    lastTypeRef.current = type;
  }, [type]);

  const validate = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return 'Name required';
    if (ILLEGAL.test(trimmed)) return 'Name contains illegal characters ( \\ / : * ? " < > | )';
    // Disallow path segments
    if (trimmed.includes('..')) return 'Name cannot contain ..';
    // Duplicate (case-insensitive)
    if (existingNames.map(n => n.toLowerCase()).includes(trimmed.toLowerCase())) return 'An item with that name already exists';
    if (trimmed.length > 255) return 'Name too long';
    return '';
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const trimmed = name.trim();
    const v = validate(trimmed);
    setError(v);
    if (v) return;

    setIsSubmitting(true);
    setError('');
    try {
      const res = await onCreate({ type, name: trimmed });
      if (!res?.success) {
        setError(res?.error || 'Creation failed');
        setIsSubmitting(false);
        return;
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Unexpected error');
      setIsSubmitting(false);
    }
  };

  const pristineBaseRef = useRef('');
  const [userModified, setUserModified] = useState(false);

  // Track user manual edits
  useEffect(() => {
    // When modal opens reset pristine tracking
    if (isOpen && !visible) {
      pristineBaseRef.current = '';
      setUserModified(false);
    }
  }, [isOpen]);

  const handleNameChange = (val) => {
    setName(val);
    if (!userModified) setUserModified(true);
    if(error) setError('');
  };

  const setTypeAndMaybeAdjustName = (next) => {
    // If switching into text type: only append .txt if user hasn't already provided an extension
    if (next === 'text') {
      setName(prev => {
        if (!prev) {
          pristineBaseRef.current = 'untitled';
          return 'untitled.txt';
        }
        const hasDot = /\.[^.]+$/.test(prev);
        if (!hasDot) {
          pristineBaseRef.current = prev; // remember base for potential reversal
          return prev + '.txt';
        }
        return prev;
      });
    } else if (type === 'text' && next !== 'text') {
      // Leaving text: only strip .txt if it matches the pristine base we recorded (not if user customized)
      setName(prev => {
        if (/\.txt$/i.test(prev)) {
          const base = prev.replace(/\.txt$/i, '');
          if (base === pristineBaseRef.current) return base; // revert
        }
        return prev; // keep user custom naming (like my.note.txt)
      });
    }
    setType(next);
  };

  if (!visible) return null;

  return (
    <div className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className={`${styles.modal} ${closing ? styles.modalClosing : ''}`} onSubmit={handleSubmit} onKeyDown={(e)=>{ if(e.key==='Escape'){ e.stopPropagation(); onClose(); }}}>
        <div className={styles.header}>
          <h2 className={styles.title}>Create New Item</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="new-item-name">Name</label>
          <div className={styles.inputRow}>
            <div className={styles.inputWrapper}>
              <input
                id="new-item-name"
                ref={inputRef}
                className={styles.input}
                value={name}
                placeholder={type === 'folder' ? 'New folder' : type === 'file' ? 'New file' : 'New text document'}
                onChange={(e) => handleNameChange(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
          <div className={styles.hint}>Illegal: \\ / : * ? " &lt; &gt; | — duplicates ignored (case-insensitive)</div>
          {error && (
            <div className={styles.error}><AlertCircle size={14} style={{marginRight:4}} /> {error}</div>
          )}
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.label}>Type</span>
          <div className={styles.typeSelector}>
            <button type="button" className={`${styles.typeOption} ${type==='folder'?styles.typeOptionActive:''}`} onClick={()=>setTypeAndMaybeAdjustName('folder')}>
              <FolderPlus size={16} /> Folder
            </button>
            <button type="button" className={`${styles.typeOption} ${type==='file'?styles.typeOptionActive:''}`} onClick={()=>setTypeAndMaybeAdjustName('file')}>
              <FileIcon size={16} /> File
            </button>
            <button type="button" className={`${styles.typeOption} ${type==='text'?styles.typeOptionActive:''}`} onClick={()=>setTypeAndMaybeAdjustName('text')}>
              <FileText size={16} /> Text
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className={styles.primaryBtn} disabled={isSubmitting || !!validate(name.trim())}>
            {isSubmitting ? <div className={styles.spinner}/> : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewItemModal;
