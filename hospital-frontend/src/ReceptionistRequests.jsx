import { useEffect, useState } from 'react';
import api from './api';

const ROLE_LABELS = {
  RECEPTIONIST: 'Receptionist',
  LAB_STAFF: 'Laboratory staff',
};

// Pending staff applications (receptionists and laboratory staff)
function ReceptionistRequests() {
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const response = await api.get('/api/admin/receptionist-requests');
      setRequests(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the applications.');
    }
  };

  useEffect(() => { load(); }, []);

  const roleLabel = (request) => ROLE_LABELS[request.requestedRole] || 'Staff';

  const approve = async (request) => {
    try {
      await api.put(`/api/admin/receptionist-requests/${request.id}/approve`);
      setMessage(`${roleLabel(request)} approved. They can now log in.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not approve the application.');
    }
  };

  const reject = async (request) => {
    try {
      await api.delete(`/api/admin/receptionist-requests/${request.id}`);
      setMessage(`${roleLabel(request)} application rejected.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reject the application.');
    }
  };

  return (
    <div>
      <div className="page-head"><h1>Staff applications</h1><p>Review receptionist and laboratory staff applications before granting access to MediCore.</p></div>
      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Applying as</th><th>Username</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
          <tbody>
            {requests.length === 0 && <tr><td className="empty" colSpan="6">No pending staff applications.</td></tr>}
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{request.fullName || '—'}</td>
                <td>{roleLabel(request)}</td>
                <td>{request.username}</td>
                <td>{request.email}</td>
                <td>{request.phoneNumber || '—'}</td>
                <td><div className="row-actions"><button className="btn btn-primary btn-sm" onClick={() => approve(request)}>Accept</button><button className="btn btn-danger btn-sm" onClick={() => reject(request)}>Reject</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ReceptionistRequests;