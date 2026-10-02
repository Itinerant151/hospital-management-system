import { useEffect, useState } from 'react';
import api from './api';
import { formatDateTime } from './format';

const CATEGORIES = [
  { key: 'ALL', label: 'All actions' },
  { key: 'LOGIN', label: 'Logins' },
  { key: 'ACCOUNT', label: 'Accounts and passwords' },
  { key: 'BILLING', label: 'Billing and payments' },
  { key: 'DIAGNOSIS', label: 'Diagnoses' },
  { key: 'PRESCRIPTION', label: 'Prescriptions' },
  { key: 'PATIENT', label: 'Patient records' },
  { key: 'APPOINTMENT', label: 'Appointments' },
  { key: 'FRONT_DESK', label: 'Front desk' },
  { key: 'PHARMACY', label: 'Pharmacy' },
  { key: 'VISITATION', label: 'Visitation' },
  { key: 'ADMIN', label: 'Administration' },
  { key: 'DATA', label: 'Data export' },
];

const labelFor = (key) => CATEGORIES.find((c) => c.key === key)?.label || key;

// Administrator view of who did what, and when
function AuditLogPage() {
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(200);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      api
        .get('/api/audit', { params: { category, search, limit } })
        .then((response) => {
          if (alive) {
            setData(response.data);
            setError('');
          }
        })
        .catch((err) => alive && setError(err.response?.data?.message || 'Could not load the audit log.'));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [category, search, limit, tick]);

  return (
    <div>
      <div className="page-head">
        <h1>Audit log</h1>
        <p>A record of important actions: logins, payments, account changes, diagnoses, prescriptions and more.</p>
      </div>

      <div className="audit-toolbar">
        <select className="cell-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by type">
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Search by person, role or action..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="cell-select" value={limit} onChange={(e) => setLimit(Number(e.target.value))} aria-label="How many entries">
          <option value={100}>Latest 100</option>
          <option value={200}>Latest 200</option>
          <option value={500}>Latest 500</option>
          <option value={1000}>Latest 1000</option>
        </select>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setTick((t) => t + 1)}>
          Refresh
        </button>
        {data && (
          <span className="count">
            {data.shown} shown · {data.total} recorded in total
          </span>
        )}
      </div>

      {error && <p className="alert alert-error" role="alert">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Type</th>
              <th>What happened</th>
              <th>Result</th>
              <th>From</th>
            </tr>
          </thead>
          <tbody>
            {data && data.entries.length === 0 && (
              <tr><td className="empty" colSpan="6">No entries match.</td></tr>
            )}
            {!data && !error && (
              <tr><td className="empty" colSpan="6">Loading...</td></tr>
            )}
            {data && data.entries.map((entry) => (
              <tr key={entry.id}>
                <td>{formatDateTime(entry.timestamp)}</td>
                <td>
                  <div>{entry.username}</div>
                  {entry.role && <div className="notif-meta">{entry.role.toLowerCase()}</div>}
                </td>
                <td>
                  <span className={`badge badge-cat badge-cat-${String(entry.category).toLowerCase()}`}>
                    {labelFor(entry.category)}
                  </span>
                </td>
                <td className="audit-detail">
                  <div>{entry.detail}</div>
                  <div className="audit-path">{entry.method} {entry.path}</div>
                </td>
                <td>
                  <span className={`badge ${entry.status >= 400 ? 'badge-cancelled' : 'badge-completed'}`}>
                    {entry.status >= 400 ? 'Failed' : 'Done'}
                  </span>
                </td>
                <td className="notif-meta">{entry.ipAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AuditLogPage;