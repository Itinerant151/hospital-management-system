import { useEffect, useState } from 'react';
import api from './api';
import PrescriptionCard from './PrescriptionCard';

// The patient's own prescriptions
function MyPrescriptions() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/prescriptions/mine')
      .then((response) => setList(response.data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load your prescriptions.'));
  }, []);

  return (
    <div>
      <div className="page-head">
        <h1>My prescriptions</h1>
        <p>Medication your doctors have prescribed, with the dosage and how to take it.</p>
      </div>

      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {!list && !error && <p className="muted">Loading your prescriptions...</p>}
      {list && list.length === 0 && <p className="muted">You have no prescriptions yet.</p>}
      {list && list.length > 0 && (
        <div className="rx-grid">
          {list.map((prescription) => (
            <PrescriptionCard key={prescription.id} prescription={prescription} />
          ))}
        </div>
      )}
    </div>
  );
}

export default MyPrescriptions;