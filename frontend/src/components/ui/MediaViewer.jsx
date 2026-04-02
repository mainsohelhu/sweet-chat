import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

export default function MediaViewer({ url, type, onClose }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 16, right: 16, zIndex: 100000, width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
      >
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Media */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '90vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {type === 'image' ? (
          <img
            src={url}
            alt="Preview"
            style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
          />
        ) : (
          <video
            src={url}
            controls
            autoPlay
            style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
          />
        )}
      </div>

      {/* Download */}
      <a
        href={url}
        download
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', color: 'white', padding: '8px 16px', borderRadius: 12, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download
      </a>
    </div>,
    document.body  // Portal renders directly into body — escapes ALL stacking contexts
  );
}