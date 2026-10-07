import { useState, useEffect } from 'react';
import api from './api';
import StatusBadge from './StatusBadge';
import { formatDateTime } from './format';
import { formatNaira } from './currency';
import { ALL_SLOTS, allowedTimes, describeSchedule } from './visiting';
import { useConfirm } from './ConfirmDialog';

function MyAppointments() {
  const confirm = useConfirm();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [visitingList, setVisitingList] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [bookedTimes, setBookedTimes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
    fetchVisiting();
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

  const fetchVisiting = async () => {
    const response = await api.get('/api/visiting-doctors');
    setVisitingList(response.data);
  };

  const fetchAvailability = async () => {
    const response = await api.get('/appointments/availability', {
      params: { doctorId, date },
    });
    setBookedTimes(response.data);
  };

  // A visiting doctor only offers the hours in their weekly schedule
  const visiting = visitingList.find((v) => v.doctorId === doctorId);
  const slots = visiting ? allowedTimes(visiting, date) : ALL_SLOTS;
  const noVisitingHours = Boolean(visiting && date && slots.length === 0);

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
    if (!(await confirm('Cancel this appointment?', { title: 'Cancel appointment', confirmLabel: 'Yes, cancel it', cancelLabel: 'Keep it' }))) return;
    await api.delete(`/appointments/${id}`);
    fetchAppointments();
  };

  const getDoctorName = (id) => {
    const doctor = doctors.find((d) => d.id === id);
    return doctor ? `${doctor.name} (${doctor.specialization})` : 'Unknown';
  };

  return (
    <div>
      <div className="page-head">
        <h1>My appointments</h1>
        <p>Book a visit with a doctor and see your upcoming and past appointments.</p>
      </div>

      <section className="panel">
        <h2 className="panel-title">Book an appointment</h2>
        <form className="form-grid" onSubmit={bookAppointment}>
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
              {doctors.map((doctor) => {
                const v = visitingList.find((item) => item.doctorId === doctor.id);
                return (
                  <option key={doctor.id} value={doctor.id} disabled={Boolean(v && !v.active)}>
                    {doctor.name} ({doctor.specialization}){v ? (v.active ? ' - Visiting' : ' - Visiting, not booking now') : ''}
                  </option>
                );
              })}
            </select>
          </label>

          <label className="field">
            <span>Date</span>
            <input
              type="date"
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
              disabled={!doctorId || !date || noVisitingHours}
            >
              <option value="">
                {noVisitingHours
                  ? 'This doctor does not visit on that day'
                  : doctorId && date
                    ? 'Select a time'
                    : 'Pick a doctor and date first'}
              </option>
              {slots.map((slot) => (
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
        {visiting && (
          <p className="muted" style={{ marginTop: '14px', marginBottom: 0 }}>
            This doctor visits on: {describeSchedule(visiting.schedule)}. A consultation fee of{' '}
            {formatNaira(visiting.consultationFee)} is added to your bill when you check in at the front desk.
          </p>
        )}
        {error && (
          <p className="alert alert-error" role="alert" style={{ marginTop: '16px', marginBottom: 0 }}>
            {error}
          </p>
        )}
      </section>

      <div className="list-head">
        <h2>Your appointments</h2>
        <span className="count">
          {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'}
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Doctor</th>
              <th>Date and time</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 && (
              <tr>
                <td className="empty" colSpan="5">
                  You have no appointments yet. Book one using the form above.
                </td>
              </tr>
            )}
            {appointments.map((appt) => (
              <tr key={appt.id}>
                <td>{getDoctorName(appt.doctorId)}</td>
                <td>{formatDateTime(appt.appointmentDate)}</td>
                <td>{appt.reason}</td>
                <td>
                  <StatusBadge status={appt.status} />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => cancelAppointment(appt.id)}
                  >
                    Cancel appointment
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MyAppointments;