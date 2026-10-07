import { useState } from 'react';
import api from './api';
import Overlay from './Overlay';
import { useConfirm } from './ConfirmDialog';
import { formatNaira } from './currency';
import { WARD_TYPES } from './wardsHelpers';

const EMPTY = { name: '', type: 'General', floor: '', dailyRate: '', bedCount: '8', bedPrefix: '' };

function WardManager({ wards, onChanged, onError }) {
  const confirm = useConfirm();
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [addingBeds, setAddingBeds] = useState(null);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/wards', {
        ...form,
        dailyRate: Number(form.dailyRate),
        bedCount: Number(form.bedCount || 0),
      });
      onChanged(`Ward ${form.name} created.`);
      setForm(EMPTY);
    } catch (err) {
      onError(err.response?.data?.message || 'Could not create the ward.');
    }
  };

  const remove = async (ward) => {
    if (!(await confirm(`Delete ${ward.name} and all ${ward.totalBeds} of its beds? This cannot be undone.`))) return;
    try {
      await api.delete(`/api/wards/${ward.id}`);
      onChanged(`Ward ${ward.name} deleted.`);
    } catch (err) {
      onError(err.response?.data?.message || 'Could not delete the ward.');
    }
  };

  return (
    <div>
      <section className="panel">
        <h2 className="panel-title">Create a ward</h2>
        <form className="form-grid" onSubmit={create}>
          <label className="field">
            <span>Ward name</span>
            <input type="text" value={form.name} onChange={set('name')} maxLength={60} required />
          </label>
          <label className="field">
            <span>Type</span>
            <select value={form.type} onChange={set('type')}>
              {WARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Floor or location</span>
            <input type="text" value={form.floor} onChange={set('floor')} />
          </label>
          <label className="field">
            <span>Daily rate per bed (₦)</span>
            <input type="number" min="1" step="0.01" value={form.dailyRate} onChange={set('dailyRate')} required />
          </label>
          <label className="field">
            <span>Number of beds</span>
            <input type="number" min="0" max="50" value={form.bedCount} onChange={set('bedCount')} />
          </label>
          <label className="field">
            <span>Bed label prefix</span>
            <input type="text" value={form.bedPrefix} onChange={set('bedPrefix')} maxLength={8} placeholder="Defaults to the first letter" />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Create ward</button>
          </div>
        </form>
      </section>

      <div className="list-head">
        <h2>All wards</h2>
        <span className="count">{wards.length} {wards.length === 1 ? 'ward' : 'wards'}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Ward</th><th>Type</th><th>Floor</th><th>Daily rate</th><th>Beds</th><th>Occupied</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {wards.length === 0 && <tr><td className="empty" colSpan="7">No wards yet. Create the first one above.</td></tr>}
            {wards.map((ward) => (
              <tr key={ward.id}>
                <td>{ward.name}</td>
                <td>{ward.type}</td>
                <td>{ward.floor || <span className="muted">Not given</span>}</td>
                <td>{formatNaira(ward.dailyRate)}</td>
                <td>{ward.totalBeds}</td>
                <td>{ward.occupied}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(ward)}>Edit</button>
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => setAddingBeds(ward)}>Add beds</button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(ward)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditWard
          ward={editing}
          onClose={() => setEditing(null)}
          onSaved={(text) => { setEditing(null); onChanged(text); }}
        />
      )}
      {addingBeds && (
        <AddBeds
          ward={addingBeds}
          onClose={() => setAddingBeds(null)}
          onSaved={(text) => { setAddingBeds(null); onChanged(text); }}
        />
      )}
    </div>
  );
}

function EditWard({ ward, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: ward.name,
    type: ward.type,
    floor: ward.floor || '',
    dailyRate: String(ward.dailyRate),
  });
  const [error, setError] = useState('');
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/api/wards/${ward.id}`, { ...form, dailyRate: Number(form.dailyRate) });
      onSaved(`Ward ${form.name} saved.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the ward.');
    }
  };

  return (
    <Overlay title={`Edit ${ward.name}`} onClose={onClose}>
      <form onSubmit={save}>
        <div className="form-grid">
          <label className="field">
            <span>Ward name</span>
            <input type="text" value={form.name} onChange={set('name')} maxLength={60} required />
          </label>
          <label className="field">
            <span>Type</span>
            <select value={form.type} onChange={set('type')}>
              {WARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Floor or location</span>
            <input type="text" value={form.floor} onChange={set('floor')} />
          </label>
          <label className="field">
            <span>Daily rate per bed (₦)</span>
            <input type="number" min="1" step="0.01" value={form.dailyRate} onChange={set('dailyRate')} required />
          </label>
        </div>
        <p className="muted">A new rate applies to admissions and transfers from now on. Patients already in a bed keep the rate they started with.</p>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        <div className="form-actions" style={{ marginTop: '14px' }}>
          <button type="submit" className="btn btn-primary">Save changes</button>
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Overlay>
  );
}

function AddBeds({ ward, onClose, onSaved }) {
  const [count, setCount] = useState('4');
  const [prefix, setPrefix] = useState('');
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/api/wards/${ward.id}/beds`, { count: Number(count), prefix });
      onSaved(`${count} beds added to ${ward.name}.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add the beds.');
    }
  };

  return (
    <Overlay title={`Add beds to ${ward.name}`} onClose={onClose}>
      <form onSubmit={save}>
        <div className="form-grid">
          <label className="field">
            <span>How many beds</span>
            <input type="number" min="1" max="50" value={count} onChange={(e) => setCount(e.target.value)} required />
          </label>
          <label className="field">
            <span>Label prefix</span>
            <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} maxLength={8} placeholder="Defaults to the first letter" />
          </label>
        </div>
        <p className="muted">Beds are numbered on from the ones that already exist, so labels never repeat.</p>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        <div className="form-actions" style={{ marginTop: '14px' }}>
          <button type="submit" className="btn btn-primary">Add beds</button>
          <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Overlay>
  );
}

export default WardManager;