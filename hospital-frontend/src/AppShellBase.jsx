import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { useConfirm } from './ConfirmDialog';

function AppShell({ roleLabel, nav, active, onNavigate, onLogout, children }) {
  const confirm = useConfirm();

  const requestLogout = async () => {
    const ok = await confirm('Are you sure you want to log out?', {
      title: 'Log out',
      confirmLabel: 'Yes, log out',
      cancelLabel: 'Stay logged in',
      danger: false,
    });
    if (ok) onLogout();
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <Logo />
        <nav className="nav" aria-label="Main">
          {nav.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-item${active === item.key ? ' is-active' : ''}`}
              aria-current={active === item.key ? 'page' : undefined}
              onClick={() => onNavigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <ThemeToggle />
          <div className="role-line">
            Signed in as <strong>{roleLabel}</strong>
          </div>
          <button type="button" className="btn btn-signout btn-sm" onClick={requestLogout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="main">
        <div className="main-inner">{children}</div>
      </main>
    </div>
  );
}

export default AppShell;