import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// A pop-up window that sits on top of the page. Closes with the Close button, a click outside, or Escape.
function Overlay({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={`overlay-box${wide ? ' overlay-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head no-print">
          <h2>{title}</h2>
          <button type="button" className="btn btn-quiet btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="overlay-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default Overlay;