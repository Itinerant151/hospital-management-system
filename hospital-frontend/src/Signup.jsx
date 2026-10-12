import { useState } from 'react';
import api from './api';
import AuthLayout from './AuthLayout';
import PasswordField from './PasswordField';

// Letters (any language) with single spaces, hyphens or apostrophes between names.
// Allows "Abdur-Rasheed" and "O'Neil", rejects digits and symbols.
const NAME_PATTERN = /^\p{L}+(?:[ '-]\p{L}+)*$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?\d{7,15}$/;

function validateName(value) {
  const v = value.trim();
  if (!v) return 'Enter your full name.';
  if (v.length < 2) return 'That name is too short.';
  if (!NAME_PATTERN.test(v)) {
    return 'Use letters only. Spaces, hyphens and apostrophes between names are fine.';
  }
  return '';
}

function validateEmail(value) {
  const v = value.trim();
  if (!v) return 'Enter your email address.';
  if (!EMAIL_PATTERN.test(v)) return 'Enter a valid email address, like name@example.com.';
  return '';
}

function validatePhone(value) {
  const v = value.replace(/[\s-]/g, '');
  if (!v) return 'Enter your phone number.';
  if (!PHONE_PATTERN.test(v)) return 'Enter a valid phone number (digits only, optional + at the start).';
  return '';
}

function describeError(err) {
  if (!err.response) {
    return 'Cannot reach the server. Check that the backend is running and try again.';
  }
  const data = err.response.data;
  const serverMessage =
    (data && typeof data === 'object' && data.message) || (typeof data === 'string' ? data : '');
  if (serverMessage) return serverMessage;
  switch (err.response.status) {
    case 400:
      return 'Some of the details are not valid. Check them and try again.';
    case 409:
      return 'That username or email is already registered.';
    case 500:
      return 'The server had a problem. Try again in a moment.';
    default:
      return `Signup failed (error ${err.response.status}).`;
  }
}

const errorStyle = { color: '#d93025', display: 'block', marginTop: 4 };

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
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setFieldError = (field, message) =>
    setFieldErrors((prev) => ({ ...prev, [field]: message }));

  const needsPhone = role === 'DOCTOR' || role === 'RECEPTIONIST' || role === 'LAB_STAFF';

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = name.trim().replace(/\s+/g, ' ');
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phoneNumber.replace(/[\s-]/g, '');

    const errors = {
      name: validateName(cleanName),
      email: validateEmail(cleanEmail),
      phone: needsPhone ? validatePhone(phoneNumber) : '',
    };
    setFieldErrors(errors);
    if (errors.name || errors.email || errors.phone) {
      setError('Please fix the highlighted fields and try again.');
      return;
    }

    setSubmitting(true);
    try {
      const body = { username: cleanUsername, email: cleanEmail, password, role };
      if (role === 'PATIENT') {
        body.name = cleanName;
        body.age = age;
        body.gender = gender;
      }
      if (role === 'RECEPTIONIST' || role === 'LAB_STAFF') {
        body.name = cleanName;
        body.phoneNumber = cleanPhone;
      }
      if (role === 'DOCTOR') {
        body.name = cleanName;
        body.specialization = specialization.trim();
        body.phoneNumber = cleanPhone;
      }

      const response = await api.post('/signup', body);

      // Every new account must enter the code we sent, so open that page now
      const message =
        (typeof response.data === 'string' && response.data) ||
        'Account created. Check your email for the verification code.';
      sessionStorage.setItem('verifyNotice', message);
      window.location.href = `/?verifyEmail=${encodeURIComponent(cleanEmail)}`;
    } catch (err) {
      setError(describeError(err));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create an account" subtitle="Choose the role that matches you. Staff roles need administrator approval.">
      <form className="auth-form" onSubmit={handleSignup}>
        <label className="field">
          <span>I am a</span>
          <select value={role} onChange={(e) => { setRole(e.target.value); setFieldErrors({}); }}>
            <option value="PATIENT">Patient</option>
            <option value="DOCTOR">Doctor</option>
            <option value="RECEPTIONIST">Receptionist</option>
            <option value="LAB_STAFF">Laboratory staff</option>
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
            onBlur={() => email && setFieldError('email', validateEmail(email))}
            required
          />
          <small className="field-hint">We send a 6-digit code here to confirm it is yours.</small>
          {fieldErrors.email && <small style={errorStyle}>{fieldErrors.email}</small>}
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
          <input
            type="text"
            maxLength={60}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldError('name', validateName(e.target.value));
            }}
            onBlur={() => name && setFieldError('name', validateName(name))}
            required
          />
          <small className="field-hint">Letters only, for example Jane Doe or Abdur-Rasheed.</small>
          {fieldErrors.name && <small style={errorStyle}>{fieldErrors.name}</small>}
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
          <label className="field">
            <span>Specialization</span>
            <input type="text" value={specialization} onChange={(e) => setSpecialization(e.target.value)} required />
          </label>
        )}

        {needsPhone && (
          <label className="field">
            <span>Phone number</span>
            <input
              type="text"
              inputMode="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onBlur={() => phoneNumber && setFieldError('phone', validatePhone(phoneNumber))}
              required
            />
            {fieldErrors.phone && <small style={errorStyle}>{fieldErrors.phone}</small>}
          </label>
        )}

        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create account'}
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