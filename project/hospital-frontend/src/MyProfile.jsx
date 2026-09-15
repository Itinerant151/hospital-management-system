import { useState, useEffect } from 'react';
import api from './api';

function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const response = await api.get('/patients/me');
    setProfile(response.data);
    setName(response.data.name);
    setAge(response.data.age);
    setGender(response.data.gender);
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setMessage('');
    await api.put('/patients/me', { name, age: String(age), gender });
    setMessage('Profile updated successfully.');
    fetchProfile();
  };

  if (!profile) return <p>Loading profile...</p>;

  return (
    <div>
      <h2>My Profile</h2>
      <form onSubmit={updateProfile}>
        <label>
          Name:{' '}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <br />
        <label>
          Age:{' '}
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
          />
        </label>
        <br />
        <label>
          Gender:{' '}
          <input
            type="text"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
          />
        </label>
        <br />
        <button type="submit">Update Profile</button>
      </form>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      <p><strong>Diagnosis (set by hospital staff):</strong> {profile.diagnosis || 'None recorded'}</p>
    </div>
  );
}

export default MyProfile;