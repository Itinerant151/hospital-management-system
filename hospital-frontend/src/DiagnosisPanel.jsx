import { useEffect, useState } from 'react';
import api from './api';
import { formatDateTime } from './format';

// The doctor's diagnosis form (replaces the old popup). Saves the diagnosis and an optional treatment plan.
function DiagnosisPanel({ patient, onClose, onSaved }) {
  const [diagnosis, setDiagnosis] = useState(patient.diagnosis || '');
  const [treatment, setTreatment] = useState('');
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api
      .get(`/api/diagnoses/${patient.id}`)
      .then((response) => alive && setHistory(response.data))
      .catch(() => alive && setHistory([]));
    return () => {
      alive = false;
    };
  }, [patient.id]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (!diagnosis.trim()) {
      setError('Type the diagnosis before saving.');
      return;
    }
    try {
      await api.put(`/api/diagnoses/${patient.id}`, { diagnosis, treatment });
      onSaved(`Diagnosis saved for ${patient.name}.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the diagnosis.');
    }
  };

  return (
    <section className="panel prompt-card" aria-label="Diagnosis">
      <div className="list-head">
        <h2 className="panel-title">Diagnosis: {patient.name}</h2>
        <button type="button" className="btn btn-quiet btn-sm" onClick={onClose}>Close</button>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Current diagnosis: {patient.diagnosis || 'None recorded yet'}
      </p>
      <form className="form-grid" onSubmit={save}>
        <label className="field field-full">
          <span>Diagnosis</span>
          <textarea
            rows="3"
            value={diagnosis}
            onChange={(e) => { setDiagnosis(e.target.value); setError(''); }}
            placeholder="What is the patient's condition?"
            autoFocus
          />
        </label>
        <label className="field field-full">
          <span>Treatment or plan (optional)</span>
          <textarea
            rows="3"
            value={treatment}
            onChange={(e) => setTreatment(e.target.value)}
            placeholder="Treatment given, advice, follow-up..."
          />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Save diagnosis</button>
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
        </div>
      </form>
      {error && (
        <p className="alert alert-error" role="alert" style={{ marginTop: '16px', marginBottom: 0 }}>{error}</p>
      )}
      {history.length > 0 && (
        <div style={{ marginTop: '18px' }}>
          <span className="label">Earlier entries</span>
          {history.slice(0, 5).map((entry) => (
            <div className="notif-item" key={entry.id}>
              <strong>{entry.diagnosis}</strong>
              {entry.treatment && <div>Treatment: {entry.treatment}</div>}
              <div className="notif-meta">{entry.doctorName} · {formatDateTime(entry.recordedAt)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default DiagnosisPanel;