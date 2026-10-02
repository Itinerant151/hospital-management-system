import { useEffect, useMemo, useState } from 'react';
import api from './api';
import { useConfirm } from './ConfirmDialog';
import PrescriptionCard from './PrescriptionCard';

// Pharmacy view for the administrator: see every prescription and dispense it (stock goes down)
function PrescriptionQueue() {
  const confirm = useConfirm();
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('WAITING');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const response = await api.get('/api/prescriptions');
    setList(response.data);
  };

  useEffect(() => {
    load().catch(() => setError('Could not load prescriptions.'));
  }, []);

  const dispense = async (prescription) => {
    setError('');
    setMessage('');
    const ok = await confirm(
      `Dispense this prescription for ${prescription.patientName || 'the patient'}? Pharmacy stock will be reduced.`,
      { title: 'Dispense prescription', confirmLabel: 'Dispense', danger: false }
    );
    if (!ok) return;
    try {
      await api.post(`/api/prescriptions/${prescription.id}/dispense`);
      setMessage('Prescription dispensed and stock updated.');
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not dispense the prescription.');
    }
  };

  const visible = useMemo(() => {
    if (filter === 'WAITING') return list.filter((p) => !p.dispensed);
    if (filter === 'DISPENSED') return list.filter((p) => p.dispensed);
    return list;
  }, [list, filter]);

  return (
    <div>
      <div className="page-head">
        <h1>Prescriptions</h1>
        <p>Every prescription written by the doctors. Dispensing one takes the medicines out of the pharmacy stock.</p>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}

      <div className="list-head">
        <h2>Prescription queue</h2>
        <div className="row-actions">
          <select className="cell-select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter prescriptions">
            <option value="WAITING">Waiting for the pharmacy</option>
            <option value="DISPENSED">Dispensed</option>
            <option value="ALL">All</option>
          </select>
          <span className="count">{visible.length} {visible.length === 1 ? 'prescription' : 'prescriptions'}</span>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="muted">No prescriptions to show.</p>
      ) : (
        <div className="rx-grid">
          {visible.map((prescription) => (
            <PrescriptionCard key={prescription.id} prescription={prescription} showPatient>
              {!prescription.dispensed && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => dispense(prescription)}>
                  Dispense
                </button>
              )}
            </PrescriptionCard>
          ))}
        </div>
      )}
    </div>
  );
}

export default PrescriptionQueue;