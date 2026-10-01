import { useState, useEffect } from 'react';
import api from './api';
import PasswordField from './PasswordField';

function AccountSettings() {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [temporaryPassword, setTemporaryPassword] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      const response = await api.get('/account/me');

      setUsername(response.data.username);
      setEmail(response.data.email || '');

      const isTemporary =
        response.data.temporaryPassword === 'true';

      setTemporaryPassword(isTemporary);

      localStorage.setItem(
        'temporaryPassword',
        isTemporary ? 'true' : 'false'
      );

      setLoadError('');
      setLoaded(true);
    } catch (err) {
      setLoadError(
        err.response?.data?.message ||
          'Could not load your account. Log out, log back in and try again.'
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
      const response = await api.put('/account', {
        username,
        email,
        currentPassword,
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.username);

      setUsername(response.data.username);
      setEmail(response.data.email || '');

      setCurrentPassword('');

      setMessage('Account updated.');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Could not update your account.'
      );
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    setMessage('');
    setError('');

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setError('Fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    try {
      const response = await api.put('/account/password', {
        currentPassword,
        newPassword,
      });

      if (response.data.token) {
        localStorage.setItem(
          'token',
          response.data.token
        );
      }

      localStorage.setItem(
        'temporaryPassword',
        'false'
      );

      setTemporaryPassword(false);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setMessage('Password changed successfully.');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Could not change your password.'
      );
    }
  };

  if (loadError) {
    return (
      <p className="alert alert-error" role="alert">
        {loadError}
      </p>
    );
  }

  if (!loaded) {
    return (
      <p className="muted">
        Loading your account...
      </p>
    );
  }

  return (
    <div>
      <div className="page-head">
        <h1>My account</h1>
        <p>
          Manage your login details and password.
        </p>
      </div>

      {temporaryPassword && (
        <div className="alert alert-warning">
          <strong>Temporary password:</strong>{' '}
          this account was created with a temporary
          password. Change it below to secure your
          account.
        </div>
      )}

      <section className="panel">
        <h2 className="panel-title">
          Login details
        </h2>

        <form
          className="form-grid"
          onSubmit={handleSave}
          noValidate
        >
          <label className="field">
            <span>Username</span>

            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
            />

            <small className="field-hint">
              3 to 30 letters, numbers, dots,
              dashes or underscores.
            </small>
          </label>

          <label className="field">
            <span>Email</span>

            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <small className="field-hint">
              Used to reset your password.
            </small>
          </label>

          <PasswordField
            label="Current password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setError('');
            }}
            autoComplete="current-password"
            hint="Needed to confirm account changes."
          />

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
            >
              Save changes
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2 className="panel-title">
          Change password
        </h2>

        <form
          className="form-grid"
          onSubmit={handlePasswordChange}
          noValidate
        >
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChange={(e) =>
              setCurrentPassword(e.target.value)
            }
            autoComplete="current-password"
          />

          <PasswordField
            label="New password"
            value={newPassword}
            onChange={(e) =>
              setNewPassword(e.target.value)
            }
            autoComplete="new-password"
            hint="At least 8 characters."
          />

          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            autoComplete="new-password"
          />

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
            >
              Change password
            </button>
          </div>
        </form>

        {error && (
          <p
            className="alert alert-error"
            role="alert"
            style={{
              marginTop: '16px',
              marginBottom: 0,
            }}
          >
            {error}
          </p>
        )}

        {message && (
          <p
            className="alert alert-success"
            style={{
              marginTop: '16px',
              marginBottom: 0,
            }}
          >
            {message}
          </p>
        )}
      </section>
    </div>
  );
}

export default AccountSettings;