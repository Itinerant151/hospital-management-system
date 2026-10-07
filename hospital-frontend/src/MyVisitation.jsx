import { useState, useEffect } from 'react';
import api from './api';
import { useConfirm } from './ConfirmDialog';
import { formatDateTime } from './format';

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

function MyVisitation() {
  const confirm = useConfirm();
  const [visits, setVisits] = useState([]);
  const [visiting, setVisiting] = useState([]);
  const [visitorName, setVisitorName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [relation, setRelation] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [error, setError] = useState('');

  const fetchVisits = async () => {
    const [mine, making] = await Promise.all([
      api.get('/api/visitation/mine'),
      api.get('/api/visitation/mine-visiting'),
    ]);
    setVisits(mine.data);
    setVisiting(making.data);
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const bookVisit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/visitation', { visitorName, phoneNumber, relation, visitDate, timeSlot });
      setVisitorName('');
      setPhoneNumber('');
      setRelation('');
      setVisitDate('');
      setTimeSlot('');
      fetchVisits();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not book the visit.');
    }
  };

  const cancelVisit = async (id) => {
    if (!(await confirm('Cancel this visit?'))) return;
    await api.delete(`/api/visitation/${id}`);
    fetchVisits();
  };

  return (
    <div>
      <div className="page-head">
        <h1>Visitation</h1>
        <p>Book a visitor, see who has visited you, and see the patients you have visited.</p>
      </div>

      <section className="panel">
        <h2 className="panel-title">Book a visit</h2>
        <form className="form-grid" onSubmit={bookVisit}>
          <label className="field">
            <span>Visitor name</span>
            <input type="text" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} required />
          </label>
          <label className="field">
            <span>Relation</span>
            <input type="text" value={relation} onChange={(e) => setRelation(e.target.value)} />
          </label>
          <label className="field">
            <span>Phone number</span>
            <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
          </label>
          <label className="field">
            <span>Visit date</span>
            <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} required />
          </label>
          <label className="field">
            <span>Time slot</span>
            <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} required>
              <option value="">Select a time</option>
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Book visit
            </button>
          </div>
        </form>
        {error && (
          <p className="alert alert-error" role="alert" style={{ marginTop: '16px', marginBottom: 0 }}>
            {error}
          </p>
        )}
      </section>

      <div className="list-head">
        <h2>Visits to me</h2>
        <span className="count">
          {visits.length} {visits.length === 1 ? 'visit' : 'visits'}
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Visitor</th>
              <th>Date</th>
              <th>Time slot</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visits.length === 0 && (
              <tr>
                <td className="empty" colSpan="5">
                  Nobody has visited or booked a visit yet.
                </td>
              </tr>
            )}
            {visits.map((visit) => (
              <tr key={visit.id}>
                <td>{visit.visitorName}</td>
                <td>{visit.visitDate}</td>
                <td>{visit.timeSlot}</td>
                <td>{visit.status}</td>
                <td>
                  {visit.status === 'Scheduled' && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => cancelVisit(visit.id)}>
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="list-head" style={{ marginTop: '28px' }}>
        <h2>Patients I have visited</h2>
        <span className="count">
          {visiting.length} {visiting.length === 1 ? 'visit' : 'visits'}
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Patient visited</th>
              <th>Came in</th>
              <th>Left</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visiting.length === 0 && (
              <tr>
                <td className="empty" colSpan="4">
                  The front desk has not logged any visits by you.
                </td>
              </tr>
            )}
            {visiting.map((visit) => (
              <tr key={visit.id}>
                <td>{visit.patientName || 'Another patient'}</td>
                <td>{visit.checkInTime ? formatDateTime(visit.checkInTime) : `${visit.visitDate} ${visit.timeSlot}`}</td>
                <td>{visit.checkOutTime ? formatDateTime(visit.checkOutTime) : <span className="muted">{visit.status === 'Checked In' ? 'Still in' : '—'}</span>}</td>
                <td>{visit.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MyVisitation;