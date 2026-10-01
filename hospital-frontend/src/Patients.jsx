import { useEffect, useState } from 'react';
import api from './api';
import SearchFilter from './SearchFilter';
import { useConfirm } from './ConfirmDialog';
import MedicalRecord from './MedicalRecord';
import PatientDetailsForm from './PatientDetailsForm';

function Patients() {
  const confirm = useConfirm();
  const role = localStorage.getItem('role');
  const isReception = role === 'RECEPTIONIST';

  const [patients, setPatients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [patientsResponse, doctorsResponse] = await Promise.all([
        api.get('/patients'),
        api.get('/doctors'),
      ]);

      setPatients(patientsResponse.data);
      setFiltered(patientsResponse.data);
      setDoctors(doctorsResponse.data);
    } catch (err) {
      console.error('Failed to load patients:', err);
    }
  };

  const assignDoctor = async (patientId, doctorId) => {
    try {
      await api.put(`/patients/${patientId}/assign-doctor`, {
        doctorId,
      });

      await load();
    } catch (err) {
      console.error('Failed to assign doctor:', err);
    }
  };

  const deletePatient = async (patient) => {
    if (!(await confirm(`Delete ${patient.name}? This cannot be undone.`))) {
      return;
    }

    try {
      await api.delete(`/patients/${patient.id}`);

      if (selectedPatientId === patient.id) {
        setSelectedPatientId(null);
      }

      await load();
    } catch (err) {
      console.error('Failed to delete patient:', err);
    }
  };

  // Reception staff update contact and registration details (not clinical notes)
  const saveDetails = async (data) => {
    setError('');
    setMessage('');
    try {
      await api.put(`/patients/${editing.id}/medical-profile`, data);
      setEditing(null);
      setMessage('Patient details updated.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the patient.');
    }
  };

  if (selectedPatientId && !isReception) {
    return (
      <MedicalRecord
        patientId={selectedPatientId}
        canEdit={false}
        onBack={() => setSelectedPatientId(null)}
      />
    );
  }

  return (
    <div>
      <div className="page-head">
        <h1>Patients</h1>
        <p>
          {isReception
            ? 'Look up any patient, update contact and registration details, and route them to a doctor. Clinical notes are visible to doctors only.'
            : "View and manage patient records. Medical history is read-only for administrators and can only be updated by the patient's assigned doctor."}
        </p>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}

      {isReception && editing && (
        <section className="panel">
          <div className="list-head">
            <h2 className="panel-title">Patient details: {editing.name}</h2>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(null)}>
              Close
            </button>
          </div>
          <PatientDetailsForm patient={editing} onSave={saveDetails} onCancel={() => setEditing(null)} />
        </section>
      )}

      <div className="list-head">
        <h2>All patients</h2>
        <span className="count">{filtered.length} patients</span>
      </div>

      <SearchFilter
        data={patients}
        fields={['name', 'diagnosis', 'gender', 'bloodGroup', 'phoneNumber']}
        onFiltered={setFiltered}
        placeholder="Search by name, phone, diagnosis, gender or blood group..."
      />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Age</th>
              <th>Gender</th>
              {isReception ? <th>Phone</th> : <th>Blood</th>}
              {!isReception && <th>Diagnosis</th>}
              <th>Doctor</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td className="empty" colSpan="7">
                  No patients match your search.
                </td>
              </tr>
            )}

            {filtered.map((patient) => (
              <tr key={patient.id}>
                <td>{patient.name}</td>
                <td>{patient.age}</td>
                <td>{patient.gender}</td>

                {isReception ? (
                  <td>{patient.phoneNumber || <span className="muted">Not given</span>}</td>
                ) : (
                  <td>
                    {patient.bloodGroup || '—'} {patient.rhFactor || ''}
                  </td>
                )}

                {!isReception && (
                  <td>{patient.diagnosis || <span className="muted">None recorded</span>}</td>
                )}

                <td>
                  <select
                    className="cell-select"
                    value={patient.doctorId || ''}
                    onChange={(event) => assignDoctor(patient.id, event.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                </td>

                <td>
                  <div className="row-actions">
                    {isReception ? (
                      <button
                        type="button"
                        className="btn btn-quiet btn-sm"
                        onClick={() => {
                          setMessage('');
                          setError('');
                          setEditing(patient);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        Details
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-quiet btn-sm"
                          onClick={() => setSelectedPatientId(patient.id)}
                        >
                          Medical Record
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => deletePatient(patient)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Patients;