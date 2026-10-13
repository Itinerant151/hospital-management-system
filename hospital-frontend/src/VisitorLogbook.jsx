import { useEffect, useMemo, useState } from 'react';
import api from './api';
import { formatDateTime } from './format';

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const EMPTY = { patientId: '', visitorType: 'PUBLIC', visitorPatientId: '', visitorName: '', phoneNumber: '', relation: '', purpose: '' };

// Front desk visitor logbook: log walk-in visitors, say whom they are visiting, and check them out
function VisitorLogbook() {
  const [visits, setVisits] = useState([]);
  const [patients, setPatients] = useState([]);
  const [accountPatients, setAccountPatients] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [view, setView] = useState('TODAY');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [visitResponse, patientResponse, accountResponse] = await Promise.all([
      api.get('/api/visitation'),
      api.get('/patients'),
      api.get('/api/visitation/account-patients'),
    ]);
    setVisits(visitResponse.data);
    setPatients(patientResponse.data);
    setAccountPatients(accountResponse.data);
  };

  useEffect(() => {
    load().catch(() => setError('Could not load the logbook	. Please try again in a moment.'));
  }, []);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const patientName = (visit) => visit.patientName || patients.find((p) => p.id === visit.patientId)?.name || 'Unknown';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/api/visitation/walk-in', {
        patientId: form.patientId,
        visitorPatientId: form.visitorType === 'ACCOUNT' ? form.visitorPatientId : '',
        visitorName: form.visitorType === 'ACCOUNT' ? '' : form.visitorName,
        phoneNumber: form.phoneNumber,
        relation: form.relation,
        purpose: form.purpose,
      });
      setForm(EMPTY);
      setMessage('Visitor logged and checked in.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not log the visitor.');
    }
  };

  const setStatus = async (visit, status) => {
    setError('');
    setMessage('');
    try {
      await api.put(`/api/visitation/${visit.id}/status`, { status });
      setMessage(`${visit.visitorName} marked ${status.toLowerCase()}.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the visit.');
    }
  };

  const today = todayKey();
  const inBuilding = visits.filter((v) => v.status === 'Checked In').length;
  const todayCount = visits.filter((v) => v.visitDate === today && v.status !== 'Cancelled').length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visits.filter((v) => {
      if (view === 'TODAY' && v.visitDate !== today) return false;
      if (view === 'IN' && v.status !== 'Checked In') return false;
      if (!q) return true;
      return (
        (v.visitorName || '').toLowerCase().includes(q) ||
        patientName(v).toLowerCase().includes(q) ||
        (v.purpose || '').toLowerCase().includes(q) ||
        (v.phoneNumber || '').toLowerCase().includes(q)
      );
    });
  }, [visits, patients, view, search, today]);

  const candidates = accountPatients.filter((p) => p.id !== form.patientId);

  return (
    <div>
      <div className="page-head">
        <h1>Visitor logbook</h1>
        <p>Record everyone who visits a patient: who they are, whom they are visiting, when they came in and when they left.</p>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}

      <div className="stat-grid">
        <div className="stat-card"><span className="stat-value">{inBuilding}</span><span className="stat-label">Visitors in the building</span></div>
        <div className="stat-card"><span className="stat-value">{todayCount}</span><span className="stat-label">Visits today</span></div>
        <div className="stat-card"><span className="stat-value">{visits.length}</span><span className="stat-label">Entries in the logbook</span></div>
      </div>

      <section className="panel">
        <h2 className="panel-title">Log a visitor</h2>
        <form className="form-grid" onSubmit={submit}>
          <label className="field">
            <span>Patient being visited</span>
            <select value={form.patientId} onChange={(e) => update('patientId', e.target.value)} required>
              <option value="">Select a patient</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>

          <label className="field">
            <span>The visitor is</span>
            <select value={form.visitorType} onChange={(e) => update('visitorType', e.target.value)}>
              <option value="PUBLIC">A member of the public</option>
              <option value="ACCOUNT">A patient with a hospital account</option>
            </select>
          </label>

          {form.visitorType === 'ACCOUNT' ? (
            <label className="field">
              <span>Visitor (patient with an account)</span>
              <select value={form.visitorPatientId} onChange={(e) => update('visitorPatientId', e.target.value)} required>
                <option value="">Select the visitor</option>
                {candidates.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <small className="field-hint">Their name and phone number are filled in from their record.</small>
            </label>
          ) : (
            <label className="field">
              <span>Visitor's name</span>
              <input type="text" value={form.visitorName} onChange={(e) => update('visitorName', e.target.value)} required />
            </label>
          )}

          <label className="field">
            <span>Phone number</span>
            <input type="text" value={form.phoneNumber} onChange={(e) => update('phoneNumber', e.target.value)} />
          </label>
          <label className="field">
            <span>Relationship to the patient</span>
            <input type="text" value={form.relation} onChange={(e) => update('relation', e.target.value)} placeholder="Sister, friend, colleague..." />
          </label>
          <label className="field">
            <span>Purpose of the visit</span>
            <input type="text" value={form.purpose} onChange={(e) => update('purpose', e.target.value)} placeholder="Check-up, bringing food, family visit..." />
          </label>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Log visitor in</button>
          </div>
        </form>
      </section>

      <div className="audit-toolbar">
        <select className="cell-select" value={view} onChange={(e) => setView(e.target.value)} aria-label="Which entries">
          <option value="TODAY">Today</option>
          <option value="IN">In the building now</option>
          <option value="ALL">Full logbook</option>
        </select>
        <input type="search" placeholder="Search visitor, patient or purpose..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="count">{visible.length} {visible.length === 1 ? 'entry' : 'entries'}</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>In</th>
              <th>Out</th>
              <th>Visitor</th>
              <th>Visiting</th>
              <th>Relationship and purpose</th>
              <th>Type</th>
              <th>Status</th>
              <th>Logged by</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && <tr><td className="empty" colSpan="9">No entries to show.</td></tr>}
            {visible.map((visit) => (
              <tr key={visit.id}>
                <td>{visit.checkInTime ? formatDateTime(visit.checkInTime) : <span className="muted">{visit.visitDate} {visit.timeSlot}</span>}</td>
                <td>{visit.checkOutTime ? formatDateTime(visit.checkOutTime) : <span className="muted">{visit.status === 'Checked In' ? 'Still in' : '—'}</span>}</td>
                <td>
                  <div>{visit.visitorName}</div>
                  {visit.visitorPatientId && <span className="badge badge-scheduled">Hospital patient</span>}
                  {visit.phoneNumber && <div className="notif-meta">{visit.phoneNumber}</div>}
                </td>
                <td><strong>{patientName(visit)}</strong></td>
                <td>
                  <div>{visit.relation || <span className="muted">Not given</span>}</div>
                  {visit.purpose && <div className="notif-meta">{visit.purpose}</div>}
                </td>
                <td>{visit.source === 'WALK_IN' ? 'Walk-in' : 'Booked'}</td>
                <td>
                  <span className={`badge ${visit.status === 'Checked In' ? 'badge-completed' : visit.status === 'Cancelled' ? 'badge-cancelled' : 'badge-scheduled'}`}>
                    {visit.status}
                  </span>
                </td>
                <td className="notif-meta">{visit.loggedBy || '—'}</td>
                <td>
                  {visit.status === 'Scheduled' && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setStatus(visit, 'Checked In')}>Check in</button>
                  )}
                  {visit.status === 'Checked In' && (
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => setStatus(visit, 'Checked Out')}>Check out</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VisitorLogbook;