import { useState, useEffect } from 'react';
import api from './api';

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [bookedTimes, setBookedTimes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (doctorId && date) {
      fetchAvailability();
    } else {
      setBookedTimes([]);
    }
  }, [doctorId, date]);

  const fetchAppointments = async () => {
    const response = await api.get('/appointments/mine');
    setAppointments(response.data);
  };

  const fetchDoctors = async () => {
    const response = await api.get('/doctors');
    setDoctors(response.data);
  };

  const fetchAvailability = async () => {
    const response = await api.get('/appointments/availability', {
      params: { doctorId, date },
    });
    setBookedTimes(response.data);
  };

  const bookAppointment = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/appointments', {
        doctorId,
        appointmentDate: `${date}T${time}`,
        reason,
        status: 'Scheduled',
      });
      setDoctorId('');
      setDate('');
      setTime('');
      setReason('');
      fetchAppointments();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not book appointment. That time may already be taken.');
    }
  };

  const cancelAppointment = async (id) => {
    await api.delete(`/appointments/${id}`);
    fetchAppointments();
  };

  const getDoctorName = (id) => {
    const doctor = doctors.find((d) => d.id === id);
    return doctor ? `${doctor.name} (${doctor.specialization})` : 'Unknown';
  };

  return (
    <div>
      <h2>My Appointments</h2>

      <form onSubmit={bookAppointment}>
        <select
          value={doctorId}
          onChange={(e) => { setDoctorId(e.target.value); setTime(''); }}
          required
        >
          <option value="">Select Doctor</option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.name} ({doctor.specialization})
            </option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => { setDate(e.target.value); setTime(''); }}
          required
        />

        <select
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
          disabled={!doctorId || !date}
        >
          <option value="">Select Time</option>
          {TIME_SLOTS.map((slot) => (
            <option key={slot} value={slot} disabled={bookedTimes.includes(slot)}>
              {slot} {bookedTimes.includes(slot) ? '(Booked)' : ''}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />

        <button type="submit">Book Appointment</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <table border="1" cellPadding="8" style={{ marginTop: '20px' }}>
        <thead>
          <tr>
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
              <td>{getDoctorName(appt.doctorId)}</td>
              <td>{appt.appointmentDate}</td>
              <td>{appt.reason}</td>
              <td>{appt.status}</td>
              <td>
                <button onClick={() => cancelAppointment(appt.id)}>Cancel</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MyAppointments;