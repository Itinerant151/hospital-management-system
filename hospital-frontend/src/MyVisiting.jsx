import { useEffect, useState } from 'react';
import api from './api';
import VisitingEarnings from './VisitingEarnings';
import { formatNaira } from './currency';
import { DAYS } from './visiting';

function MyVisiting() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/visiting-doctors/mine')
      .then((response) => setProfile(response.data))
      .catch(() => setError('Could not load your visiting details. Check that the backend is running.'));
  }, []);

  if (error) return <p className="alert alert-error" role="alert">{error}</p>;
  if (!profile) return <p className="muted">Loading...</p>;
  if (!profile.visiting) {
    return <p className="muted">You are not set up as a visiting doctor.</p>;
  }

  return (
    <div>
      <div className="page-head">
        <h1>Visiting schedule and earnings</h1>
        <p>Your weekly hours at MediCore, what you charge and what you have earned.</p>
      </div>

      {!profile.active && (
        <p className="alert alert-warn">Bookings for you are paused. Ask the administrator to resume them.</p>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-value">{formatNaira(profile.consultationFee)}</span>
          <span className="stat-label">Consultation fee</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{profile.hospitalSharePercent}%</span>
          <span className="stat-label">Hospital share of each fee</span>
        </div>
      </div>

      <div className="list-head" style={{ marginTop: '28px' }}>
        <h2>My weekly schedule</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Day</th><th>Hours</th></tr>
          </thead>
          <tbody>
            {profile.schedule.map((slot) => (
              <tr key={slot.day}>
                <td>{DAYS.find((d) => d.key === slot.day)?.label || slot.day}</td>
                <td>{slot.startTime} to {slot.endTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="list-head" style={{ marginTop: '28px' }}>
        <h2>My earnings</h2>
      </div>
      <VisitingEarnings mine />
    </div>
  );
}

export default MyVisiting;