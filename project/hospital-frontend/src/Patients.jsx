import { useState, useEffect } from 'react';
import api from './api';

function Patients() {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [doctorId, setDoctorId] = useState('');

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
  }, []);

  const fetchPatients = async () => {
    const response = await api.get('/patients');
    setPatients(response.data);
  };

  const fetchDoctors = async () => {
    const response = await api.get('/doctors');
    setDoctors(response.data);
  };

  const addPatient = async (e) => {
    e.preventDefault();
    await api.post('/patients', {
      name,
      age: Number(age),
      gender,
      diagnosis,
      doctorId,
    });
    setName('');
    setAge('');
    setGender('');
    setDiagnosis('');
    setDoctorId('');
    fetchPatients();
  };

  const deletePatient = async (id) => {
    await api.delete(`/patients/${id}`);
    fetchPatients();
  };

  const assignDoctor = async (patientId, newDoctorId) => {
    await api.put(`/patients/${patientId}/assign-doctor`, { doctorId: newDoctorId });
    fetchPatients();
  };

  return (
    <div>
      <h2>Patients</h2>

      <form onSubmit={addPatient}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Age"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Gender"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Diagnosis"
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          required
        />
        <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
          <option value="">Assign a doctor</option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name} ({doctor.specialization})
            </option>
          ))}
        </select>
        <button type="submit">Add Patient</button>
      </form>

      <table border="1" cellPadding="8" style={{ marginTop: '20px' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Age</th>
            <th>Gender</th>
            <th>Diagnosis</th>
            <th>Doctor</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id}>
              <td>{patient.name}</td>
              <td>{patient.age}</td>
              <td>{patient.gender}</td>
              <td>{patient.diagnosis}</td>
              <td>
                <select
                  value={patient.doctorId || ''}
                  onChange={(e) => assignDoctor(patient.id, e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} ({doctor.specialization})
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button onClick={() => deletePatient(patient.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Patients;