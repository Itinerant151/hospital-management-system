import { useEffect, useRef, useState } from 'react';
import api from './api';
import AuthLayout from './AuthLayout';
import PasswordField from './PasswordField';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Login({ notice, onLoginSuccess, onShowSignup, onShowForgot }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const googleButton = useRef(null);
  const successRef = useRef(onLoginSuccess);
  successRef.current = onLoginSuccess;

  const finishLogin = (data, usernameValue) => {
    const { token, role, patientId, doctorId } = data;
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('username', usernameValue);
    if (patientId) localStorage.setItem('patientId', patientId);
    if (doctorId) localStorage.setItem('doctorId', doctorId);
    successRef.current(role);
  };

  // "Sign in with Google" button (only when a client ID is configured)
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;

    const handleCredential = async (response) => {
      setError('');
      try {
        const res = await api.post('/login/google', { credential: response.credential });
        finishLogin(res.data, res.data.username || '');
      } catch (err) {
        setError(
          err.response?.data?.message ||
            (err.response ? 'Google sign-in failed. Try again.' : 'We could not connect right now. Please check your connection and try again.')
        );
      }
    };

    const setup = () => {
      if (!window.google?.accounts?.id || !googleButton.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
      });
      window.google.accounts.id.renderButton(googleButton.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        width: 320,
      });
    };

    if (window.google?.accounts?.id) {
      setup();
      return undefined;
    }

    let script = document.querySelector('script[data-google-gsi]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.setAttribute('data-google-gsi', 'true');
      document.head.appendChild(script);
    }
    script.addEventListener('load', setup);
    return () => script.removeEventListener('load', setup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const errors = {};
    if (!username.trim()) errors.username = 'Enter your username.';
    if (!password) errors.password = 'Enter your password.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const response = await api.post('/login', { username, password });
      finishLogin(response.data, username);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.response ? 'Invalid username or password' : 'We could not connect right now. Please check your connection and try again.')
      );
    }
  };

  return (
    <AuthLayout title="Log in" subtitle="Enter your MediCore username and password.">
      {notice && <p className="alert alert-success">{notice}</p>}
      <form className="auth-form" onSubmit={handleLogin} noValidate>
        <label className="field">
          <span>Username</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setFieldErrors((prev) => ({ ...prev, username: '' }));
            }}
            aria-invalid={fieldErrors.username ? 'true' : undefined}
          />
          {fieldErrors.username && (
            <small className="field-error" role="alert">
              {fieldErrors.username}
            </small>
          )}
        </label>
        <PasswordField
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setFieldErrors((prev) => ({ ...prev, password: '' }));
          }}
          autoComplete="current-password"
          error={fieldErrors.password}
        />
        <div className="form-aside">
          <button type="button" className="link-btn" onClick={onShowForgot}>
            Forgot password?
          </button>
        </div>
        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary">
          Log in
        </button>
      </form>

      {GOOGLE_CLIENT_ID && (
        <>
          <p style={{ textAlign: 'center', margin: '14px 0', opacity: 0.7 }}>or</p>
          <div ref={googleButton} style={{ display: 'flex', justifyContent: 'center' }} />
        </>
      )}

      <p className="auth-switch">
        New to MediCore?{' '}
        <button type="button" className="link-btn" onClick={onShowSignup}>
          Create an account
        </button>
      </p>
    </AuthLayout>
  );
}

export default Login;