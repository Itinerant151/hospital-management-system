import { useState, useEffect } from 'react';
import Login from './Login';
import Signup from './Signup';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import AdminPage from './AdminPage';
import PatientPage from './PatientPage';
import DoctorPage from './DoctorPage';
import ReceptionistPage from './ReceptionistPage';
import LaboratoryStaffPage from './LaboratoryStaffPage';
import IdCardLauncher from './IdCardLauncher';
import BackupLauncher from './BackupLauncher';
import VerifyStaff from './VerifyStaff';
import VerifyEmail from './VerifyEmail';

// A password reset link looks like http://localhost:5173/?reset=TOKEN
function getResetToken() {
  return new URLSearchParams(window.location.search).get('reset');
}

// A staff verification link looks like http://localhost:5173/?verify=MC-S-1A2B3C
function getVerifyParams() {
  const params = new URLSearchParams(window.location.search);
  return { active: params.has('verify'), code: params.get('verify') || '' };
}

// An email verification link looks like http://localhost:5173/?verifyEmail=TOKEN
function getVerifyEmailParams() {
  const params = new URLSearchParams(window.location.search);
  return { active: params.has('verifyEmail'), token: params.get('verifyEmail') || '' };
}

function App() {
  const [role, setRole] = useState(null);
  const [resetToken] = useState(getResetToken);
  const [verify] = useState(getVerifyParams);
  const [verifyEmail] = useState(getVerifyEmailParams);
  const [view, setView] = useState(() => (getResetToken() ? 'reset' : 'login'));
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    if (storedRole && !getResetToken()) {
      setRole(storedRole);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    setRole(null);
    setView('login');
  };

  const handleLoginSuccess = (newRole) => {
    setNotice('');
    setRole(newRole);
  };

  const handleResetDone = () => {
    window.history.replaceState({}, '', window.location.pathname);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    setNotice('Password updated. Log in with your new password.');
    setView('login');
  };

  // Public staff verification page (works whether or not you are logged in)
  if (verify.active) {
    return (
      <VerifyStaff
        initialCode={verify.code}
        onBack={() => { window.location.href = window.location.pathname; }}
      />
    );
  }

  // Email verification page (opened from the link we send after signup)
  if (verifyEmail.active) {
    return (
      <VerifyEmail
        initialEmail={verifyEmail.token}
        onDone={() => { window.location.href = window.location.pathname; }}
      />
    );
  }

  // Not logged in: show login, signup or the password reset screens
  if (!role) {
    if (view === 'reset') {
      return <ResetPassword token={resetToken} onDone={handleResetDone} />;
    }
    if (view === 'signup') {
      return <Signup onSignupSuccess={() => setView('login')} />;
    }
    if (view === 'forgot') {
      return <ForgotPassword onBack={() => setView('login')} />;
    }
    return (
      <Login
        notice={notice}
        onLoginSuccess={handleLoginSuccess}
        onShowSignup={() => setView('signup')}
        onShowForgot={() => setView('forgot')}
      />
    );
  }

  // Logged in: every page also gets the ID Card button (and Backup for admin)
  const withExtras = (page) => (
    <>
      {page}
      <IdCardLauncher role={role} />
      {role === 'ADMIN' && <BackupLauncher />}
    </>
  );

  if (role === 'ADMIN') {
    return withExtras(<AdminPage onLogout={handleLogout} />);
  }

  if (role === 'PATIENT') {
    return withExtras(<PatientPage onLogout={handleLogout} />);
  }

  if (role === 'DOCTOR') {
    return withExtras(<DoctorPage onLogout={handleLogout} />);
  }

  if (role === 'RECEPTIONIST') {
    return withExtras(<ReceptionistPage onLogout={handleLogout} />);
  }

  if (role === 'LAB_STAFF') {
    return withExtras(<LaboratoryStaffPage onLogout={handleLogout} />);
  }

  handleLogout();
  return null;
}

export default App;