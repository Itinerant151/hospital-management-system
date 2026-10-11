import { useState } from 'react';
import axios from 'axios';
import './IdCard.css';

const API = 'http://localhost:8080/api/backup';

export default function BackupLauncher() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const download = () => {
    setBusy(true);
    setError('');
    setMessage('');
    axios
      .get(`${API}/export`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      .then((res) => {
        const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `medicore-export-${stamp}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        setMessage('Export downloaded to your Downloads folder.');
      })
      .catch(() => setError('Could not export the data.'))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <button className="idc-fab" style={{ right: 110, background: '#198754' }} onClick={() => setOpen(true)}>
        Backup
      </button>

      {open && (
        <div className="idc-overlay" onClick={() => setOpen(false)}>
          <div className="idc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="idc-modal-top">
              <h3>Data export</h3>
              <button className="idc-close" onClick={() => setOpen(false)}>&times;</button>
            </div>
            <p className="idc-hint">
              Downloads every collection (patients, bills, wards, lab and so on) as one JSON file.
              Passwords and tokens are left out.
            </p>
            {error && <div className="idc-error">{error}</div>}
            {message && <div className="idc-hint">{message}</div>}
            <button className="idc-print-btn" disabled={busy} onClick={download}>
              {busy ? 'Exporting...' : 'Download JSON export'}
            </button>
            <p className="idc-hint" style={{ marginTop: 16 }}>
              For a full restorable backup, run <b>backup.bat</b> on the server computer.
            </p>
          </div>
        </div>
      )}
    </>
  );
}