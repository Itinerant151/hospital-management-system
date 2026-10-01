import { useState, useEffect } from 'react';
import api from './api';

function VisitationAdmin() {
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    fetchVisits();
  }, []);

  const fetchVisits = async () => {
    const response = await api.get('/api/visitation');
    setVisits(response.data);
  };

  const updateStatus = async (id, status) => {
    await api.put(`/api/visitation/${id}/status`, { status });
    fetchVisits();
  };

  return (
    <div>
      <div className="page-head">
        <h1>Visitation</h1>
        <p>See scheduled visits and check visitors in or out at the front desk.</p>
      </div>

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
              <th>Relation</th>
              <th>Phone number</th>
              <th>Date</th>
              <th>Time slot</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visits.length === 0 && (
              <tr>
                <td className="empty" colSpan="6">
                  No visits scheduled yet.
                </td>
              </tr>
            )}
            {visits.map((visit) => (
              <tr key={visit.id}>
                <td>{visit.visitorName}</td>
                <td>{visit.relation || <span className="muted">Not given</span>}</td>
                <td>{visit.phoneNumber || <span className="muted">Not given</span>}</td>
                <td>{visit.visitDate}</td>
                <td>{visit.timeSlot}</td>
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