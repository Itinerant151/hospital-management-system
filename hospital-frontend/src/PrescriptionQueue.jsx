import { useEffect, useMemo, useState } from 'react';
import api from './api';
import SearchFilter from './SearchFilter';
import { useConfirm } from './ConfirmDialog';
import { formatDateTime } from './format';

function PrescriptionQueue() {
  const confirm = useConfirm();
  const [prescriptions, setPrescriptions] = useState([]);
  const [tab, setTab] = useState('waiting');
  const [filtered, setFiltered] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const response = await api.get('/api/prescriptions');
      setPrescriptions(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the prescriptions. Please try again in a moment.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const waitingCount = prescriptions.filter((p) => !p.dispensed).length;
  const dispensedCount = prescriptions.length - waitingCount;

  // The waiting list shows the oldest first, so nobody is left waiting
  const rows = useMemo(() => {
    const list = prescriptions.filter((p) => (tab === 'waiting' ? !p.dispensed : p.dispensed));
    return tab === 'waiting' ? [...list].reverse() : list;
  }, [prescriptions, tab]);

  const dispense = async (p) => {
    const ok = await confirm(
      `Dispense this prescription for ${p.patientName}? The quantities will be taken out of stock.`,
      { title: 'Dispense prescription', confirmLabel: 'Dispense', danger: false }
    );
    if (!ok) return;
    setBusyId(p.id);
    setMessage('');
    setError('');
    try {
      await api.post(`/api/prescriptions/${p.id}/dispense`);
      setMessage(`Prescription for ${p.patientName} dispensed.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not dispense this prescription. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Prescriptions</h1>
        <p>Dispense prescriptions written by doctors. Dispensing takes the quantities out of the medicine stock.</p>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}

      <div className="row-actions" style={{ marginBottom: '14px' }}>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'waiting' ? 'btn-primary' : 'btn-quiet'}`}
          onClick={() => setTab('waiting')}
        >
          Waiting ({waitingCount})
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'dispensed' ? 'btn-primary' : 'btn-quiet'}`}
          onClick={() => setTab('dispensed')}
        >
          Dispensed ({dispensedCount})
        </button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={load}>Refresh</button>
      </div>

      <SearchFilter
        data={rows}
        fields={['patientName', 'doctorName']}
        onFiltered={setFiltered}
        placeholder="Search by patient or doctor..."
      />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Issued</th>
              <th>Patient</th>
              <th>Prescribed by</th>
              <th>Medications</th>
              <th>{tab === 'waiting' ? 'Actions' : 'Dispensed'}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td className="empty" colSpan="5">
                  {tab === 'waiting' ? 'No prescriptions are waiting.' : 'Nothing has been dispensed yet.'}
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>{p.createdAt ? formatDateTime(p.createdAt) : p.dateIssued}</td>
                <td>{p.patientName}</td>
                <td>{p.doctorName || <span className="muted">Unknown</span>}</td>
                <td>
                  {(p.items || []).map((item, i) => (
                    <div key={i} style={{ marginBottom: '6px' }}>
                      <strong>{item.medicationName}</strong> × {item.quantity}
                      <br />
                      <span className="muted">
                        {item.dosage}
                        {item.duration ? ` · ${item.duration}` : ''}
                        {item.instructions ? ` · ${item.instructions}` : ''}
                        {item.medicineId ? '' : ' · not tracked in stock'}
                      </span>
                    </div>
                  ))}
                  {p.notes && <div className="muted">Note: {p.notes}</div>}
                </td>
                <td>
                  {p.dispensed ? (
                    <>
                      {p.dispensedAt ? formatDateTime(p.dispensedAt) : 'Dispensed'}
                      {p.dispensedBy && (
                        <>
                          <br />
                          <span className="muted">by {p.dispensedBy}</span>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busyId === p.id}
                        onClick={() => dispense(p)}
                      >
                        {busyId === p.id ? 'Dispensing...' : 'Dispense'}
                      </button>
                    </div>
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

export default PrescriptionQueue;