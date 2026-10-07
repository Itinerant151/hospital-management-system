import { useEffect, useMemo, useState } from 'react';
import api from './api';
import Overlay from './Overlay';
import SearchFilter from './SearchFilter';
import PasswordField from './PasswordField';
import ScheduleEditor from './ScheduleEditor';
import { useConfirm } from './ConfirmDialog';
import { formatNaira } from './currency';
import { describeSchedule, scheduleProblem } from './visiting';

const EMPTY_FORM = {
  name: '',
  specialization: '',
  phoneNumber: '',
  username: '',
  email: '',
  password: '',
  consultationFee: '',
  hospitalSharePercent: '',
};

function VisitingDoctors() {
  const confirm = useConfirm();
  const isAdmin = localStorage.getItem('role') === 'ADMIN';

  const [doctors, setDoctors] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [schedule, setSchedule] = useState([]);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const response = await api.get('/api/visiting-doctors');
    setDoctors(response.data);
  };

  useEffect(() => {
    load().catch(() => setError('Could not load visiting doctors. Check that the backend is running.'));
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const onboard = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const problem = scheduleProblem(schedule);
    if (problem) {
      setError(problem);
      return;
    }

    try {
      const response = await api.post('/api/visiting-doctors/onboard', {
        ...form,
        consultationFee: Number(form.consultationFee),
        hospitalSharePercent: Number(form.hospitalSharePercent),
        schedule,
      });
      setMessage(
        `${response.data.name} is onboarded. They can log in as "${response.data.username}" with the temporary password you set, and will be asked to change it.`
      );
      setForm(EMPTY_FORM);
      setSchedule([]);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not onboard the doctor. Please try again.');
    }
  };

  const togglePaused = async (doctor) => {
    if (doctor.active) {
      const ok = await confirm(
        `Pause bookings for ${doctor.name}? Appointments already booked stay as they are.`,
        { title: 'Pause bookings', confirmLabel: 'Pause bookings', danger: false }
      );
      if (!ok) return;
    }
    setError('');
    try {
      await api.put(`/api/visiting-doctors/${doctor.id}`, { active: !doctor.active });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change this doctor.');
    }
  };

  const rows = useMemo(
    () => doctors.map((d) => ({ ...d, scheduleText: describeSchedule(d.schedule), statusText: d.active ? 'Active' : 'Paused' })),
    [doctors]
  );

  return (
    <div>
      <div className="page-head">
        <h1>Visiting doctors</h1>
        <p>
          {isAdmin
            ? 'Onboard doctors who visit on set days, with a login, a weekly schedule and a consultation fee.'
            : 'Which doctors visit, on which days, and what they charge. Patients can only be booked inside these hours.'}
        </p>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}

      {isAdmin && (
        <section className="panel">
          <h2 className="panel-title">Onboard a visiting doctor</h2>
          <form onSubmit={onboard}>
            <div className="form-grid">
              <label className="field">
                <span>Full name</span>
                <input type="text" value={form.name} onChange={set('name')} required />
              </label>
              <label className="field">
                <span>Specialization</span>
                <input type="text" value={form.specialization} onChange={set('specialization')} required />
              </label>
              <label className="field">
                <span>Phone number</span>
                <input type="text" value={form.phoneNumber} onChange={set('phoneNumber')} required />
              </label>
              <label className="field">
                <span>Username</span>
                <input type="text" value={form.username} onChange={set('username')} autoComplete="off" required />
              </label>
              <label className="field">
                <span>Email</span>
                <input type="email" value={form.email} onChange={set('email')} autoComplete="off" required />
              </label>
              <PasswordField
                label="Temporary password"
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
                hint="At least 8 characters. The doctor must change it at first login."
                required
                minLength={8}
              />
              <label className="field">
                <span>Consultation fee (₦)</span>
                <input type="number" min="1" step="0.01" value={form.consultationFee} onChange={set('consultationFee')} required />
              </label>
              <label className="field">
                <span>Hospital share (%)</span>
                <input type="number" min="0" max="100" step="0.01" value={form.hospitalSharePercent} onChange={set('hospitalSharePercent')} required />
              </label>
            </div>

            <h3 style={{ margin: '22px 0 10px' }}>Weekly visiting schedule</h3>
            <ScheduleEditor value={schedule} onChange={setSchedule} />

            <div className="form-actions" style={{ marginTop: '18px' }}>
              <button type="submit" className="btn btn-primary">Onboard doctor</button>
            </div>
          </form>
        </section>
      )}

      <div className="list-head">
        <h2>Visiting doctors</h2>
        <span className="count">{filtered.length} {filtered.length === 1 ? 'doctor' : 'doctors'}</span>
      </div>
      <SearchFilter
        data={rows}
        fields={['name', 'specialization', 'scheduleText', 'statusText']}
        onFiltered={setFiltered}
        placeholder="Search by name, specialization or day..."
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Doctor</th>
              <th>Visiting schedule</th>
              <th>Fee</th>
              {isAdmin && <th>Hospital share</th>}
              <th>Status</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td className="empty" colSpan={isAdmin ? 6 : 4}>No visiting doctors yet.</td></tr>
            )}
            {filtered.map((doctor) => (
              <tr key={doctor.id}>
                <td>{doctor.name}<br /><span className="muted">{doctor.specialization}</span></td>
                <td>{doctor.scheduleText}</td>
                <td>{formatNaira(doctor.consultationFee)}</td>
                {isAdmin && <td>{doctor.hospitalSharePercent}%</td>}
                <td>
                  <span className={`pill ${doctor.active ? 'pill-in' : 'pill-out'}`}>{doctor.statusText}</span>
                </td>
                {isAdmin && (
                  <td>
                    <div className="row-actions">
                      <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(doctor)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-quiet btn-sm" onClick={() => togglePaused(doctor)}>
                        {doctor.active ? 'Pause bookings' : 'Resume bookings'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditVisiting
          doctor={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setMessage('Visiting details saved.');
            load();
          }}
        />
      )}
    </div>
  );
}

function EditVisiting({ doctor, onClose, onSaved }) {
  const [fee, setFee] = useState(String(doctor.consultationFee));
  const [share, setShare] = useState(String(doctor.hospitalSharePercent ?? 0));
  const [schedule, setSchedule] = useState(doctor.schedule || []);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setError('');
    const problem = scheduleProblem(schedule);
    if (problem) {
      setError(problem);
      return;
    }
    try {
      await api.put(`/api/visiting-doctors/${doctor.id}`, {
        consultationFee: Number(fee),
        hospitalSharePercent: Number(share),
        schedule,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save. Please try again.');
    }
  };

  return (
    <Overlay title={`Edit ${doctor.name}`} onClose={onClose} wide>
      <form onSubmit={save}>
        <div className="form-grid">
          <label className="field">
            <span>Consultation fee (₦)</span>
            <input type="number" min="1" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} required />
          </label>
          <label className="field">
            <span>Hospital share (%)</span>
            <input type="number" min="0" max="100" step="0.01" value={share} onChange={(e) => setShare(e.target.value)} required />
          </label>
        </div>
        <p className="muted">
          A new fee or share only applies to patients checked in from now on. Past consultations keep the rate they were billed at.
        </p>
        <h3 style={{ margin: '18px 0 10px' }}>Weekly visiting schedule</h3>
        <ScheduleEditor value={schedule} onChange={setSchedule} />
        {error && <p className="alert alert-error" role="alert" style={{ marginTop: '14px' }}>{error}</p>}
        <div className="form-actions" style={{ marginTop: '18px' }}>
          <button type="submit" className="btn btn-primary">Save changes</button>
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Overlay>
  );
}

export default VisitingDoctors;