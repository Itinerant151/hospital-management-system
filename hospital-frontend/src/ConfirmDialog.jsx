import { useState, useCallback, useEffect, createContext, useContext } from 'react';

const ConfirmContext = createContext(null);

// Usage:
//   const confirm = useConfirm();
//   if (await confirm('Delete this?')) { ... }
//   await confirm('Log out?', { title: 'Log out', confirmLabel: 'Yes, log out', danger: false })
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { message, options, resolve }

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setState({ message, options, resolve });
    });
  }, []);

  const handle = (result) => {
    if (!state) return;
    state.resolve(result);
    setState(null);
  };

  // Pressing Escape cancels the dialog
  useEffect(() => {
    if (!state) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        state.resolve(false);
        setState(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state]);

  const options = state?.options || {};
  const danger = options.danger !== false;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" onClick={() => handle(false)}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            {options.title && <h2 className="confirm-title">{options.title}</h2>}
            <p>{state.message}</p>
            <div className="confirm-actions">
              <button type="button" className="btn btn-quiet" onClick={() => handle(false)} autoFocus>
                {options.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => handle(true)}
              >
                {options.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}