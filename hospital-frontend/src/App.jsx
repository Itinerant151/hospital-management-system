import { useState, useEffect } from 'react';
import Login from './Login';
import Signup from './Signup';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import AdminPage from './AdminPage';
import PatientPage from './PatientPage';
import DoctorPage from './DoctorPage';
import ReceptionistPage from './ReceptionistPage';

// A password reset link looks like http://localhost:5173/?reset=TOKEN
function getResetToken() {
  return new URLSearchParams(window.location.search).get('reset');
}

function App() {
  const [role, setRole] = useState(null);
  const [resetToken] = useState(getResetToken);
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

  // Logged in: show the correct page based on role
  if (role === 'ADMIN') {
    return <AdminPage onLogout={handleLogout} />;
  }

  if (role === 'PATIENT') {
    return <PatientPage onLogout={handleLogout} />;
  }

  if (role === 'DOCTOR') {
    return <DoctorPage onLogout={handleLogout} />;
  }

  if (role === 'RECEPTIONIST') {
    return <ReceptionistPage onLogout={handleLogout} />;
  }

  handleLogout();
  return null;
}

export default App;