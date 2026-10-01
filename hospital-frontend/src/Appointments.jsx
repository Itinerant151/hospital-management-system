import { useState, useEffect, useMemo } from 'react';
import api from './api';
import { formatDateTime } from './format';
import SearchFilter from './SearchFilter';
import { useConfirm } from './ConfirmDialog';

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function Appointments() {
  const confirm = useConfirm();
  const role = localStorage.getItem('role');
  // Only reception staff book on behalf of patients. Administrators can view and manage, but not book.
  const canBook = role === 'RECEPTIONIST';
  const isAdmin = role === 'ADMIN';

  const [appointments, setAppointments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [bookedTimes, setBookedTimes] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (canBook && doctorId && date) {
      fetchAvailability();
    } else {
      setBookedTimes([]);
    }
  }, [doctorId, date]);

  const fetchAppointments = async () => {
    const response = await api.get('/appointments');
    setAppointments(response.data);
  };

  const fetchPatients = async () => {
    const response = await api.get('/patients');
    setPatients(response.data);
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

  const addAppointment = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/appointments', {
        patientId,
        doctorId,
        appointmentDate: `${date}T${time}`,
        reason,
        status: 'Scheduled',
      });
      setPatientId('');
      setDoctorId('');
      setDate('');
      setTime('');
      setReason('');
      setMessage('Appointment booked.');
      fetchAppointments();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not book appointment. That time may already be taken.');
    }
  };

  const deleteAppointment = async (id) => {
    if (!(await confirm('Delete this appointment? This cannot be undone.'))) return;
    await api.delete(`/appointments/${id}`);
    fetchAppointments();
  };

  const updateStatus = async (id, newStatus) => {
    await api.put(`/appointments/${id}/status`, { status: newStatus });
    fetchAppointments();
  };

  const cancelAppointment = async (id) => {
    if (!(await confirm('Cancel this appointment? The time slot will become available again.'))) return;
    await updateStatus(id, 'Cancelled');
  };

  const getPatientName = (id) => {
    const patient = patients.find((p) => p.id === id);
    return patient ? patient.name : 'Unknown';
  };

  const getDoctorName = (id) => {
    const doctor = doctors.find((d) => d.id === id);
    return doctor ? doctor.name : 'Unknown';
  };

  // Memoised so the search box does not re-run on every render
  const searchable = useMemo(
    () =>
      appointments.map((a) => ({
        ...a,
        patientName: patients.find((p) => p.id === a.patientId)?.name || 'Unknown',
        doctorName: doctors.find((d) => d.id === a.doctorId)?.name || 'Unknown',
      })),
    [appointments, patients, doctors]
  );

  return (
    <div>
      <div className="page-head">
        <h1>Appointments</h1>
        <p>
          {canBook
            ? 'Book appointments for patients, reschedule by cancelling and rebooking, and track their status.'
            : 'See every appointment and its status. Appointments are booked by patients or by reception staff.'}
        </p>
      </div>

      {canBook && (
        <section className="panel">
          <h2 className="panel-title">Book an appointment</h2>
          <form className="form-grid" onSubmit={addAppointment}>
            <label className="field">
              <span>Patient</span>
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
                <option value="">Select a patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Doctor</span>
              <select
                value={doctorId}
                onChange={(e) => {
                  setDoctorId(e.target.value);
                  setTime('');
                }}
                required
              >
                <option value="">Select a doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} ({doctor.specialization})
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Date</span>
              <input
                type="date"
                min={todayString()}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setTime('');
                }}
                required
              />
            </label>

            <label className="field">
              <span>Time</span>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                disabled={!doctorId || !date}
              >
                <option value="">{doctorId && date ? 'Select a time' : 'Pick a doctor and date first'}</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot} disabled={bookedTimes.includes(slot)}>
                    {slot} {bookedTimes.includes(slot) ? '(Booked)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Reason for visit</span>
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} required />
            </label>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Book appointment
              </button>
            </div>
          </form>
          {error && (
            <p className="alert alert-error" role="alert" style={{ marginTop: '16px', marginBottom: 0 }}>
              {error}
            </p>
          )}
          {message && (
            <p className="alert alert-success" style={{ marginTop: '16px', marginBottom: 0 }}>
              {message}
            </p>
          )}
        </section>
      )}

      <div className="list-head">
        <h2>All appointments</h2>
        <span className="count">
          {filtered.length} {filtered.length === 1 ? 'appointment' : 'appointments'}
        </span>
      </div>
      <SearchFilter
        data={searchable}
        fields={['patientName', 'doctorName', 'reason', 'status']}
        onFiltered={setFiltered}
        placeholder="Search appointments by patient, doctor, reason or status..."
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Date and time</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td className="empty" colSpan="6">
                  No appointments match your search.
                </td>
              </tr>
            )}
            {filtered.map((appt) => (
              <tr key={appt.id}>
                <td>{getPatientName(appt.patientId)}</td>
                <td>{getDoctorName(appt.doctorId)}</td>
                <td>{formatDateTime(appt.appointmentDate)}</td>
                <td>{appt.reason}</td>
                <td>
                  <select
                    className="status-select"
                    data-status={appt.status}
                    value={appt.status}
                    onChange={(e) => updateStatus(appt.id, e.target.value)}
                    aria-label="Appointment status"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </td>
                <td>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteAppointment(appt.id)}
                    >
                      Delete
                    </button>
                  )}
                  {canBook && appt.status === 'Scheduled' && (
                    <button
                      type="button"
                      className="btn btn-quiet btn-sm"
                      onClick={() => cancelAppointment(appt.id)}
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Appointments;