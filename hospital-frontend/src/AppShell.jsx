import { useState } from 'react';
import AppShellBase from './AppShellBase';

// Wraps the original shell and adds a Back button that returns to the
// section you were on before. Works for every role's page.
function AppShell({ active, onNavigate, children, ...rest }) {
  const [history, setHistory] = useState([]);

  const handleNavigate = (key) => {
    if (key !== active) {
      setHistory((h) => [...h.slice(-19), active]);
    }
    onNavigate(key);
  };

  const handleBack = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    onNavigate(previous);
  };

  const nav = rest.nav || [];
  const previousKey = history[history.length - 1];
  const previousLabel = nav.find((item) => item.key === previousKey)?.label;

  return (
    <AppShellBase {...rest} active={active} onNavigate={handleNavigate}>
      {history.length > 0 && (
        <button type="button" className="btn btn-quiet" style={{ marginBottom: 12 }} onClick={handleBack}>
          &larr; Back{previousLabel ? ` to ${previousLabel}` : ''}
        </button>
      )}
      {children}
    </AppShellBase>
  );
}

export default AppShell;