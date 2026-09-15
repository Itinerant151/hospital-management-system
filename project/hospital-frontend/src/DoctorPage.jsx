import { useState, useEffect } from 'react';
import api from './api';

function DoctorPage({ onLogout }) {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [patients, setPatients] = useState([]);
  const [editingDiagnosisId, setEditingDiagnosisId] = useState(null);
  const [diagnosisText, setDiagnosisText] = useState('');

  const ownDoctorId = localStorage.getItem('doctorId');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    const response = await api.get('/doctors');
    setDoctors(response.data);
  };

  const viewDoctorPatients = async (doctorId) => {
    setSelectedDoctorId(doctorId);
    setEditingDiagnosisId(null);
    const response = await api.get(`/patients/by-doctor/${doctorId}`);
    setPatients(response.data);
  };

  const startEditDiagnosis = (patient) => {
    setEditingDiagnosisId(patient.id);
    setDiagnosisText(patient.diagnosis || '');
  };

  const saveDiagnosis = async (patientId) => {
    await api.put(`/patients/${patientId}/diagnosis`, { diagnosis: diagnosisText });
    setEditingDiagnosisId(null);
    viewDoctorPatients(selectedDoctorId);
  };

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Hospital Management System — Doctors</h1>
      <p>
        Logged in as: DOCTOR <button onClick={onLogout}>Log Out</button>
      </p>

      <h2>All Doctors</h2>
      <ul>
        {doctors.map((doctor) => (
          <li key={doctor.id}>
            <button onClick={() => viewDoctorPatients(doctor.id)}>
              {doctor.name} ({doctor.specialization})
              {doctor.id === ownDoctorId ? ' — Me' : ''}
            </button>
          </li>
        ))}
      </ul>

      {selectedDoctorId && (
        <div>
          <h2>Patients assigned to {selectedDoctor ? selectedDoctor.name : ''}</h2>
          {patients.length === 0 && <p>No patients assigned.</p>}
          {patients.length > 0 && (
            <table border="1" cellPadding="8">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Diagnosis</th>
                  {selectedDoctorId === ownDoctorId && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>{patient.name}</td>
                    <td>{patient.age}</td>
                    <td>{patient.gender}</td>
                    <td>
                      {editingDiagnosisId === patient.id ? (
                        <input
                          type="text"
                          value={diagnosisText}
                          onChange={(e) => setDiagnosisText(e.target.value)}
                        />
                      ) : (
                        patient.diagnosis || '(none)'
                      )}
                    </td>
                    {selectedDoctorId === ownDoctorId && (
                      <td>
                        {editingDiagnosisId === patient.id ? (
                          <>
                            <button onClick={() => saveDiagnosis(patient.id)}>Save</button>
                            <button onClick={() => setEditingDiagnosisId(null)}>Cancel</button>
                          </>
                        ) : (
                          <button onClick={() => startEditDiagnosis(patient)}>Edit Diagnosis</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default DoctorPage;