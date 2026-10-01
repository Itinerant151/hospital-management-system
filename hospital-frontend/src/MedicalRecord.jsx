import { useEffect, useState } from 'react';
import api from './api';

function MedicalRecord({ patientId, onBack, canEdit = false }) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    medicalHistory: '',
    allergies: '',
    disabilities: '',
    bloodGroup: '',
    rhFactor: '',
    notes: '',
  });

  const loadPatient = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/patients/${patientId}`);
      setPatient(response.data);

      setForm({
        medicalHistory: response.data.medicalHistory || '',
        allergies: response.data.allergies || '',
        disabilities: response.data.disabilities || '',
        bloodGroup: response.data.bloodGroup || '',
        rhFactor: response.data.rhFactor || '',
        notes: response.data.notes || '',
      });
    } catch (error) {
      setMessage(
        error.response?.data?.message || 'Unable to load the medical record.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadPatient();
    }
  }, [patientId]);

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const saveMedicalRecord = async () => {
    try {
      setSaving(true);
      setMessage('');

      await api.put(`/patients/${patientId}/medical-profile`, {
        medicalHistory: form.medicalHistory,
        allergies: form.allergies,
        disabilities: form.disabilities,
        bloodGroup: form.bloodGroup,
        rhFactor: form.rhFactor,
        notes: form.notes,
      });

      setMessage('Medical record updated successfully.');
      await loadPatient();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          'Unable to update the medical record.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="panel">
        <p className="muted">Loading medical record...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="panel">
        <p className="alert alert-error">
          Patient medical record could not be found.
        </p>

        <button className="btn btn-quiet" onClick={onBack}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <button
          type="button"
          className="btn btn-quiet btn-sm"
          onClick={onBack}
          style={{ marginBottom: '12px' }}
        >
          ← Back to patients
        </button>

        <h1>Medical Record</h1>
        <p>
          Medical history and clinical information for{' '}
          <strong>{patient.name}</strong>.
        </p>
      </div>

      {message && (
        <div
          className={`alert ${
            message.includes('successfully')
              ? 'alert-success'
              : 'alert-error'
          }`}
        >
          {message}
        </div>
      )}

      <section className="panel">
        <div className="list-head">
          <div>
            <h2 className="panel-title">{patient.name}</h2>
            <p className="muted">
              Patient ID: {patient.id || 'Not available'}
            </p>
          </div>

          {patient.emergencyPatient && (
            <span className="status-badge status-warning">
              Emergency Patient
            </span>
          )}
        </div>

        <div className="form-grid">
          <div className="field">
            <span>Full name</span>
            <div className="readonly-field">{patient.name || '—'}</div>
          </div>

          <div className="field">
            <span>Age</span>
            <div className="readonly-field">{patient.age ?? '—'}</div>
          </div>

          <div className="field">
            <span>Gender</span>
            <div className="readonly-field">{patient.gender || '—'}</div>
          </div>

          <div className="field">
            <span>Date of birth</span>
            <div className="readonly-field">
              {patient.dateOfBirth || '—'}
            </div>
          </div>

          <div className="field">
            <span>Blood group</span>

            {canEdit ? (
              <select
                value={form.bloodGroup}
                onChange={(event) =>
                  updateField('bloodGroup', event.target.value)
                }
              >
                <option value="">Not recorded</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="AB">AB</option>
                <option value="O">O</option>
              </select>
            ) : (
              <div className="readonly-field">
                {patient.bloodGroup || 'Not recorded'}
              </div>
            )}
          </div>

          <div className="field">
            <span>Rh factor</span>

            {canEdit ? (
              <select
                value={form.rhFactor}
                onChange={(event) =>
                  updateField('rhFactor', event.target.value)
                }
              >
                <option value="">Not recorded</option>
                <option value="Positive (+)">Positive (+)</option>
                <option value="Negative (-)">Negative (-)</option>
              </select>
            ) : (
              <div className="readonly-field">
                {patient.rhFactor || 'Not recorded'}
              </div>
            )}
          </div>

          <div className="field">
            <span>Phone number</span>
            <div className="readonly-field">
              {patient.phoneNumber || '—'}
            </div>
          </div>

          <div className="field">
            <span>Email</span>
            <div className="readonly-field">{patient.email || '—'}</div>
          </div>

          <div className="field">
            <span>Assigned doctor</span>
            <div className="readonly-field">
              {patient.doctorId || 'Not assigned'}
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Medical History</h2>

        {canEdit ? (
          <>
            <label className="field field-full">
              <span>Medical history</span>
              <textarea
                rows="7"
                value={form.medicalHistory}
                onChange={(event) =>
                  updateField('medicalHistory', event.target.value)
                }
                placeholder="Previous illnesses, surgeries, chronic conditions and other relevant medical history"
              />
            </label>

            <label className="field field-full">
              <span>Allergies</span>
              <textarea
                rows="4"
                value={form.allergies}
                onChange={(event) =>
                  updateField('allergies', event.target.value)
                }
                placeholder="Medication, food or other allergies"
              />
            </label>

            <label className="field field-full">
              <span>Disabilities</span>
              <textarea
                rows="4"
                value={form.disabilities}
                onChange={(event) =>
                  updateField('disabilities', event.target.value)
                }
                placeholder="Record relevant disabilities or accessibility requirements"
              />
            </label>

            <label className="field field-full">
              <span>Clinical notes</span>
              <textarea
                rows="6"
                value={form.notes}
                onChange={(event) =>
                  updateField('notes', event.target.value)
                }
                placeholder="Doctor's clinical observations, treatment notes and other relevant information"
              />
            </label>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={saveMedicalRecord}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save medical record'}
              </button>
            </div>
          </>
        ) : (
          <div className="medical-record-view">
            <div className="record-section">
              <h3>Medical history</h3>
              <p>{patient.medicalHistory || 'No medical history recorded.'}</p>
            </div>

            <div className="record-section">
              <h3>Allergies</h3>
              <p>{patient.allergies || 'No allergies recorded.'}</p>
            </div>

            <div className="record-section">
              <h3>Disabilities</h3>
              <p>{patient.disabilities || 'No disabilities recorded.'}</p>
            </div>

            <div className="record-section">
              <h3>Clinical notes</h3>
              <p>{patient.notes || 'No clinical notes recorded.'}</p>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <h2 className="panel-title">Emergency & Contact Information</h2>

        <div className="form-grid">
          <div className="field">
            <span>Emergency contact</span>
            <div className="readonly-field">
              {patient.emergencyContactName || '—'}
            </div>
          </div>

          <div className="field">
            <span>Emergency contact phone</span>
            <div className="readonly-field">
              {patient.emergencyContactPhone || '—'}
            </div>
          </div>

          <div className="field">
            <span>Relationship</span>
            <div className="readonly-field">
              {patient.emergencyContactRelationship || '—'}
            </div>
          </div>

          <div className="field">
            <span>Next of kin</span>
            <div className="readonly-field">
              {patient.nextOfKin || '—'}
            </div>
          </div>

          <div className="field">
            <span>Next of kin phone</span>
            <div className="readonly-field">
              {patient.nextOfKinPhone || '—'}
            </div>
          </div>

          <div className="field">
            <span>Insurance provider</span>
            <div className="readonly-field">
              {patient.insuranceProvider || '—'}
            </div>
          </div>

          <div className="field">
            <span>Insurance number</span>
            <div className="readonly-field">
              {patient.insuranceNumber || '—'}
            </div>
          </div>

          <div className="field field-full">
            <span>Address</span>
            <div className="readonly-field">
              {patient.address || '—'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default MedicalRecord;