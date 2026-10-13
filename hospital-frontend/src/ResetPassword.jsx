import { useState } from 'react';
import api from './api';
import AuthLayout from './AuthLayout';
import PasswordField from './PasswordField';

function ResetPassword({ token, onDone }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errors = {};
    if (newPassword.length < 8) errors.newPassword = 'Use at least 8 characters.';
    if (confirm !== newPassword) errors.confirm = 'Passwords do not match.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      await api.post('/reset-password', { token, newPassword });
      setDone(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Could not reset your password. Please try again, or request a new link.'
      );
    }
  };

  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="You can now log in with your new password.">
        <button type="button" className="btn btn-primary" onClick={onDone}>
          Go to log in
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Pick a password you have not used before.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <PasswordField
          label="New password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setFieldErrors((prev) => ({ ...prev, newPassword: '' }));
          }}
          autoComplete="new-password"
          hint="At least 8 characters."
          error={fieldErrors.newPassword}
        />
        <PasswordField
          label="Confirm new password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setFieldErrors((prev) => ({ ...prev, confirm: '' }));
          }}
          autoComplete="new-password"
          error={fieldErrors.confirm}
        />
        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary">
          Save new password
        </button>
      </form>
      <p className="auth-switch">
        <button type="button" className="link-btn" onClick={onDone}>
          Back to log in
        </button>
      </p>
    </AuthLayout>
  );
}

export default ResetPassword;