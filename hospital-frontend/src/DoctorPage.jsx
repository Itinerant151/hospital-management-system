import { useEffect, useState } from 'react';
import api from './api';
import AppShell from './AppShell';
import Notifications from './Notifications';
import AccountSettings from './AccountSettings';
import EmergencyPatients from './EmergencyPatients';
import PatientDetailsForm from './PatientDetailsForm';
import DiagnosisPanel from './DiagnosisPanel';
import DoctorPrescriptions from './DoctorPrescriptions';
import PatientTimeline from './PatientTimeline';
import Overlay from './Overlay';

const NAV = [
  { key: 'patients', label: 'My patients' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'emergency', label: 'Emergency Patients' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'account', label: 'My account' },
];

function DoctorPage({ onLogout }) {
  const [activeTab, setActiveTab] = useState('patients');
  const [patients, setPatients] = useState([]);
  const [editing, setEditing] = useState(null);
  const [diagnosing, setDiagnosing] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);
  const [prescribeFor, setPrescribeFor] = useState('');
  const [message, setMessage] = useState('');

  const ownDoctorId = localStorage.getItem('doctorId');

  const loadPatients = async () => {
    if (!ownDoctorId) return;
    const response = await api.get(`/patients/by-doctor/${ownDoctorId}`);
    setPatients(response.data);
  };

  useEffect(() => { loadPatients(); }, []);

  const saveRecord = async (data) => {
    await api.put(`/patients/${editing.id}/medical-profile`, data);
    setEditing(null);
    setMessage('Patient medical record updated. The patient portal now reflects the changes.');
    loadPatients();
  };

  const openDiagnosis = (patient) => {
    setMessage('');
    setEditing(null);
    setDiagnosing(patient);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <AppShell roleLabel="Doctor" nav={NAV} active={activeTab} onNavigate={setActiveTab} onLogout={onLogout}>
      {activeTab === 'notifications' ? <Notifications /> : activeTab === 'account' ? <AccountSettings /> : activeTab === 'emergency' ? <EmergencyPatients /> : activeTab === 'prescriptions' ? <DoctorPrescriptions presetPatientId={prescribeFor} /> : (
        <div>
          <div className="page-head"><h1>My patients</h1><p>View and update the complete medical information of patients assigned to you.</p></div>
          {message && <p className="alert alert-success">{message}</p>}

          {diagnosing && (
            <DiagnosisPanel patient={diagnosing} onClose={() => setDiagnosing(null)} onSaved={diagnosisSaved} />
          )}

          {editing && (
            <section className="panel">
              <div className="list-head"><h2 className="panel-title">Medical record</h2><button className="btn btn-quiet btn-sm" onClick={() => setEditing(null)}>Close</button></div>
              <PatientDetailsForm patient={editing} onSave={saveRecord} onCancel={() => setEditing(null)} showStaffFields />
            </section>
          )}

          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Age</th><th>Blood</th><th>Allergies</th><th>Diagnosis</th><th>Actions</th></tr></thead>
              <tbody>
                {patients.length === 0 && <tr><td className="empty" colSpan="6">No patients are assigned to you yet.</td></tr>}
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>{patient.name}</td><td>{patient.age}</td><td>{patient.bloodGroup || '—'} {patient.rhFactor || ''}</td>
                    <td>{patient.allergies || 'None recorded'}</td><td>{patient.diagnosis || 'None recorded'}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => { setDiagnosing(null); setEditing(patient); }}>Medical record</button>
                        <button className="btn btn-quiet btn-sm" onClick={() => openDiagnosis(patient)}>Diagnosis</button>
                        <button className="btn btn-quiet btn-sm" onClick={() => prescribe(patient)}>Prescribe</button>
                        <button className="btn btn-quiet btn-sm" onClick={() => setHistoryFor(patient)}>History</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {historyFor && (
            <Overlay title={`Medical history: ${historyFor.name}`} onClose={() => setHistoryFor(null)} wide>
              <PatientTimeline patientId={historyFor.id} />
            </Overlay>
          )}
        </div>
      )}
    </AppShell>
  );
}

export default DoctorPage;