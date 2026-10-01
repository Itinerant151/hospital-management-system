import { useState } from 'react';
import api from './api';
import AuthLayout from './AuthLayout';

function ForgotPassword({ onBack }) {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('Enter your username or email.');
      return;
    }

    try {
      await api.post('/forgot-password', { identifier: identifier.trim() });
      setSent(true);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not send the reset link. Check that the backend is running.'
      );
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="Follow the link we sent to choose a new password.">
        <p className="alert alert-success">
          If an account matches, a reset link has been sent. The link works once and expires in 30 minutes.
        </p>
        <button type="button" className="btn btn-quiet" onClick={onBack}>
          Back to log in
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your username or the email on your account.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Username or email</span>
          <input
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setError('');
            }}
            aria-invalid={error ? 'true' : undefined}
          />
        </label>
        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary">
          Send reset link
        </button>
      </form>
      <p className="auth-switch">
        <button type="button" className="link-btn" onClick={onBack}>
          Back to log in
        </button>
      </p>
    </AuthLayout>
  );
}

export default ForgotPassword;