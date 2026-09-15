import { useState } from 'react';
import api from './api';

function Login({ onLoginSuccess, onShowSignup }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('/login', { username, password });
      const { token, role } = response.data;
      console.log('LOGIN RESPONSE ROLE:', role);

      localStorage.setItem('token', token);
      localStorage.setItem('role', role);

      onLoginSuccess(role);
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <div style={{ maxWidth: '300px', margin: '100px auto' }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <br />
        <button type="submit">Log In</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={onShowSignup}>Don't have an account? Sign Up</button>
    </div>
  );
}

export default Login;