import { useState, useEffect } from 'react';
import api from './api';
import PasswordField from './PasswordField';

// onPasswordChanged is optional: the patient page uses it to hide its "temporary password" banner
function AccountSettings({ onPasswordChanged }) {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [role, setRole] = useState('');
  const [temporary, setTemporary] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Change-password form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      const response = await api.get('/account/me');
      setRole(response.data.role);
      setTemporary(Boolean(response.data.temporaryPassword));
      setUsername(response.data.username);
      setEmail(response.data.email || '');
      setLoadError('');
      setLoaded(true);
    } catch (err) {
      setLoadError(
        err.response?.data?.message || 'Could not load your account. Log out, log back in and try again.'
      );
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!currentPassword) {
      setError('Enter your current password to save changes.');
      return;
    }

    try {
      const response = await api.put('/account', { username, email, currentPassword });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.username);
      setUsername(response.data.username);
      setEmail(response.data.email || '');
      setCurrentPassword('');
      setMessage('Account updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update your account.');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMessage('');
    setPwError('');

    if (!oldPassword) {
      setPwError('Enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('The new password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('The two new passwords do not match.');
      return;
    }

    try {
      await api.put('/account/password', { currentPassword: oldPassword, newPassword });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTemporary(false);
      setPwMessage('Password changed. Use the new password the next time you log in.');
      if (onPasswordChanged) onPasswordChanged();
    } catch (err) {
      setPwError(err.response?.data?.message || 'Could not change your password.');
    }
  };

  if (loadError) {
    return (
      <p className="alert alert-error" role="alert">
        {loadError}
      </p>
    );
  }

  if (!loaded) return <p className="muted">Loading your account...</p>;

  return (
    <div>
      <div className="page-head">
        <h1>My account</h1>
        <p>Change your username, email or password.</p>
      </div>

      {temporary && (
        <p className="alert alert-warn" role="alert">
          You are using a temporary password that hospital staff set for you. Please choose your own password below.
        </p>
      )}

      <section className="panel">
        <h2 className="panel-title">Login details</h2>
        <form className="form-grid" onSubmit={handleSave} noValidate>
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <small className="field-hint">3 to 30 letters, numbers, dots, dashes or underscores.</small>
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <small className="field-hint">Used to reset your password.</small>
          </label>
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setError('');
            }}
            autoComplete="current-password"
            hint="Needed to confirm any change."
          />
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Save changes
            </button>
          </div>
        </form>
        {error && (
          <p className="alert alert-error" role="alert" style={{ marginTop: '16px', marginBottom: 0 }}>
            {error}
          </p>
        )}
        {message && (
          <p className="alert alert-success" style={{ marginTop: '16px', marginBottom: 0 }}>
            {message}
          </p>
        )}
      </section>

      <section className="panel">
        <div className="list-head">
          <h2 className="panel-title">Password</h2>
          {role === 'PATIENT' && (
            temporary
              ? <span className="badge badge-partial">Temporary password</span>
              : <span className="badge badge-completed">Set by you</span>
          )}
        </div>
        <form className="form-grid" onSubmit={handlePasswordChange} noValidate>
          <PasswordField
            label={temporary ? 'Temporary password' : 'Current password'}
            value={oldPassword}
            onChange={(e) => {
              setOldPassword(e.target.value);
              setPwError('');
            }}
            autoComplete="current-password"
            hint={temporary ? 'The one staff gave you.' : undefined}
          />
          <PasswordField
            label="New password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setPwError('');
            }}
            autoComplete="new-password"
            hint="At least 8 characters."
          />
          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setPwError('');
            }}
            autoComplete="new-password"
          />
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Change password
            </button>
          </div>
        </form>
        {pwError && (
          <p className="alert alert-error" role="alert" style={{ marginTop: '16px', marginBottom: 0 }}>
            {pwError}
          </p>
        )}
        {pwMessage && (
          <p className="alert alert-success" style={{ marginTop: '16px', marginBottom: 0 }}>
            {pwMessage}
          </p>
        )}
      </section>
    </div>
  );
}

export default AccountSettings;