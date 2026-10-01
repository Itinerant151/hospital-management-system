import Logo from './Logo';

function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth">
      <aside className="auth-aside">
        <Logo size={44} />
        <div>
          <h1 className="auth-headline">Patients, doctors and appointments in one place.</h1>
          <svg className="pulse" viewBox="0 0 600 120" aria-hidden="true">
            <path
              className="pulse-line"
              pathLength="1"
              d="M0 60H150L175 60L195 20L225 100L250 60H330L350 60L370 30L392 85L410 60H600"
            />
          </svg>
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <h2>{title}</h2>
          {subtitle && <p className="sub">{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}

export default AuthLayout;
