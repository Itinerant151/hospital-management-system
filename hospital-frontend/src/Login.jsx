import { useState } from 'react';
import api from './api';
import AuthLayout from './AuthLayout';
import PasswordField from './PasswordField';

function Login({ notice, onLoginSuccess, onShowSignup, onShowForgot }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

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
      const { token, role, patientId, doctorId } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('username', username);
      if (patientId) localStorage.setItem('patientId', patientId);
      if (doctorId) localStorage.setItem('doctorId', doctorId);

      onLoginSuccess(role);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.response ? 'Invalid username or password' : 'Could not reach the server. Check that the backend is running.')
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