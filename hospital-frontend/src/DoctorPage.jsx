import { useEffect, useState } from 'react';
import api from './api';
import AppShell from './AppShell';
import RoleDashboard from './RoleDashboard';
import Notifications from './Notifications';
import AccountSettings from './AccountSettings';
import EmergencyPatients from './EmergencyPatients';
import PatientDetailsForm from './PatientDetailsForm';
import DiagnosisPanel from './DiagnosisPanel';
import DoctorPrescriptions from './DoctorPrescriptions';
import PatientTimeline from './PatientTimeline';
import MyVisiting from './MyVisiting';
import Wards from './Wards';
import LaboratoryTests from './LaboratoryTests';
import DoctorLaboratoryOrders from './DoctorLaboratoryOrders';
import DoctorLaboratoryResults from './DoctorLaboratoryResults';
import Overlay from './Overlay';

const BASE_NAV = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'patients', label: 'My patients' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'emergency', label: 'Emergency Patients' },
  { key: 'wards', label: 'Wards and beds' },
  { key: 'laboratory', label: 'Laboratory tests' },
  { key: 'lab-orders', label: 'Laboratory orders' },
  {
    key: 'lab-results',
    label: 'Completed lab results',
  },
  { key: 'notifications', label: 'Notifications' },
  { key: 'account', label: 'My account' },
];

const VISITING_ITEM = {
  key: 'visiting',
  label: 'Visiting & earnings',
};

function DoctorPage({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [patients, setPatients] = useState([]);
  const [editing, setEditing] = useState(null);
  const [diagnosing, setDiagnosing] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);
  const [prescribeFor, setPrescribeFor] = useState('');
  const [labOrderFor, setLabOrderFor] = useState('');
  const [labResultsFor, setLabResultsFor] = useState('');
  const [message, setMessage] = useState('');
  const [isVisiting, setIsVisiting] = useState(false);
  const [temporary, setTemporary] = useState(false);

  const ownDoctorId = localStorage.getItem('doctorId');

  const loadPatients = async () => {
    if (!ownDoctorId) {
      return;
    }

    const response = await api.get(
      `/patients/by-doctor/${ownDoctorId}`
    );

    setPatients(response.data);
  };

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    api
      .get('/api/visiting-doctors/mine')
      .then((response) =>
        setIsVisiting(Boolean(response.data.visiting))
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    api
      .get('/account/me')
      .then((response) => {
        if (response.data.temporaryPassword) {
          setTemporary(true);
          setActiveTab('account');
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const clearPatientLabFilter = () => {
      setLabResultsFor('');
    };

    window.addEventListener(
      'medicore-clear-lab-patient-filter',
      clearPatientLabFilter
    );

    return () => {
      window.removeEventListener(
        'medicore-clear-lab-patient-filter',
        clearPatientLabFilter
      );
    };
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

  const openDiagnosis = (patient) => {
    setMessage('');
    setEditing(null);
    setDiagnosing(patient);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const diagnosisSaved = (text) => {
    setDiagnosing(null);
    setMessage(text);
    loadPatients();
  };

  const prescribe = (patient) => {
    setPrescribeFor(patient.id);
    setActiveTab('prescriptions');
  };

  const orderLaboratoryTests = (patient) => {
    setLabOrderFor(patient.id);
    setActiveTab('lab-orders');
  };

  const viewLaboratoryResults = (patient) => {
    setLabResultsFor(patient.id);
    setActiveTab('lab-results');
  };

  const nav = isVisiting
    ? [
        ...BASE_NAV.slice(0, 5),
        VISITING_ITEM,
        ...BASE_NAV.slice(5),
      ]
    : BASE_NAV;

  return (
    <AppShell
      roleLabel="Doctor"
      nav={nav}
      active={activeTab}
      onNavigate={setActiveTab}
      onLogout={onLogout}
    >
      {temporary && (
        <div className="temp-banner" role="alert">
          <span>
            You are using a temporary password. Change it now
            to keep your account safe.
          </span>

          {activeTab !== 'account' && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() =>
                setActiveTab('account')
              }
            >
              Change password
            </button>
          )}
        </div>
      )}

      {activeTab === 'dashboard' && (
        <RoleDashboard />
      )}

      {activeTab === 'notifications' && (
        <Notifications />
      )}

      {activeTab === 'account' && (
        <AccountSettings
          onPasswordChanged={() =>
            setTemporary(false)
          }
        />
      )}

      {activeTab === 'emergency' && (
        <EmergencyPatients />
      )}

      {activeTab === 'prescriptions' && (
        <DoctorPrescriptions
          presetPatientId={prescribeFor}
        />
      )}

      {activeTab === 'wards' && <Wards />}

      {activeTab === 'laboratory' && (
        <LaboratoryTests />
      )}

      {activeTab === 'lab-orders' && (
        <DoctorLaboratoryOrders
          presetPatientId={labOrderFor}
        />
      )}

      {activeTab === 'lab-results' && (
        <DoctorLaboratoryResults
          presetPatientId={labResultsFor}
        />
      )}

      {activeTab === 'visiting' && (
        <MyVisiting />
      )}

      {activeTab === 'patients' && (
        <div>
          <div className="page-head">
            <h1>My patients</h1>

            <p>
              View and update the complete medical information
              of patients assigned to you.
            </p>
          </div>

          {message && (
            <p className="alert alert-success">
              {message}
            </p>
          )}

          {diagnosing && (
            <DiagnosisPanel
              patient={diagnosing}
              onClose={() =>
                setDiagnosing(null)
              }
              onSaved={diagnosisSaved}
            />
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
                      No patients are assigned to you yet.
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
                      {patient.diagnosis ||
                        'None recorded'}
                    </td>

                    <td>
                      <div className="row-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setDiagnosing(null);
                            setEditing(patient);
                          }}
                        >
                          Medical record
                        </button>

                        <button
                          className="btn btn-quiet btn-sm"
                          onClick={() =>
                            openDiagnosis(patient)
                          }
                        >
                          Diagnosis
                        </button>

                        <button
                          className="btn btn-quiet btn-sm"
                          onClick={() =>
                            prescribe(patient)
                          }
                        >
                          Prescribe
                        </button>

                        <button
                          className="btn btn-quiet btn-sm"
                          onClick={() =>
                            orderLaboratoryTests(
                              patient
                            )
                          }
                        >
                          Lab tests
                        </button>

                        <button
                          className="btn btn-quiet btn-sm"
                          onClick={() =>
                            viewLaboratoryResults(
                              patient
                            )
                          }
                        >
                          Lab results
                        </button>

                        <button
                          className="btn btn-quiet btn-sm"
                          onClick={() =>
                            setHistoryFor(patient)
                          }
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {historyFor && (
            <Overlay
              title={`Medical history: ${historyFor.name}`}
              onClose={() =>
                setHistoryFor(null)
              }
              wide
            >
              <PatientTimeline
                patientId={historyFor.id}
              />
            </Overlay>
          )}
        </div>
      )}
    </AppShell>
  );
}

export default DoctorPage;