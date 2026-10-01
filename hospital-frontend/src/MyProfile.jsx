import { useEffect, useState } from 'react';
import api from './api';
import PatientDetailsForm from './PatientDetailsForm';

function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchProfile = async () => {
    const response = await api.get('/patients/me');
    setProfile(response.data);
  };

  useEffect(() => { fetchProfile(); }, []);

  const updateProfile = async (data) => {
    setMessage('');
    setError('');
    try {
      await api.put('/patients/me', data);
      setMessage('Your profile has been updated.');
      await fetchProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update your profile.');
    }
  };

  if (!profile) return <p className="muted">Loading your medical profile...</p>;

  return (
    <div>
      <div className="page-head"><h1>My medical profile</h1><p>You can maintain your personal and medical information. Hospital staff see the same record.</p></div>
      <section className="panel">
        <h2 className="panel-title">Patient information</h2>
        <PatientDetailsForm patient={profile} onSave={updateProfile} />
        <p className="muted" style={{ marginTop: '12px', marginBottom: 0 }}>
          The email on this page is your account email. Changing it here also changes it under My account.
        </p>
        {error && <p className="alert alert-error" role="alert" style={{ marginTop: '16px', marginBottom: 0 }}>{error}</p>}
        {message && <p className="alert alert-success" style={{ marginTop: '16px', marginBottom: 0 }}>{message}</p>}
        <div className="info-row"><span className="label">Diagnosis</span>{profile.diagnosis || 'Not recorded by hospital staff'}</div>
      </section>
    </div>
  );
}

export default MyProfile;