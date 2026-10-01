import { useState, useEffect } from 'react';
import api from './api';

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

function MyVisitation() {
  const [visits, setVisits] = useState([]);
  const [visitorName, setVisitorName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [relation, setRelation] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    const response = await api.get('/api/visitation/mine');
    setVisits(response.data);
  };

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
        <p>Book a visitor and see your scheduled visits.</p>
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
        <h2>Your visits</h2>
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
                  You have no visits scheduled yet.
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
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => cancelVisit(visit.id)}
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MyVisitation;