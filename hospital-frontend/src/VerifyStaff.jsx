import { useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:8080/verify/staff';

export default function VerifyStaff({ initialCode = '', onBack }) {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const check = () => {
    setError('');
    setResult(null);
    if (!code.trim()) {
      setError('Enter a staff card number, for example MC-S-1A2B3C.');
      return;
    }
    axios
      .get(`${API}/${encodeURIComponent(code.trim())}`)
      .then((res) => setResult(res.data))
      .catch(() => setError('We could not connect right now. Please try again.'));
  };

  const box = {
    maxWidth: 420, margin: '60px auto', padding: 24, borderRadius: 12,
    background: '#fff', color: '#1a1a1a', border: '1px solid #c8ccd0',
    fontFamily: 'sans-serif',
  };

  return (
    <div style={box}>
      <h2 style={{ marginTop: 0 }}>MediCore staff verification</h2>
      <p>Enter the card number printed on a staff ID card.</p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && check()}
        placeholder="MC-S-XXXXXX"
        style={{ width: '100%', padding: 10, boxSizing: 'border-box', marginBottom: 10 }}
      />
      <button onClick={check} style={{ width: '100%', padding: 10, cursor: 'pointer' }}>
        Verify
      </button>

      {error && <p style={{ color: '#b00020' }}>{error}</p>}

      {result && result.valid && (
        <div style={{ marginTop: 16, padding: 12, background: '#e7f6ec', borderRadius: 8 }}>
          <b style={{ color: '#146c2e' }}>Verified staff member</b>
          <div>{result.name}</div>
          <div>{result.roleLabel}</div>
          <div style={{ fontFamily: 'monospace' }}>{result.cardNumber}</div>
        </div>
      )}
      {result && !result.valid && (
        <div style={{ marginTop: 16, padding: 12, background: '#fdecea', borderRadius: 8 }}>
          <b style={{ color: '#b00020' }}>Not verified.</b> No approved staff member has this card number.
        </div>
      )}

      <button onClick={onBack} style={{ marginTop: 16, padding: '8px 12px', cursor: 'pointer' }}>
        Back to MediCore
      </button>
    </div>
  );
}