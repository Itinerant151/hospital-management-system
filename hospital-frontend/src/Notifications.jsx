import { useState, useEffect } from 'react';
import api from './api';

// Reminders: shown here instead of being emailed anywhere.
// Admins see the full system log plus a manual "generate now" trigger;
// patients/doctors see their own inbox and can mark items as read.
function Notifications() {
  const [reminders, setReminders] = useState([]);
  const [message, setMessage] = useState('');
  const role = localStorage.getItem('role');
  const username = localStorage.getItem('username');
  const isAdmin = role === 'ADMIN';

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    if (isAdmin) {
      const response = await api.get('/api/reminders');
      setReminders(response.data);
    } else if (username) {
      const response = await api.get(`/api/reminders/inbox/${encodeURIComponent(username)}`);
      setReminders(response.data);
    }
  };

  const generateNow = async () => {
    setMessage('');
    const response = await api.post('/api/reminders/generate');
    setMessage(response.data);
    fetchReminders();
  };

  const markRead = async (id) => {
    await api.put(`/api/reminders/${id}/read`);
    fetchReminders();
  };

  return (
    <div>
      <div className="page-head">
        <h1>{isAdmin ? 'Reminder log' : 'Notifications'}</h1>
        <p>
          {isAdmin
            ? 'System-wide reminders.'
            : 'Reminders about your upcoming appointments.'}
        </p>
      </div>

      {isAdmin && (
        <section className="panel">
          <button type="button" className="btn btn-primary" onClick={generateNow}>
            Generate reminders now
          </button>
          {message && (
            <p className="alert alert-success" style={{ marginTop: '12px', marginBottom: 0 }}>
              {message}
            </p>
          )}
        </section>
      )}

      <div className="list-head">
        <h2>{isAdmin ? 'All reminders' : 'Your inbox'}</h2>
        <span className="count">
          {reminders.length} {reminders.length === 1 ? 'reminder' : 'reminders'}
        </span>
      </div>

      {reminders.length === 0 && <p className="muted">No reminders yet.</p>}

      {reminders.map((r) => (
        <div key={r.id} className={`notif-item${!r.read ? ' is-unread' : ''}`}>
          <div>{r.message}</div>
          <div className="notif-meta">
            {r.recipientRole} · {r.recipientEmail} ·{' '}
            {new Date(r.sentAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
          {!isAdmin && !r.read && (
            <button
              type="button"
              className="btn btn-quiet btn-sm"
              style={{ marginTop: '8px' }}
              onClick={() => markRead(r.id)}
            >
              Mark as read
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default Notifications;
