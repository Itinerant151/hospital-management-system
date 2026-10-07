import { useEffect, useMemo, useState } from 'react';
import api from './api';
import SearchFilter from './SearchFilter';
import { formatDateTime } from './format';
import { formatNaira } from './currency';
import { dayKeyOf } from './visiting';

function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function FrontDesk() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [visiting, setVisiting] = useState([]);
  const [visits, setVisits] = useState([]);
  const [bills, setBills] = useState([]);
  const [log, setLog] = useState([]);

  const [type, setType] = useState('PATIENT');
  const [personId, setPersonId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [view, setView] = useState('in'); // 'in' = currently in the building, 'all' = full log
  const [filteredLog, setFilteredLog] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [apptRes, patientRes, doctorRes, visitingRes, visitRes, billRes, logRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/patients'),
        api.get('/doctors'),
        api.get('/api/visiting-doctors'),
        api.get('/api/visitation'),
        api.get('/api/bills'),
        api.get('/api/frontdesk'),
      ]);
      setAppointments(apptRes.data);
      setPatients(patientRes.data);
      setDoctors(doctorRes.data);
      setVisiting(visitingRes.data);
      setVisits(visitRes.data);
      setBills(billRes.data);
      setLog(logRes.data);
    } catch (err) {
      setError('Could not load the front desk. Check that the backend is running and try again.');
    }
  };

  // Runs an action, shows a message, then refreshes everything
  const act = async (action, successMessage) => {
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(successMessage);
      await loadAll();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'That did not work. Please try again.');
      return false;
    }
  };

  const patientName = (id) => patients.find((p) => p.id === id)?.name || 'Unknown';
  const doctorName = (id) => doctors.find((d) => d.id === id)?.name || 'Unknown';
  const visitingFor = (doctorId) => visiting.find((v) => v.doctorId === doctorId);

  const today = todayKey();

  const todaysAppointments = useMemo(
    () =>
      appointments
        .filter((a) => (a.appointmentDate || '').startsWith(today) && a.status !== 'Cancelled')
        .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate)),
    [appointments, today]
  );

  // Visiting doctors who are due in today
  const visitingToday = useMemo(() => {
    const day = dayKeyOf(today);
    return visiting
      .filter((v) => v.active)
      .map((v) => ({ ...v, window: (v.schedule || []).find((s) => s.day === day) }))
      .filter((v) => v.window);
  }, [visiting, today]);

  const visibleLog = useMemo(
    () =>
      (view === 'in' ? log.filter((entry) => entry.status === 'Checked In') : log).map((entry) => ({
        ...entry,
        typeLabel: entry.type === 'PATIENT' ? 'Patient' : 'Staff',
      })),
    [log, view]
  );

  const patientsIn = log.filter((e) => e.type === 'PATIENT' && e.status === 'Checked In').length;
  const staffIn = log.filter((e) => e.type === 'STAFF' && e.status === 'Checked In').length;
  const visitorsIn = visits.filter((v) => v.status === 'Checked In').length;
  const unpaidBills = bills.filter((b) => b.status !== 'PAID').length;

  // The open check-in record of a visiting doctor, if they are in the building
  const entryForDoctor = (doctorId) =>
    log.find((e) => e.type === 'STAFF' && e.status === 'Checked In' && e.personId === doctorId);

  const checkInFromAppointment = (appt) => {
    const v = visitingFor(appt.doctorId);
    return act(
      () =>
        api.post('/api/frontdesk/check-in', {
          type: 'PATIENT',
          personId: appt.patientId,
          appointmentId: appt.id,
          purpose: `Appointment with ${doctorName(appt.doctorId)}`,
        }),
      `${patientName(appt.patientId)} checked in.` +
        (v ? ` A consultation fee bill of ${formatNaira(v.consultationFee)} was created.` : '')
    );
  };

  const checkInVisitingDoctor = (v) =>
    act(
      () =>
        api.post('/api/frontdesk/check-in', {
          type: 'STAFF',
          personId: v.doctorId,
          personName: v.name,
          purpose: `Visiting clinic ${v.window.startTime}-${v.window.endTime}`,
        }),
      `${v.name} checked in.`
    );

  const checkOut = (entry) =>
    act(() => api.put(`/api/frontdesk/${entry.id}/check-out`), `${entry.personName} checked out.`);

  const submitManualCheckIn = (e) => {
    e.preventDefault();
    const body = { type, purpose };
    if (type === 'PATIENT') {
      body.personId = personId;
    } else {
      const match = doctors.find((d) => (d.name || '').toLowerCase() === staffName.trim().toLowerCase());
      body.personName = staffName;
      if (match) body.personId = match.id;
    }
    act(() => api.post('/api/frontdesk/check-in', body), 'Checked in.').then((ok) => {
      if (ok) {
        setPersonId('');
        setStaffName('');
        setPurpose('');
      }
    });
  };

  const entryForAppointment = (appt) => log.find((entry) => entry.appointmentId === appt.id);

  return (
    <div>
      <div className="page-head">
        <h1>Front desk</h1>
        <p>Today at a glance: arrivals, who is in the building, and what needs attention.</p>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}

      <div className="stat-grid">
        <div className="stat-card"><span className="stat-value">{todaysAppointments.length}</span><span className="stat-label">Appointments today</span></div>
        <div className="stat-card"><span className="stat-value">{patientsIn}</span><span className="stat-label">Patients checked in</span></div>
        <div className="stat-card"><span className="stat-value">{visitorsIn}</span><span className="stat-label">Visitors in building</span></div>
        <div className="stat-card"><span className="stat-value">{staffIn}</span><span className="stat-label">Staff checked in</span></div>
        <div className="stat-card"><span className="stat-value">{unpaidBills}</span><span className="stat-label">Unpaid bills</span></div>
      </div>

      <div className="list-head">
        <h2>Visiting doctors today</h2>
        <span className="count">{visitingToday.length} {visitingToday.length === 1 ? 'doctor' : 'doctors'}</span>
      </div>
      <div className="table-wrap" style={{ marginBottom: '28px' }}>
        <table>
          <thead>
            <tr><th>Doctor</th><th>Hours today</th><th>Fee</th><th>Arrival</th></tr>
          </thead>
          <tbody>
            {visitingToday.length === 0 && (
              <tr><td className="empty" colSpan="4">No visiting doctors are due in today.</td></tr>
            )}
            {visitingToday.map((v) => {
              const entry = entryForDoctor(v.doctorId);
              return (
                <tr key={v.id}>
                  <td>{v.name}<br /><span className="muted">{v.specialization}</span></td>
                  <td>{v.window.startTime} to {v.window.endTime}</td>
                  <td>{formatNaira(v.consultationFee)}</td>
                  <td>
                    {!entry && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => checkInVisitingDoctor(v)}>
                        Check in
                      </button>
                    )}
                    {entry && (
                      <div className="row-actions">
                        <span className="pill pill-in">Checked in</span>
                        <button type="button" className="btn btn-quiet btn-sm" onClick={() => checkOut(entry)}>
                          Check out
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="list-head">
        <h2>Today's appointments</h2>
        <span className="count">{todaysAppointments.length} {todaysAppointments.length === 1 ? 'appointment' : 'appointments'}</span>
      </div>
      <div className="table-wrap" style={{ marginBottom: '28px' }}>
        <table>
          <thead>
            <tr><th>Time</th><th>Patient</th><th>Doctor</th><th>Reason</th><th>Arrival</th></tr>
          </thead>
          <tbody>
            {todaysAppointments.length === 0 && (
              <tr><td className="empty" colSpan="5">No appointments today.</td></tr>
            )}
            {todaysAppointments.map((appt) => {
              const entry = entryForAppointment(appt);
              const v = visitingFor(appt.doctorId);
              return (
                <tr key={appt.id}>
                  <td>{(appt.appointmentDate || '').substring(11, 16)}</td>
                  <td>{patientName(appt.patientId)}</td>
                  <td>
                    {doctorName(appt.doctorId)}
                    {v && (
                      <>
                        <br />
                        <span className="muted">
                          Visiting, fee {formatNaira(v.consultationFee)}
                          {!entryForDoctor(appt.doctorId) ? ', not checked in yet' : ''}
                        </span>
                      </>
                    )}
                  </td>
                  <td>{appt.reason}</td>
                  <td>
                    {!entry && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => checkInFromAppointment(appt)}>
                        Check in
                      </button>
                    )}
                    {entry && entry.status === 'Checked In' && (
                      <div className="row-actions">
                        <span className="pill pill-in">Checked in</span>
                        <button type="button" className="btn btn-quiet btn-sm" onClick={() => checkOut(entry)}>
                          Check out
                        </button>
                      </div>
                    )}
                    {entry && entry.status === 'Checked Out' && <span className="pill pill-out">Checked out</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="panel">
        <h2 className="panel-title">Check someone in</h2>
        <p className="muted" style={{ marginTop: '-8px' }}>
          For walk-ins and staff arriving for a shift. Visitors are handled under Visitation.
        </p>
        <form className="form-grid" onSubmit={submitManualCheckIn}>
          <label className="field">
            <span>Who is arriving</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="PATIENT">A patient</option>
              <option value="STAFF">A staff member</option>
            </select>
          </label>

          {type === 'PATIENT' ? (
            <label className="field">
              <span>Patient</span>
              <select value={personId} onChange={(e) => setPersonId(e.target.value)} required>
                <option value="">Select a patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>{patient.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="field">
              <span>Staff name</span>
              <input
                type="text"
                list="staff-names"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                required
              />
              <datalist id="staff-names">
                {doctors.map((doctor) => <option key={doctor.id} value={doctor.name} />)}
              </datalist>
            </label>
          )}

          <label className="field">
            <span>{type === 'PATIENT' ? 'Reason for visit' : 'Shift or department'}</span>
            <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </label>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Check in</button>
          </div>
        </form>
      </section>

      <div className="list-head">
        <h2>Check-in log</h2>
        <div className="row-actions">
          <button type="button" className={`btn btn-sm ${view === 'in' ? 'btn-primary' : 'btn-quiet'}`} onClick={() => setView('in')}>
            In the building
          </button>
          <button type="button" className={`btn btn-sm ${view === 'all' ? 'btn-primary' : 'btn-quiet'}`} onClick={() => setView('all')}>
            Full log
          </button>
        </div>
      </div>
      <SearchFilter
        data={visibleLog}
        fields={['personName', 'purpose', 'typeLabel', 'status']}
        onFiltered={setFilteredLog}
        placeholder="Search the log by name, reason or type..."
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Type</th><th>Name</th><th>Reason</th><th>Checked in</th><th>Checked out</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {filteredLog.length === 0 && (
              <tr><td className="empty" colSpan="7">{view === 'in' ? 'Nobody is checked in right now.' : 'No check-ins yet.'}</td></tr>
            )}
            {filteredLog.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.typeLabel}</td>
                <td>{entry.personName}</td>
                <td>{entry.purpose || <span className="muted">Not given</span>}</td>
                <td>{formatDateTime(entry.checkInTime)}</td>
                <td>{entry.checkOutTime ? formatDateTime(entry.checkOutTime) : <span className="muted">Still in</span>}</td>
                <td>
                  <span className={`pill ${entry.status === 'Checked In' ? 'pill-in' : 'pill-out'}`}>{entry.status}</span>
                </td>
                <td>
                  {entry.status === 'Checked In' && (
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => checkOut(entry)}>
                      Check out
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

export default FrontDesk;