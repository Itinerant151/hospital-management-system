import { useEffect, useState } from 'react';
import api from './api';
import PatientDetailsForm from './PatientDetailsForm';
import PasswordField from './PasswordField';
import { formatNaira } from './currency';

const EMPTY_ACCOUNT = { username: '', email: '', password: '' };

function EmergencyPatients() {
  const role = localStorage.getItem('role');
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [bills, setBills] = useState([]);
  const [visits, setVisits] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  // Account offer: step is 'closed', 'ask' (Yes / Not now) or 'form' (username, email, password)
  const [accountInfo, setAccountInfo] = useState(null);
  const [accountTarget, setAccountTarget] = useState(null);
  const [accountStep, setAccountStep] = useState('closed');
  const [accountForm, setAccountForm] = useState(EMPTY_ACCOUNT);
  const [accountError, setAccountError] = useState('');

  useEffect(() => { loadPatients(); }, []);

  const loadPatients = async () => {
    const response = await api.get('/patients/emergency');
    setPatients(response.data);
  };

  const openRecord = async (patient) => {
    setSelected(patient);
    setShowForm(false);
    setMessage('');
    setAccountStep('closed');
    setAccountError('');
    setAccountInfo(null);
    const [billResponse, visitResponse, accountResponse] = await Promise.all([
      api.get(`/api/bills/patient/${patient.id}`),
      api.get('/api/visitation'),
      api.get(`/patients/${patient.id}/account`),
    ]);
    setBills(billResponse.data);
    setVisits(visitResponse.data.filter((visit) => visit.patientId === patient.id));
    setAccountInfo(accountResponse.data);
  };

  const saveRecord = async (data) => {
    await api.put(`/patients/${selected.id}/medical-profile`, data);
    setMessage('Emergency patient record updated. The changes are now shared with authorized staff.');
    setShowForm(false);
    await loadPatients();
    const refreshed = (await api.get(`/patients/${selected.id}`)).data;
    setSelected(refreshed);
  };

  const createRecord = async (data) => {
    const response = await api.post('/patients/emergency', data);
    const created = response.data;
    setShowForm(false);
    await loadPatients();
    openRecord(created);
    setMessage(`Emergency patient created with hospital ID ${created.id}.`);
    // Ask whether this patient should also get a login account
    setAccountTarget(created);
    setAccountForm({ ...EMPTY_ACCOUNT, email: created.email || '' });
    setAccountStep('ask');
  };

  const startAccountForm = () => {
    setAccountTarget(selected);
    setAccountForm({ ...EMPTY_ACCOUNT, email: selected?.email || '' });
    setAccountError('');
    setAccountStep('form');
  };

  const submitAccount = async (e) => {
    e.preventDefault();
    setAccountError('');
    try {
      await api.post(`/patients/${accountTarget.id}/account`, accountForm);
      setAccountInfo({ hasAccount: true, username: accountForm.username });
      setMessage(
        `Account created for ${accountTarget.name}. Username: ${accountForm.username}. Give the patient the temporary password you set.`
      );
      setAccountStep('closed');
      setAccountForm(EMPTY_ACCOUNT);
      await loadPatients();
      const refreshed = (await api.get(`/patients/${accountTarget.id}`)).data;
      setSelected(refreshed);
    } catch (err) {
      setAccountError(err.response?.data?.message || 'Could not create the account.');
    }
  };

  const markPaid = async (id) => {
    await api.post(`/api/bills/${id}/pay`);
    openRecord(selected);
  };

  return (
    <div>
      <div className="page-head">
        <h1>Emergency Patients</h1>
        <p>Patients without hospital accounts can still have a complete medical record, billing history and visitation record.</p>
      </div>

      {(role === 'ADMIN' || role === 'DOCTOR' || role === 'RECEPTIONIST') && (
        <section className="panel">
          <div className="list-head">
            <h2>Emergency intake</h2>
            <button className="btn btn-primary" type="button" onClick={() => { setSelected(null); setAccountStep('closed'); setShowForm(true); }}>
              + Register emergency patient
            </button>
          </div>
          {showForm && !selected && <PatientDetailsForm onSave={createRecord} onCancel={() => setShowForm(false)} showStaffFields />}
        </section>
      )}

      {message && <p className="alert alert-success">{message}</p>}

      {accountStep !== 'closed' && accountTarget && (
        <section className="panel prompt-card" aria-label="Create patient account">
          <h2 className="panel-title">Give {accountTarget.name} an account?</h2>
          {accountStep === 'ask' ? (
            <>
              <p className="muted">
                With an account, the patient can log in to see their profile, appointments, bills and visit requests.
                You can also do this later from the patient's record.
              </p>
              <div className="row-actions">
                <button type="button" className="btn btn-primary" onClick={() => setAccountStep('form')}>
                  Yes, create an account
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => setAccountStep('closed')}>
                  Not now
                </button>
              </div>
            </>
          ) : (
            <form className="form-grid" onSubmit={submitAccount} noValidate>
              <label className="field">
                <span>Username</span>
                <input
                  type="text"
                  autoComplete="off"
                  value={accountForm.username}
                  onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                />
                <small className="field-hint">3 to 30 letters, numbers, dots, dashes or underscores.</small>
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  autoComplete="off"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                />
                <small className="field-hint">Becomes the patient's account email.</small>
              </label>
              <PasswordField
                label="Temporary password"
                value={accountForm.password}
                onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                autoComplete="new-password"
                hint="At least 8 characters. Give it to the patient."
              />
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Create account</button>
                <button type="button" className="btn btn-quiet" onClick={() => setAccountStep('closed')}>Cancel</button>
              </div>
            </form>
          )}
          {accountError && (
            <p className="alert alert-error" role="alert" style={{ marginTop: '16px', marginBottom: 0 }}>
              {accountError}
            </p>
          )}
        </section>
      )}

      <div className="list-head"><h2>Emergency records</h2><span className="count">{patients.length} patient{patients.length === 1 ? '' : 's'}</span></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Hospital ID</th><th>Name</th><th>Age</th><th>Blood group</th><th>Diagnosis</th><th>Actions</th></tr></thead>
          <tbody>
            {patients.length === 0 && <tr><td className="empty" colSpan="6">No emergency patients registered yet.</td></tr>}
            {patients.map((patient) => (
              <tr key={patient.id}>
                <td>{patient.id}</td><td>{patient.name}</td><td>{patient.age}</td>
                <td>{patient.bloodGroup || '—'} {patient.rhFactor || ''}</td>
                <td>{patient.diagnosis || 'Not recorded'}</td>
                <td><button className="btn btn-quiet btn-sm" type="button" onClick={() => openRecord(patient)}>View record</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <section className="panel" style={{ marginTop: '24px' }}>
          <div className="list-head">
            <div>
              <h2>{selected.name}</h2>
              <p className="muted">
                Hospital ID: {selected.id} ·{' '}
                {accountInfo?.hasAccount ? `Has an account (${accountInfo.username})` : 'Emergency / no account'}
              </p>
            </div>
            <div className="row-actions">
              {accountInfo && !accountInfo.hasAccount && accountStep === 'closed' && (
                <button className="btn btn-primary btn-sm" type="button" onClick={startAccountForm}>
                  Give this patient an account
                </button>
              )}
              <button className="btn btn-quiet btn-sm" type="button" onClick={() => setShowForm(!showForm)}>{showForm ? 'Close editor' : 'Edit medical record'}</button>
            </div>
          </div>
          {showForm ? <PatientDetailsForm patient={selected} onSave={saveRecord} onCancel={() => setShowForm(false)} showStaffFields /> : (
            <>
              <div className="info-grid">
                <div><span className="label">Medical history</span>{selected.medicalHistory || 'Not recorded'}</div>
                <div><span className="label">Allergies</span>{selected.allergies || 'None recorded'}</div>
                <div><span className="label">Disabilities</span>{selected.disabilities || 'None recorded'}</div>
                <div><span className="label">Emergency contact</span>{selected.emergencyContactName || 'Not recorded'} {selected.emergencyContactPhone || ''}</div>
                <div><span className="label">Insurance</span>{selected.insuranceProvider || 'Not recorded'} {selected.insuranceNumber || ''}</div>
                <div><span className="label">Clinical notes</span>{selected.notes || 'None recorded'}</div>
              </div>

              <div className="list-head" style={{ marginTop: '24px' }}><h3>Payment status</h3></div>
              <div className="table-wrap"><table><thead><tr><th>Bill</th><th>Total</th><th>Status</th><th>Action</th></tr></thead><tbody>
                {bills.length === 0 && <tr><td className="empty" colSpan="4">No bills for this patient.</td></tr>}
                {bills.map((bill) => <tr key={bill.id}><td>{bill.items?.map((item) => item.description).join(', ')}</td><td>{formatNaira(bill.total)}</td><td>{bill.status}</td><td>{bill.status !== 'PAID' && (role === 'ADMIN' || role === 'RECEPTIONIST') && <button className="btn btn-primary btn-sm" onClick={() => markPaid(bill.id)}>Mark as paid</button>}</td></tr>)}
              </tbody></table></div>

              <div className="list-head" style={{ marginTop: '24px' }}><h3>Visitations</h3></div>
              <div className="table-wrap"><table><thead><tr><th>Visitor</th><th>Relation</th><th>Date</th><th>Time</th><th>Status</th></tr></thead><tbody>
                {visits.length === 0 && <tr><td className="empty" colSpan="5">No visitation records.</td></tr>}
                {visits.map((visit) => <tr key={visit.id}><td>{visit.visitorName}</td><td>{visit.relation || '—'}</td><td>{visit.visitDate}</td><td>{visit.timeSlot}</td><td>{visit.status}</td></tr>)}
              </tbody></table></div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default EmergencyPatients;