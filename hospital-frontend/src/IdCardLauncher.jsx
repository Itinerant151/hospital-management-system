import { useState, useEffect } from 'react';
import axios from 'axios';
import IdCard from './IdCard';
import './IdCard.css';

// Change this if your backend runs on a different address
const API = 'http://localhost:8080/api/id-cards';

function authHeader() {
  return { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
}

export default function IdCardLauncher({ role }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('me'); // 'me' | 'patient' | 'staff'
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState('');
  const [card, setCard] = useState(null);
  const [error, setError] = useState('');

  const canBrowsePatients = role === 'ADMIN' || role === 'RECEPTIONIST';
  const canBrowseStaff = role === 'ADMIN';

  const loadCard = (url) => {
    setError('');
    axios
      .get(url, authHeader())
      .then((res) => setCard(res.data))
      .catch(() => {
        setCard(null);
        setError('Could not load the ID card.');
      });
  };

  useEffect(() => {
    if (!open) return;
    setCard(null);
    setError('');
    setSelected('');
    setList([]);
    if (mode === 'me') {
      loadCard(`${API}/me`);
      return;
    }
    axios
      .get(`${API}/${mode === 'patient' ? 'patients' : 'staff'}`, authHeader())
      .then((res) => setList(res.data))
      .catch(() => setError('Could not load the list.'));
  }, [open, mode]);

  const handleSelect = (e) => {
    const id = e.target.value;
    setSelected(id);
    if (id) {
      loadCard(`${API}/${mode}/${id}`);
    } else {
      setCard(null);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setMode('me');
  };

  return (
    <>
      <button className="idc-fab" onClick={() => setOpen(true)}>ID Card</button>

      {open && (
        <div className="idc-overlay" onClick={handleClose}>
          <div className="idc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="idc-modal-top">
              <h3>ID Card</h3>
              <button className="idc-close" onClick={handleClose}>&times;</button>
            </div>

            {(canBrowsePatients || canBrowseStaff) && (
              <div className="idc-tabs">
                <button className={`idc-tab ${mode === 'me' ? 'active' : ''}`} onClick={() => setMode('me')}>My card</button>
                {canBrowsePatients && (
                  <button className={`idc-tab ${mode === 'patient' ? 'active' : ''}`} onClick={() => setMode('patient')}>Patients</button>
                )}
                {canBrowseStaff && (
                  <button className={`idc-tab ${mode === 'staff' ? 'active' : ''}`} onClick={() => setMode('staff')}>Staff</button>
                )}
              </div>
            )}

            {mode !== 'me' && (
              <select className="idc-select" value={selected} onChange={handleSelect}>
                <option value="">
                  {mode === 'patient' ? 'Select a patient' : 'Select a staff member'}
                </option>
                {list.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}{item.role ? ` (${item.role})` : ''}
                  </option>
                ))}
              </select>
            )}

            {error && <div className="idc-error">{error}</div>}
            {mode !== 'me' && !card && !error && (
              <div className="idc-hint">Choose someone from the list to see their card.</div>
            )}

            <div className="idc-print-area">
              <IdCard card={card} />
            </div>

            <button className="idc-print-btn" disabled={!card} onClick={() => window.print()}>
              Print card
            </button>
          </div>
        </div>
      )}
    </>
  );
}