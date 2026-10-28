import { useEffect, useState } from 'react';
import api from './api';
import { formatNaira } from './currency';
import { formatDateTime } from './format';

// The same dashboard for every role: the server decides which numbers each role sees
function RoleDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState({});

  const load = async () => {
    try {
      const response = await api.get('/api/dashboard/me');
      let cards = response.data.cards || [];

      // Extra cards (beds, lab, visiting doctors). They are optional: if they fail, the rest still shows
      try {
        const extra = await api.get('/api/dashboard/extras');
        const have = new Set(cards.map((c) => c.label));
        cards = [...cards, ...extra.data.filter((c) => !have.has(c.label))];
      } catch (e) {
        // ignore
      }

      setData({ ...response.data, cards });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'We could not load your dashboard right now. Please try again in a moment.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (error) return <p className="alert alert-error" role="alert">{error}</p>;
  if (!data) return <p className="muted">Loading your dashboard...</p>;

  const show = (card) => (card.kind === 'money' ? formatNaira(card.value) : Number(card.value).toLocaleString('en-GB'));

  // Short form for money cards, e.g. ₦422K. Tap a card to see the full amount.
  const compactNaira = (value) => {
    const n = Number(value) || 0;
    if (Math.abs(n) < 1000) return formatNaira(n);
    const short = new Intl.NumberFormat('en-NG', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
    return `₦${short}`;
  };

  const toggle = (label) => setRevealed((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <div>
      <div className="page-head">
        <h1>{data.title}</h1>
        <p>A snapshot of what is happening right now.</p>
      </div>

      <div className="stat-grid">
        {data.cards.map((card) => {
          if (card.kind !== 'money') {
            return (
              <div className="stat-card" key={card.label}>
                <span className="stat-value">{show(card)}</span>
                <span className="stat-label">{card.label}</span>
              </div>
            );
          }
          const open = !!revealed[card.label];
          return (
            <button
              type="button"
              className={`stat-card stat-card-money${open ? ' is-open' : ''}`}
              key={card.label}
              onClick={() => toggle(card.label)}
              aria-expanded={open}
              title={open ? 'Tap to show the short amount' : 'Tap to show the full amount'}
            >
              <span className="stat-value">{open ? show(card) : compactNaira(card.value)}</span>
              <span className="stat-label">{card.label}</span>
              <span className="stat-hint">{open ? 'Tap to shorten' : 'Tap for full amount'}</span>
            </button>
          );
        })}
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