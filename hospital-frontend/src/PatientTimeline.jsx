import { useEffect, useMemo, useState } from 'react';
import api from './api';
import { formatDateTime } from './format';

const TYPES = [
  { key: 'ALL', label: 'Everything' },
  { key: 'APPOINTMENT', label: 'Appointments' },
  { key: 'DIAGNOSIS', label: 'Diagnoses' },
  { key: 'PRESCRIPTION', label: 'Prescriptions' },
  { key: 'VISIT', label: 'Visits' },
];

const TYPE_LABELS = {
  APPOINTMENT: 'Appointment',
  DIAGNOSIS: 'Diagnosis and treatment',
  PRESCRIPTION: 'Prescription',
  VISIT: 'Hospital visit',
};

// A patient's history in date order. Use `mine` for the logged-in patient, or `patientId` for staff.
function PatientTimeline({ patientId, mine = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [type, setType] = useState('ALL');
  const [newestFirst, setNewestFirst] = useState(true);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    const url = mine ? '/api/timeline/mine' : `/api/timeline/patient/${patientId}`;
    api
      .get(url)
      .then((response) => alive && setData(response.data))
      .catch((err) => alive && setError(err.response?.data?.message || 'Could not load the history.'));
    return () => {
      alive = false;
    };
  }, [patientId, mine]);

  const events = useMemo(() => {
    if (!data) return [];
    const list = type === 'ALL' ? data.events : data.events.filter((e) => e.type === type);
    return newestFirst ? list : [...list].reverse();
  }, [data, type, newestFirst]);

  if (error) return <p className="alert alert-error" role="alert">{error}</p>;
  if (!data) return <p className="muted">Loading history...</p>;

  return (
    <div>
      {data.currentDiagnosis && (
        <div className="current-diagnosis">
          <span className="label">Current diagnosis</span>
          {data.currentDiagnosis}
        </div>
      )}

      <div className="timeline-bar">
        <div className="timeline-filters">
          {TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`btn ${type === t.key ? 'btn-primary' : 'btn-quiet'}`}
              onClick={() => setType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setNewestFirst((v) => !v)}>
          {newestFirst ? 'Newest first' : 'Oldest first'}
        </button>
      </div>

      {events.length === 0 ? (
        <p className="muted">Nothing to show here yet.</p>
      ) : (
        <ol className="timeline">
          {events.map((event, i) => (
            <li key={`${event.date}-${i}`} className={`timeline-item tl-${event.type.toLowerCase()}`}>
              <div className="timeline-head">
                <span className="timeline-type">{TYPE_LABELS[event.type] || event.type}</span>
                <span className="timeline-date">{formatDateTime(event.date)}</span>
              </div>
              <div className="timeline-title">{event.title}</div>
              {event.detail && <div className="timeline-detail">{event.detail}</div>}
              {event.by && <div className="timeline-by">{event.by}</div>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default PatientTimeline;