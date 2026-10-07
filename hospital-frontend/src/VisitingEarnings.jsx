import { useEffect, useMemo, useState } from 'react';
import api from './api';
import SearchFilter from './SearchFilter';
import { formatNaira } from './currency';
import { formatDateTime } from './format';

const BILL_LABELS = {
  PAID: 'Paid',
  PENDING: 'Awaiting payment',
  PARTIALLY_PAID: 'Part paid',
  AWAITING_HMO: 'Awaiting HMO',
  REMOVED: 'Bill removed',
};

function VisitingEarnings({ mine = false }) {
  const [data, setData] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const response = await api.get(
        mine ? '/api/visiting-doctors/earnings/mine' : '/api/visiting-doctors/earnings',
        { params }
      );
      setData(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load earnings. Check that the backend is running.');
    }
  };

  useEffect(() => {
    load();
  }, [from, to]);

  const rows = useMemo(
    () =>
      (data?.rows || [])
        .filter((r) => !doctorFilter || r.doctorId === doctorFilter)
        .map((r) => ({ ...r, billLabel: BILL_LABELS[r.billStatus] || r.billStatus })),
    [data, doctorFilter]
  );

  if (error) return <p className="alert alert-error" role="alert">{error}</p>;
  if (!data) return <p className="muted">Loading earnings...</p>;

  const t = data.totals;
  const cards = mine
    ? [
        ['Consultations', t.consultations, false],
        ['Fees billed', t.billed, true],
        ['Fees collected', t.collected, true],
        ['My earnings', t.doctorEarned, true],
        ['Hospital share', t.hospitalEarned, true],
        ['My pending earnings', t.doctorPending, true],
      ]
    : [
        ['Consultations', t.consultations, false],
        ['Fees billed', t.billed, true],
        ['Fees collected', t.collected, true],
        ['Fees outstanding', t.outstanding, true],
        ['Paid to doctors', t.doctorEarned, true],
        ['Hospital earnings', t.hospitalEarned, true],
      ];

  return (
    <div>
      {!mine && (
        <div className="page-head">
          <h1>Visiting doctor earnings</h1>
          <p>
            Consultation fees split between each doctor and the hospital. Money counts as earned once the
            patient's bill is fully paid; until then it is pending.
          </p>
        </div>
      )}

      <section className="panel">
        <div className="form-grid">
          <label className="field">
            <span>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field">
            <span>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          {!mine && (
            <label className="field">
              <span>Doctor</span>
              <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
                <option value="">All visiting doctors</option>
                {(data.doctors || []).map((d) => (
                  <option key={d.doctorId} value={d.doctorId}>{d.name}</option>
                ))}
              </select>
            </label>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => { setFrom(''); setTo(''); setDoctorFilter(''); }}
            >
              Clear filters
            </button>
          </div>
        </div>
      </section>

      <div className="stat-grid">
        {cards.map(([label, value, money]) => (
          <div className="stat-card" key={label}>
            <span className="stat-value">{money ? formatNaira(value) : Number(value).toLocaleString('en-GB')}</span>
            <span className="stat-label">{label}</span>
          </div>
        ))}
      </div>

      {!mine && (
        <>
          <div className="list-head" style={{ marginTop: '28px' }}>
            <h2>By doctor</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Doctor</th><th>Share kept by hospital</th><th>Consultations</th><th>Billed</th>
                  <th>Collected</th><th>Doctor earned</th><th>Hospital earned</th><th>Doctor pending</th>
                </tr>
              </thead>
              <tbody>
                {(data.doctors || []).length === 0 && (
                  <tr><td className="empty" colSpan="8">No visiting doctors yet.</td></tr>
                )}
                {(data.doctors || []).map((d) => (
                  <tr key={d.doctorId}>
                    <td>{d.name}<br /><span className="muted">{d.specialization}</span></td>
                    <td>{d.hospitalSharePercent}%</td>
                    <td>{d.consultations}</td>
                    <td>{formatNaira(d.billed)}</td>
                    <td>{formatNaira(d.collected)}</td>
                    <td>{formatNaira(d.doctorEarned)}</td>
                    <td>{formatNaira(d.hospitalEarned)}</td>
                    <td>{formatNaira(d.doctorPending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="list-head" style={{ marginTop: '28px' }}>
        <h2>Consultations</h2>
        <span className="count">{filtered.length} {filtered.length === 1 ? 'consultation' : 'consultations'}</span>
      </div>
      <SearchFilter
        data={rows}
        fields={['patientName', 'doctorName', 'billLabel']}
        onFiltered={setFiltered}
        placeholder="Search by patient, doctor or bill status..."
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Patient</th>
              {!mine && <th>Doctor</th>}
              <th>Fee</th>
              <th>Hospital share</th>
              <th>Doctor share</th>
              <th>Bill</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td className="empty" colSpan={mine ? 6 : 7}>No consultations in this period.</td></tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id}>
                <td>{formatDateTime(row.createdAt)}</td>
                <td>{row.patientName}</td>
                {!mine && <td>{row.doctorName}</td>}
                <td>{formatNaira(row.fee)}</td>
                <td>{formatNaira(row.hospitalAmount)} <span className="muted">({row.hospitalSharePercent}%)</span></td>
                <td>{formatNaira(row.doctorAmount)}</td>
                <td>
                  <span className={`pill ${row.settled ? 'pill-in' : 'pill-out'}`}>{row.billLabel}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VisitingEarnings;