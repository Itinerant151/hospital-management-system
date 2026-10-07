import { useEffect, useState } from 'react';
import api from './api';
import { formatNaira } from './currency';
import { formatDateTime } from './format';

// The same dashboard for every role: the server decides which numbers each role sees
function RoleDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const response = await api.get('/api/dashboard/me');
      setData(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the dashboard. Check that the backend is running.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (error) return <p className="alert alert-error" role="alert">{error}</p>;
  if (!data) return <p className="muted">Loading your dashboard...</p>;

  const show = (card) => (card.kind === 'money' ? formatNaira(card.value) : Number(card.value).toLocaleString('en-GB'));

  return (
    <div>
      <div className="page-head">
        <h1>{data.title}</h1>
        <p>A snapshot of what is happening right now.</p>
      </div>

      <div className="stat-grid">
        {data.cards.map((card) => (
          <div className="stat-card" key={card.label}>
            <span className="stat-value">{show(card)}</span>
            <span className="stat-label">{card.label}</span>
          </div>
        ))}
      </div>

      <div className="list-head" style={{ marginTop: '28px' }}>
        <h2>{data.upcomingTitle}</h2>
        <button type="button" className="btn btn-quiet btn-sm" onClick={load}>Refresh</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>When</th><th>Who</th><th>Details</th></tr>
          </thead>
          <tbody>
            {data.upcoming.length === 0 && (
              <tr><td className="empty" colSpan="3">Nothing to show.</td></tr>
            )}
            {data.upcoming.map((row, i) => (
              <tr key={i}>
                <td>{formatDateTime(row.when)}</td>
                <td>{row.title}</td>
                <td>{row.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RoleDashboard;