import { useState } from 'react';
import api from './api';
import AuthLayout from './AuthLayout';

function describe(err, fallback) {
  if (!err.response) {
    return 'Cannot reach the server. Check that the backend is running and try again.';
  }
  return err.response.data?.message || fallback;
}

function VerifyEmail({ initialEmail = '', onDone }) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [verified, setVerified] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Enter the email you signed up with.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post('/verify-email', { email: email.trim(), code });
      setDoneMessage(res.data?.message || 'Email verified.');
      setVerified(true);
    } catch (err) {
      setError(describe(err, 'Could not verify the code. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Enter the email you signed up with.');
      return;
    }
    setSending(true);
    try {
      const res = await api.post('/resend-verification', { email: email.trim() });
      setCode('');
      setInfo(res.data?.message || 'A new code was sent.');
    } catch (err) {
      setError(describe(err, 'Could not send a new code. Try again.'));
    } finally {
      setSending(false);
    }
  };

  if (verified) {
    return (
      <AuthLayout title="Email verified" subtitle="">
        <p className="alert alert-success">{doneMessage}</p>
        <button type="button" className="btn btn-primary" onClick={onDone}>
          Go to log in
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Enter the 6-digit code we sent to your email. It only works for a short time."
    >
      <form className="auth-form" onSubmit={handleVerify}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>6-digit code</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
        </label>

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        {info && <p className="alert alert-success">{info}</p>}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Checking...' : 'Verify email'}
        </button>
        <p className="auth-switch">
          Code expired or missing?{' '}
          <button type="button" className="link-btn" onClick={handleResend} disabled={sending}>
            {sending ? 'Sending...' : 'Send a new code'}
          </button>
        </p>
        <p className="auth-switch">
          <button type="button" className="link-btn" onClick={onDone}>
            Back to log in
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}

export default VerifyEmail;