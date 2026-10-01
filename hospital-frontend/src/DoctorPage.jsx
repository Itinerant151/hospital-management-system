import { useEffect, useState } from 'react';
import api from './api';
import AppShell from './AppShell';
import PatientDetailsForm from './PatientDetailsForm';
import EmergencyPatients from './EmergencyPatients';
import Notifications from './Notifications';
import AccountSettings from './AccountSettings';

const NAV = [
  { key: 'patients', label: 'My patients' },
  { key: 'emergency', label: 'Emergency Patients' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'account', label: 'My account' },
];

function DoctorPage({ onLogout }) {
  const [activeTab, setActiveTab] =
    useState('patients');

  const [patients, setPatients] = useState([]);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');

  const [diagnosisDrafts, setDiagnosisDrafts] =
    useState({});

  const [savingDiagnosis, setSavingDiagnosis] =
    useState(null);

  const ownDoctorId =
    localStorage.getItem('doctorId');

  const loadPatients = async () => {
    if (!ownDoctorId) return;

    const response = await api.get(
      `/patients/by-doctor/${ownDoctorId}`
    );

    setPatients(response.data);
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const saveRecord = async (data) => {
    await api.put(
      `/patients/${editing.id}/medical-profile`,
      data
    );

    setEditing(null);

    setMessage(
      'Patient medical record updated. The patient portal now reflects the changes.'
    );

    loadPatients();
  };

  const updateDiagnosisDraft = (
    patientId,
    value
  ) => {
    setDiagnosisDrafts((previous) => ({
      ...previous,
      [patientId]: value,
    }));
  };

  const saveDiagnosis = async (patient) => {
    const diagnosis =
      diagnosisDrafts[patient.id] !== undefined
        ? diagnosisDrafts[patient.id]
        : patient.diagnosis || '';

    try {
      setSavingDiagnosis(patient.id);

      await api.put(
        `/patients/${patient.id}/diagnosis`,
        {
          diagnosis,
        }
      );

      setDiagnosisDrafts((previous) => {
        const next = { ...previous };

        delete next[patient.id];

        return next;
      });

      setMessage(
        'Diagnosis updated successfully.'
      );

      await loadPatients();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          'Unable to update the diagnosis.'
      );
    } finally {
      setSavingDiagnosis(null);
    }
  };

  return (
    <AppShell
      roleLabel="Doctor"
      nav={NAV}
      active={activeTab}
      onNavigate={setActiveTab}
      onLogout={onLogout}
    >
      {activeTab === 'notifications' ? (
        <Notifications />
      ) : activeTab === 'account' ? (
        <AccountSettings />
      ) : activeTab === 'emergency' ? (
        <EmergencyPatients />
      ) : (
        <div>
          <div className="page-head">
            <h1>My patients</h1>

            <p>
              View and update the complete medical
              information of patients assigned to you.
            </p>
          </div>

          {message && (
            <p className="alert alert-success">
              {message}
            </p>
          )}

          {editing && (
            <section className="panel">
              <div className="list-head">
                <h2 className="panel-title">
                  Medical record
                </h2>

                <button
                  className="btn btn-quiet btn-sm"
                  onClick={() =>
                    setEditing(null)
                  }
                >
                  Close
                </button>
              </div>

              <PatientDetailsForm
                patient={editing}
                onSave={saveRecord}
                onCancel={() =>
                  setEditing(null)
                }
                showStaffFields
              />
            </section>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Blood</th>
                  <th>Allergies</th>
                  <th>Diagnosis</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {patients.length === 0 && (
                  <tr>
                    <td
                      className="empty"
                      colSpan="6"
                    >
                      No patients are assigned to
                      you yet.
                    </td>
                  </tr>
                )}

                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>{patient.name}</td>

                    <td>{patient.age}</td>

                    <td>
                      {patient.bloodGroup || '—'}{' '}
                      {patient.rhFactor || ''}
                    </td>

                    <td>
                      {patient.allergies ||
                        'None recorded'}
                    </td>

                    <td>
                      <div className="diagnosis-editor">
                        <textarea
                          rows="3"
                          value={
                            diagnosisDrafts[
                              patient.id
                            ] !== undefined
                              ? diagnosisDrafts[
                                  patient.id
                                ]
                              : patient.diagnosis || ''
                          }
                          onChange={(event) =>
                            updateDiagnosisDraft(
                              patient.id,
                              event.target.value
                            )
                          }
                          placeholder="Enter diagnosis"
                        />

                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            saveDiagnosis(patient)
                          }
                          disabled={
                            savingDiagnosis ===
                            patient.id
                          }
                        >
                          {savingDiagnosis ===
                          patient.id
                            ? 'Saving...'
                            : 'Save diagnosis'}
                        </button>
                      </div>
                    </td>

                    <td>
                      <button
                        className="btn btn-quiet btn-sm"
                        onClick={() =>
                          setEditing(patient)
                        }
                      >
                        Medical record
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default DoctorPage;