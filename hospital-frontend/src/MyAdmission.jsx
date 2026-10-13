import { useEffect, useState } from 'react';
import api from './api';
import { formatNaira } from './currency';
import { formatDateTime } from './format';
import { BILL_LABELS, dayText } from './wardsHelpers';

function MyAdmission() {
  const [admissions, setAdmissions] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/admissions/mine')
      .then((response) => setAdmissions(response.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load your admissions	. Please try again in a moment.'));
  }, []);

  if (error) return <p className="alert alert-error" role="alert">{error}</p>;
  if (!admissions) return <p className="muted">Loading...</p>;

  const current = admissions.find((a) => a.status === 'ADMITTED');
  const past = admissions.filter((a) => a.status === 'DISCHARGED');

  return (
    <div>
      <div className="page-head">
        <h1>My admission</h1>
        <p>Where you are staying in the hospital, who is looking after you and what the bed has cost so far.</p>
      </div>

      {!current && <p className="muted">You are not admitted right now.</p>}

      {current && (
        <>
          <div className="stat-grid">
            <div className="stat-card"><span className="stat-value">{current.wardName}</span><span className="stat-label">Ward</span></div>
            <div className="stat-card"><span className="stat-value">{current.bedLabel}</span><span className="stat-label">Bed</span></div>
            <div className="stat-card"><span className="stat-value">{dayText(current.days)}</span><span className="stat-label">Time admitted</span></div>
            <div className="stat-card"><span className="stat-value">{formatNaira(current.charges)}</span><span className="stat-label">Bed charges so far</span></div>
          </div>

          <section className="panel">
            <h2 className="panel-title">Admission details</h2>
            <p style={{ margin: '0 0 6px' }}><strong>Admitted:</strong> {formatDateTime(current.admittedAt)}</p>
            <p style={{ margin: '0 0 6px' }}><strong>Reason:</strong> {current.reason}</p>
            <p style={{ margin: 0 }}><strong>Doctor:</strong> {current.doctorName || 'Not assigned yet'}</p>
          </section>

          <div className="list-head"><h2>Beds I have used</h2></div>
          <section className="panel">
            <ul className="stay-list">
              {current.stays.map((stay, i) => (
                <li key={i}>
                  <strong>{stay.wardName}, bed {stay.bedLabel}</strong> at {formatNaira(stay.dailyRate)} a day
                  <br />
                  <span className="muted">
                    {formatDateTime(stay.startedAt)} to {stay.endedAt ? formatDateTime(stay.endedAt) : 'now'}
                    {stay.transferReason ? ` · moved here: ${stay.transferReason}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {past.length > 0 && (
        <>
          <div className="list-head" style={{ marginTop: '28px' }}>
            <h2>Past admissions</h2>
            <span className="count">{past.length} {past.length === 1 ? 'admission' : 'admissions'}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Admitted</th><th>Discharged</th><th>Last ward and bed</th><th>Reason</th><th>Days</th><th>Bed charges</th><th>Bill</th></tr>
              </thead>
              <tbody>
                {past.map((a) => (
                  <tr key={a.id}>
                    <td>{formatDateTime(a.admittedAt)}</td>
                    <td>{formatDateTime(a.dischargedAt)}</td>
                    <td>{a.wardName}, bed {a.bedLabel}</td>
                    <td>{a.reason}</td>
                    <td>{dayText(a.days)}</td>
                    <td>{formatNaira(a.charges)}</td>
                    <td>
                      <span className={`pill ${a.billStatus === 'PAID' ? 'pill-in' : 'pill-out'}`}>
                        {BILL_LABELS[a.billStatus] || a.billStatus || 'None'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted">Unpaid bed charges are in My billing.</p>
        </>
      )}
    </div>
  );
}

export default MyAdmission;