import { useState, useEffect } from 'react';
import api from './api';
import { formatDateTime } from './format';

// Every visit, with who is visiting whom, and a status control for the front desk
function VisitationAdmin() {
  const [visits, setVisits] = useState([]);
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState('');

  const fetchVisits = async () => {
    const [visitResponse, patientResponse] = await Promise.all([api.get('/api/visitation'), api.get('/patients')]);
    setVisits(visitResponse.data);
    setPatients(patientResponse.data);
  };

  useEffect(() => {
    fetchVisits().catch(() => setError('Could not load the visits. Check that the backend is running.'));
  }, []);

  const updateStatus = async (id, status) => {
    setError('');
    try {
      await api.put(`/api/visitation/${id}/status`, { status });
      fetchVisits();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the visit.');
    }
  };

  const patientName = (visit) => visit.patientName || patients.find((p) => p.id === visit.patientId)?.name || 'Unknown';

  return (
    <div>
      <div className="page-head">
        <h1>Visitation</h1>
        <p>See who is visiting which patient and check visitors in or out. Walk-in visitors are recorded in the Visitor logbook.</p>
      </div>

      {error && <p className="alert alert-error" role="alert">{error}</p>}

      <div className="list-head">
        <h2>Visits</h2>
        <span className="count">
          {visits.length} {visits.length === 1 ? 'visit' : 'visits'}
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Visitor</th>
              <th>Visiting</th>
              <th>Relation</th>
              <th>Phone number</th>
              <th>Date</th>
              <th>Time slot</th>
              <th>Checked in</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visits.length === 0 && (
              <tr>
                <td className="empty" colSpan="8">
                  No visits yet.
                </td>
              </tr>
            )}
            {visits.map((visit) => (
              <tr key={visit.id}>
                <td>
                  <div>{visit.visitorName}</div>
                  {visit.visitorPatientId && <span className="badge badge-scheduled">Hospital patient</span>}
                </td>
                <td><strong>{patientName(visit)}</strong></td>
                <td>{visit.relation || <span className="muted">Not given</span>}</td>
                <td>{visit.phoneNumber || <span className="muted">Not given</span>}</td>
                <td>{visit.visitDate}</td>
                <td>{visit.timeSlot}</td>
                <td>{visit.checkInTime ? formatDateTime(visit.checkInTime) : <span className="muted">Not yet</span>}</td>
                <td>
                  <select
                    className="cell-select"
                    value={visit.status}
                    onChange={(e) => updateStatus(visit.id, e.target.value)}
                    aria-label="Visit status"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Checked In">Checked In</option>
                    <option value="Checked Out">Checked Out</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VisitationAdmin;