import { useState } from 'react';
import api from './api';
import AuthLayout from './AuthLayout';
import PasswordField from './PasswordField';

function Signup({ onSignupSuccess }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('PATIENT');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const body = { username, email, password, role };
      if (role === 'PATIENT') {
        body.name = name;
        body.age = age;
        body.gender = gender;
      }
      if (role === 'RECEPTIONIST') {
        body.name = name;
        body.phoneNumber = phoneNumber;
      }
      if (role === 'DOCTOR') {
        body.name = name;
        body.specialization = specialization;
        body.phoneNumber = phoneNumber;
      }

      await api.post('/signup', body);
      setSuccess('Account created. You can now log in.');
      setUsername('');
      setEmail('');
      setPassword('');
      setName('');
      setAge('');
      setGender('');
      setSpecialization('');
      setPhoneNumber('');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <AuthLayout title="Create an account" subtitle="Choose whether you are a patient or a doctor.">
      <form className="auth-form" onSubmit={handleSignup}>
        <label className="field">
          <span>I am a</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="PATIENT">Patient</option>
            <option value="DOCTOR">Doctor</option>
            <option value="RECEPTIONIST">Receptionist</option>
          </select>
        </label>
        <label className="field">
          <span>Username</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <small className="field-hint">Used to reset your password if you forget it.</small>
        </label>
        <PasswordField
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          hint="At least 8 characters."
          minLength={8}
          required
        />
        <label className="field">
          <span>Full name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        {role === 'PATIENT' && (
          <>
            <label className="field">
              <span>Age</span>
              <input
                type="number"
                min="0"
                max="130"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Gender</span>
              <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                <option value="">Select gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Rather Not Say</option>
              </select>
            </label>
          </>
        )}

        {role === 'DOCTOR' && (
          <>
            <label className="field">
              <span>Specialization</span>
              <input type="text" value={specialization} onChange={(e) => setSpecialization(e.target.value)} required />
            </label>
            <label className="field">
              <span>Phone number</span>
              <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
            </label>
          </>
        )}

        {role === 'RECEPTIONIST' && (
          <label className="field">
            <span>Phone number</span>
            <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
          </label>
        )}

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        {success && <p className="alert alert-success">{success}</p>}

        <button type="submit" className="btn btn-primary">
          Create account
        </button>
      </form>
      <p className="auth-switch">
        Already have an account?{' '}
        <button type="button" className="link-btn" onClick={onSignupSuccess}>
          Back to log in
        </button>
      </p>
    </AuthLayout>
  );
}

export default Signup;