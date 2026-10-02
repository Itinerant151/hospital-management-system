import { useEffect, useState } from 'react';
import api from './api';
import PrescriptionCard from './PrescriptionCard';

const EMPTY_ITEM = { medicationName: '', dosage: '', duration: '', quantity: '', instructions: '' };

// Doctors write prescriptions here and see the ones they have issued
function DoctorPrescriptions({ presetPatientId }) {
  const ownDoctorId = localStorage.getItem('doctorId');

  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [issued, setIssued] = useState([]);

  const [patientId, setPatientId] = useState(presetPatientId || '');
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const [mine, emergency, meds] = await Promise.all([
        ownDoctorId ? api.get(`/patients/by-doctor/${ownDoctorId}`) : Promise.resolve({ data: [] }),
        api.get('/patients/emergency'),
        api.get('/api/medicines'),
      ]);
      const seen = new Set();
      const combined = [...mine.data, ...emergency.data].filter((p) => !seen.has(p.id) && seen.add(p.id));
      setPatients(combined);
      setMedicines(meds.data);
    };
    load().catch(() => setError('Could not load your patients. Check that the backend is running.'));
    loadIssued();
  }, []);

  useEffect(() => {
    if (presetPatientId) setPatientId(presetPatientId);
  }, [presetPatientId]);

  const loadIssued = async () => {
    try {
      const response = await api.get('/api/prescriptions/mine');
      setIssued(response.data);
    } catch (err) {
      setIssued([]);
    }
  };

  const updateItem = (index, field, value) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const filled = items.filter((it) => it.medicationName.trim() || it.dosage.trim());
    if (!patientId) {
      setError('Choose a patient.');
      return;
    }
    if (filled.length === 0) {
      setError('Add at least one medication.');
      return;
    }
    for (const it of filled) {
      if (!it.medicationName.trim() || !it.dosage.trim()) {
        setError('Every medication needs a name and a dosage.');
        return;
      }
    }

    const body = {
      patientId,
      notes,
      items: filled.map((it) => {
        const match = medicines.find((m) => m.name.toLowerCase() === it.medicationName.trim().toLowerCase());
        return {
          medicationName: it.medicationName.trim(),
          medicineId: match ? match.id : null,
          dosage: it.dosage.trim(),
          duration: it.duration.trim(),
          quantity: Number(it.quantity) || 0,
          instructions: it.instructions.trim(),
        };
      }),
    };

    try {
      await api.post('/api/prescriptions', body);
      const patient = patients.find((p) => p.id === patientId);
      setMessage(`Prescription issued to ${patient ? patient.name : 'the patient'}. They can see it under My prescriptions.`);
      setItems([{ ...EMPTY_ITEM }]);
      setNotes('');
      loadIssued();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not issue the prescription.');
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Prescriptions</h1>
        <p>Prescribe medication for your patients. They see it in their portal straight away.</p>
      </div>

      <section className="panel">
        <h2 className="panel-title">Write a prescription</h2>
        <form onSubmit={submit}>
          <label className="field" style={{ maxWidth: '360px', marginBottom: '16px' }}>
            <span>Patient</span>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
              <option value="">Select a patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.emergencyPatient ? ' (emergency)' : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="rx-row rx-row-head">
            <span>Medication</span>
            <span>Dosage</span>
            <span>Duration</span>
            <span>Quantity</span>
            <span>Instructions</span>
            <span />
          </div>
          {items.map((item, i) => (
            <div className="rx-row" key={i}>
              <input
                type="text"
                list="rx-medicines"
                placeholder="e.g. Amoxicillin"
                value={item.medicationName}
                onChange={(e) => updateItem(i, 'medicationName', e.target.value)}
              />
              <input
                type="text"
                placeholder="500 mg, twice daily"
                value={item.dosage}
                onChange={(e) => updateItem(i, 'dosage', e.target.value)}
              />
              <input
                type="text"
                placeholder="5 days"
                value={item.duration}
                onChange={(e) => updateItem(i, 'duration', e.target.value)}
              />
              <input
                type="number"
                min="0"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateItem(i, 'quantity', e.target.value)}
              />
              <input
                type="text"
                placeholder="Take after meals"
                value={item.instructions}
                onChange={(e) => updateItem(i, 'instructions', e.target.value)}
              />
              {items.length > 1 ? (
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}>
                  Remove
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
          <datalist id="rx-medicines">
            {medicines.map((m) => (
              <option key={m.id} value={m.name} />
            ))}
          </datalist>

          <div style={{ margin: '4px 0 16px' }}>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}>
              + Add another medication
            </button>
          </div>

          <label className="field" style={{ marginBottom: '16px' }}>
            <span>Notes for the patient (optional)</span>
            <textarea rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="General advice, follow-up, warnings..." />
          </label>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Issue prescription</button>
          </div>
        </form>
        {error && <p className="alert alert-error" role="alert" style={{ marginTop: '16px', marginBottom: 0 }}>{error}</p>}
        {message && <p className="alert alert-success" style={{ marginTop: '16px', marginBottom: 0 }}>{message}</p>}
      </section>

      <div className="list-head">
        <h2>Prescriptions I have issued</h2>
        <span className="count">{issued.length} {issued.length === 1 ? 'prescription' : 'prescriptions'}</span>
      </div>
      {issued.length === 0 ? (
        <p className="muted">You have not issued any prescriptions yet.</p>
      ) : (
        <div className="rx-grid">
          {issued.map((prescription) => (
            <PrescriptionCard key={prescription.id} prescription={prescription} showPatient showDoctor={false} />
          ))}
        </div>
      )}
    </div>
  );
}

export default DoctorPrescriptions;