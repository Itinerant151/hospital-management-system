import { useState, useEffect } from 'react';
import Login from './Login';
import Signup from './Signup';
import AdminPage from './AdminPage';
import PatientPage from './PatientPage';
import DoctorPage from './DoctorPage';

function App() {
  const [role, setRole] = useState(null);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    if (storedRole) {
      setRole(storedRole);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setRole(null);
  };

  const handleLoginSuccess = (newRole) => {
    setRole(newRole);
  };

  // Not logged in: show Login or Signup
  if (!role) {
    if (showSignup) {
      return <Signup onSignupSuccess={() => setShowSignup(false)} />;
    }
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onShowSignup={() => setShowSignup(true)}
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

  // Fallback: unrecognized role, force logout
  handleLogout();
  return null;
}

export default App;