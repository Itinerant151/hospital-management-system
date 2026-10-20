import { useEffect, useState } from 'react';
import api from './api';
import Overlay from './Overlay';
import { useConfirm } from './ConfirmDialog';
import { formatDateTime } from './format';

const BODIES = [
  { value: 'MDCN', label: 'MDCN (doctors and dentists)' },
  { value: 'MLSCN', label: 'MLSCN (laboratory scientists)' },
  { value: 'NMCN', label: 'NMCN (nurses and midwives)' },
  { value: 'PCN', label: 'PCN (pharmacists)' },
  { value: 'OTHER', label: 'Other licensing body' },
];

const ROLE_LABELS = { DOCTOR: 'Doctor', LAB_STAFF: 'Laboratory staff' };

const STATUS = {
  PENDING: { label: 'Waiting to be checked', bg: '#fff4d6', color: '#7a5a00' },
  VERIFIED: { label: 'Verified', bg: '#e1f5e8', color: '#146c2e' },
  REJECTED: { label: 'Rejected', bg: '#fdecea', color: '#b00020' },
  EXPIRED: { label: 'Expired', bg: '#fdecea', color: '#b00020' },
  NONE: { label: 'No licence on file', bg: '#eceff1', color: '#455a64' },
};

function StatusPill({ status }) {
  const s = STATUS[status || 'NONE'] || STATUS.NONE;
  return (
    <span className="pill" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function LicenceChecks() {
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const load = async () => {
    try {
      const response = await api.get('/api/licences');
      setRows(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'We could not load the licences. Please try again in a moment.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const verify = async (row) => {
    const ok = await confirm(
      `Mark ${row.licenceBody} licence ${row.licenceNumber} for ${row.name} as verified? Only do this after you have found it on the official register.`,
      { title: 'Verify licence', confirmLabel: 'Yes, it is on the register', danger: false }
    );
    if (!ok) return;
    setError('');
    setMessage('');
    try {
      await api.put(`/api/licences/${row.id}/verify`, {});
      setMessage(`${row.name}'s licence is verified.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not verify the licence. Please try again.');
    }
  };

  const waiting = rows.filter((r) => r.status === 'PENDING').length;
  const expiringSoon = rows.filter((r) => r.status === 'VERIFIED' && r.daysLeft != null && r.daysLeft <= 30).length;

  return (
    <div>
      <div className="page-head">
        <h1>Licence checks</h1>
        <p>
          Doctors and laboratory staff must hold a valid professional licence. Check each licence number on the
          council's official register, then record the result here.
        </p>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}

      <section className="panel">
        <h2 className="panel-title">How to check a licence</h2>
        <ol style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Click <b>Open register</b> to open the licensing council's website in a new tab.</li>
          <li>Search for the licence number and compare the name and the expiry date.</li>
          <li>Come back and click <b>Verify</b> if it matches, or <b>Reject</b> if it does not.</li>
        </ol>
        <p className="muted" style={{ marginTop: '10px' }}>
          {waiting} waiting to be checked. {expiringSoon} expiring within 30 days. A verified licence stops working
          for login on its expiry date.
        </p>
      </section>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Licence</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className="empty" colSpan="6">No doctors or laboratory staff yet.</td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}<br /><span className="muted">{row.username}</span></td>
                <td>{ROLE_LABELS[row.role] || row.role}</td>
                <td>
                  {row.licenceNumber ? (
                    <>
                      <strong>{row.licenceBody}</strong> {row.licenceNumber}
                      <br />
                      <span className="muted">{row.licenceBodyName}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {row.licenceExpiry || '—'}
                  {row.status === 'VERIFIED' && row.daysLeft != null && row.daysLeft <= 30 && (
                    <>
                      <br />
                      <span style={{ color: '#b26a00' }}>{row.daysLeft} days left</span>
                    </>
                  )}
                </td>
                <td>
                  <StatusPill status={row.status} />
                  {row.checkedBy && (
                    <>
                      <br />
                      <span className="muted">
                        Checked by {row.checkedBy}{row.checkedAt ? `, ${formatDateTime(row.checkedAt)}` : ''}
                      </span>
                    </>
                  )}
                  {row.note && (
                    <>
                      <br />
                      <span className="muted">{row.note}</span>
                    </>
                  )}
                </td>
                <td>
                  <div className="row-actions">
                    {row.registerUrl && row.licenceNumber && (
                      <a className="btn btn-quiet btn-sm" href={row.registerUrl} target="_blank" rel="noopener noreferrer">
                        Open register
                      </a>
                    )}
                    {row.status === 'PENDING' && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => verify(row)}>
                        Verify
                      </button>
                    )}
                    {(row.status === 'PENDING' || row.status === 'VERIFIED') && (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => setRejecting(row)}>
                        Reject
                      </button>
                    )}
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(row)}>
                      {row.licenceNumber ? 'Edit' : 'Add details'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditLicence
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setMessage('Licence details saved.');
            load();
          }}
        />
      )}

      {rejecting && (
        <RejectLicence
          row={rejecting}
          onClose={() => setRejecting(null)}
          onDone={() => {
            setRejecting(null);
            setMessage('Licence rejected. That person can no longer log in until it is corrected and verified.');
            load();
          }}
        />
      )}
    </div>
  );
}

function EditLicence({ row, onClose, onSaved }) {
  const [body, setBody] = useState(row.licenceBody || (row.role === 'LAB_STAFF' ? 'MLSCN' : 'MDCN'));
  const [number, setNumber] = useState(row.licenceNumber || '');
  const [expiry, setExpiry] = useState(row.licenceExpiry || '');
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/api/licences/${row.id}`, {
        licenceBody: body,
        licenceNumber: number,
        licenceExpiry: expiry,
        checked,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save. Please try again.');
    }
  };

  return (
    <Overlay title={`Licence details for ${row.name}`} onClose={onClose}>
      <form onSubmit={save}>
        <div className="form-grid">
          <label className="field">
            <span>Licensing body</span>
            <select value={body} onChange={(e) => setBody(e.target.value)} required>
              {BODIES.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Licence number</span>
            <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} required />
          </label>
          <label className="field">
            <span>Licence expiry date</span>
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} required />
          </label>
        </div>
        <label style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '14px' }}>
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <span>I checked this licence on the council's official register</span>
        </label>
        <p className="muted">
          Without the tick, the licence is saved as "Waiting to be checked" and the person cannot log in yet.
        </p>
        {error && <p className="alert alert-error" role="alert" style={{ marginTop: '14px' }}>{error}</p>}
        <div className="form-actions" style={{ marginTop: '18px' }}>
          <button type="submit" className="btn btn-primary">Save</button>
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Overlay>
  );
}

function RejectLicence({ row, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/api/licences/${row.id}/reject`, { note });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reject the licence. Please try again.');
    }
  };

  return (
    <Overlay title={`Reject the licence of ${row.name}`} onClose={onClose}>
      <form onSubmit={save}>
        <label className="field">
          <span>Why is it being rejected?</span>
          <textarea
            rows="3"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="For example: number not found on the register"
            required
          />
        </label>
        {error && <p className="alert alert-error" role="alert" style={{ marginTop: '14px' }}>{error}</p>}
        <div className="form-actions" style={{ marginTop: '18px' }}>
          <button type="submit" className="btn btn-danger">Reject licence</button>
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Overlay>
  );
}

export default LicenceChecks;