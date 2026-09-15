import { useState, useEffect } from 'react';
import axios from 'axios';

const APPOINTMENTS_URL = 'http://localhost:8080/appointments';
const PATIENTS_URL = 'http://localhost:8080/patients';
const DOCTORS_URL = 'http://localhost:8080/doctors';

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('Scheduled');

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchDoctors();
  }, []);

  const fetchAppointments = async () => {
    const response = await axios.get(APPOINTMENTS_URL);
    setAppointments(response.data);
  };

  const fetchPatients = async () => {
    const response = await axios.get(PATIENTS_URL);
    setPatients(response.data);
  };

  const fetchDoctors = async () => {
    const response = await axios.get(DOCTORS_URL);
    setDoctors(response.data);
  };

  const addAppointment = async (e) => {
    e.preventDefault();
    await axios.post(APPOINTMENTS_URL, {
      patientId,
      doctorId,
      appointmentDate,
      reason,
      status,
    });
    setPatientId('');
    setDoctorId('');
    setAppointmentDate('');
    setReason('');
    setStatus('Scheduled');
    fetchAppointments();
  };

  const deleteAppointment = async (id) => {
    await axios.delete(`${APPOINTMENTS_URL}/${id}`);
    fetchAppointments();
  };

  const getPatientName = (id) => {
    const patient = patients.find((p) => p.id === id);
    return patient ? patient.name : 'Unknown';
  };

  const getDoctorName = (id) => {
    const doctor = doctors.find((d) => d.id === id);
    return doctor ? doctor.name : 'Unknown';
  };

  return (
    <div>
      <h2>Appointments</h2>

      <form onSubmit={addAppointment}>
        <select value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
          <option value="">Select Patient</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.name}
            </option>
          ))}
        </select>

        <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
          <option value="">Select Doctor</option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name} ({doctor.specialization})
            </option>
          ))}
        </select>

        <input
          type="datetime-local"
          value={appointmentDate}
          onChange={(e) => setAppointmentDate(e.target.value)}
          required
        />

        <input
          type="text"
          placeholder="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="Scheduled">Scheduled</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <button type="submit">Book Appointment</button>
      </form>

      <table border="1" cellPadding="8" style={{ marginTop: '20px' }}>
        <thead>
          <tr>
            <th>Patient</th>
            <th>Doctor</th>
            <th>Date</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appt) => (
            <tr key={appt.id}>
              <td>{getPatientName(appt.patientId)}</td>
              <td>{getDoctorName(appt.doctorId)}</td>
              <td>{appt.appointmentDate}</td>
              <td>{appt.reason}</td>
              <td>{appt.status}</td>
              <td>
                <button onClick={() => deleteAppointment(appt.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Appointments;