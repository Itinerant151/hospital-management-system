import { useEffect, useState } from 'react';
import api from './api';

function ReceptionistRequests() {
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState('');

  const load = async () => {
    const response = await api.get('/api/admin/receptionist-requests');
    setRequests(response.data);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    await api.put(`/api/admin/receptionist-requests/${id}/approve`);
    setMessage('Receptionist approved. They can now log in.');
    load();
  };

  const reject = async (id) => {
    await api.delete(`/api/admin/receptionist-requests/${id}`);
    setMessage('Receptionist application rejected.');
    load();
  };

  return (
    <div>
      <div className="page-head"><h1>Receptionist applications</h1><p>Review front-desk applications before granting access to MediCore.</p></div>
      {message && <p className="alert alert-success">{message}</p>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
          <tbody>
            {requests.length === 0 && <tr><td className="empty" colSpan="5">No pending receptionist applications.</td></tr>}
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{request.fullName || '—'}</td><td>{request.username}</td><td>{request.email}</td><td>{request.phoneNumber || '—'}</td>
                <td><div className="row-actions"><button className="btn btn-primary btn-sm" onClick={() => approve(request.id)}>Accept</button><button className="btn btn-danger btn-sm" onClick={() => reject(request.id)}>Reject</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ReceptionistRequests;
