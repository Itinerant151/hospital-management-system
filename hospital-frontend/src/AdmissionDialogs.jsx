import { useEffect, useMemo, useState } from 'react';
import api from './api';
import Overlay from './Overlay';
import { formatNaira } from './currency';
import { dayText } from './wardsHelpers';

// ---------- Admit ----------

export function AdmitDialog({ wards, beds, patients, doctors, admissions, presetBedId, onClose, onDone }) {
  const presetBed = beds.find((b) => b.id === presetBedId);

  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [wardId, setWardId] = useState(presetBed ? presetBed.wardId : '');
  const [bedId, setBedId] = useState(presetBed ? presetBed.id : '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Patients who are not already in a bed
  const admittedIds = useMemo(
    () => new Set(admissions.filter((a) => a.status === 'ADMITTED').map((a) => a.patientId)),
    [admissions]
  );
  const freePatients = patients.filter((p) => !admittedIds.has(p.id));
  const freeBeds = beds.filter((b) => b.status === 'AVAILABLE' && b.wardId === wardId);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('/api/admissions/admit', {
        patientId,
        bedId,
        attendingDoctorId: doctorId,
        reason,
      });
      onDone(`${response.data.patientName} admitted to ${response.data.wardName}, bed ${response.data.bedLabel}.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not admit the patient.');
    }
  };

  return (
    <Overlay title="Admit a patient" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label className="field">
            <span>Patient</span>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
              <option value="">Select a patient</option>
              {freePatients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Attending doctor (optional)</span>
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">No doctor chosen</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>)}
            </select>
          </label>

          <label className="field">
            <span>Ward</span>
            <select
              value={wardId}
              onChange={(e) => { setWardId(e.target.value); setBedId(''); }}
              required
            >
              <option value="">Select a ward</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} - {w.available} free ({formatNaira(w.dailyRate)} a day)
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Bed</span>
            <select value={bedId} onChange={(e) => setBedId(e.target.value)} required disabled={!wardId}>
              <option value="">{wardId ? (freeBeds.length ? 'Select a bed' : 'No free beds in this ward') : 'Pick a ward first'}</option>
              {freeBeds.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </label>

          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span>Reason for admission</span>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} required />
          </label>
        </div>

        {error && <p className="alert alert-error" role="alert" style={{ marginTop: '14px' }}>{error}</p>}
        <div className="form-actions" style={{ marginTop: '18px' }}>
          <button type="submit" className="btn btn-primary">Admit patient</button>
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Overlay>
  );
}

// ---------- Transfer ----------

export function TransferDialog({ admission, wards, beds, onClose, onDone }) {
  const [bedId, setBedId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const free = beds.filter((b) => b.status === 'AVAILABLE');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.put(`/api/admissions/${admission.id}/transfer`, { bedId, reason });
      onDone(`${response.data.patientName} moved to ${response.data.wardName}, bed ${response.data.bedLabel}.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not transfer the patient.');
    }
  };

  return (
    <Overlay title={`Transfer ${admission.patientName}`} onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Currently in {admission.wardName}, bed {admission.bedLabel}. The time in the current bed is billed at that
        ward's rate; the new bed is billed at its own rate from now.
      </p>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label className="field">
            <span>Move to bed</span>
            <select value={bedId} onChange={(e) => setBedId(e.target.value)} required>
              <option value="">{free.length ? 'Select a bed' : 'No free beds anywhere'}</option>
              {wards.map((ward) => {
                const wardFree = free.filter((b) => b.wardId === ward.id);
                if (wardFree.length === 0) return null;
                return (
                  <optgroup key={ward.id} label={`${ward.name} (${formatNaira(ward.dailyRate)} a day)`}>
                    {wardFree.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
                  </optgroup>
                );
              })}
            </select>
          </label>

          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span>Reason for the transfer</span>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} required />
          </label>
        </div>

        {error && <p className="alert alert-error" role="alert" style={{ marginTop: '14px' }}>{error}</p>}
        <div className="form-actions" style={{ marginTop: '18px' }}>
          <button type="submit" className="btn btn-primary">Transfer patient</button>
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Overlay>
  );
}

// ---------- Discharge ----------

export function DischargeDialog({ admission, onClose, onDone }) {
  const [charges, setCharges] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get(`/api/admissions/${admission.id}/charges`)
      .then((response) => setCharges(response.data))
      .catch(() => setError('Could not work out the bed charges.'));
  }, [admission.id]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const response = await api.post(`/api/admissions/${admission.id}/discharge`, { note });
      onDone(`${response.data.patientName} discharged. A bed-charge bill of ${formatNaira(response.data.charges)} was created.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not discharge the patient.');
      setBusy(false);
    }
  };

  return (
    <Overlay title={`Discharge ${admission.patientName}`} onClose={onClose}>
      <form onSubmit={submit}>
        <h3 style={{ marginBottom: '8px' }}>Bed charges to be billed</h3>
        {!charges && !error && <p className="muted">Working out the charges...</p>}
        {charges && (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Item</th><th>Amount</th></tr></thead>
                <tbody>
                  {charges.items.map((item, i) => (
                    <tr key={i}><td>{item.description}</td><td>{formatNaira(item.amount)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="charge-total">
              <span>Total for {dayText(charges.days)}</span>
              <span>{formatNaira(charges.total)}</span>
            </div>
            <p className="muted">The time is counted up to the moment you confirm, so the final total can be slightly higher.</p>
          </>
        )}

        <label className="field" style={{ marginTop: '14px' }}>
          <span>Discharge note (optional)</span>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </label>

        {error && <p className="alert alert-error" role="alert" style={{ marginTop: '14px' }}>{error}</p>}
        <div className="form-actions" style={{ marginTop: '18px' }}>
          <button type="submit" className="btn btn-primary" disabled={busy || !charges}>
            Discharge and create bill
          </button>
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Overlay>
  );
}