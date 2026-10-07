import { useState } from 'react';
import api from './api';
import Overlay from './Overlay';
import { formatNaira } from './currency';
import { awaitingHmoPayment, claimLabel, percentText } from './billingHelpers';

// The "Mark HMO as paid" and "HMO receipt" buttons for one bill.
// onChanged reloads the list; onShowReceipt(billId) lets the page open the receipt.
function HmoActions({ bill, onChanged, onShowReceipt }) {
  const [marking, setMarking] = useState(false);
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!(bill.hmoCoveredAmount > 0)) return null;

  const markPaid = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post(`/api/bills/${bill.id}/hmo-pay`, { reference });
      setMarking(false);
      setReference('');
      if (onChanged) await onChanged();
      if (onShowReceipt) onShowReceipt(bill.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not mark the HMO payment as paid.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {bill.hmoPaid && (
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => onShowReceipt && onShowReceipt(bill.id)}>
          HMO receipt
        </button>
      )}
      {awaitingHmoPayment(bill) && (
        <button type="button" className="btn btn-primary btn-sm" onClick={() => { setError(''); setMarking(true); }}>
          Mark HMO as paid
        </button>
      )}
      {!bill.hmoPaid && !awaitingHmoPayment(bill) && bill.claimStatus === 'PENDING' && (
        <span className="muted">Approve the claim first</span>
      )}

      {marking && (
        <Overlay title="Mark HMO payment as paid" onClose={() => setMarking(false)}>
          <p>
            <strong>{bill.hmoProvider}</strong> (member {bill.hmoMemberNumber}) has paid its share of this bill.
          </p>
          <div className="summary-strip" style={{ marginBottom: '16px' }}>
            <div><span>Bill total</span><strong>{formatNaira(bill.total)}</strong></div>
            <div><span>HMO coverage</span><strong>{percentText(bill.hmoCoveragePercent)}</strong></div>
            <div><span>Claim</span><strong>{claimLabel(bill.claimStatus)}</strong></div>
            <div><span>HMO pays</span><strong>{formatNaira(bill.hmoAmount)}</strong></div>
          </div>
          <label className="field">
            <span>Payment reference (optional)</span>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transfer reference, cheque number..."
              maxLength={120}
            />
          </label>
          {error && <p className="alert alert-error" role="alert" style={{ marginTop: '12px' }}>{error}</p>}
          <div className="form-actions" style={{ marginTop: '16px' }}>
            <button type="button" className="btn btn-primary" onClick={markPaid} disabled={busy}>
              {busy ? 'Saving...' : `Mark ${formatNaira(bill.hmoAmount)} as paid`}
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => setMarking(false)}>Cancel</button>
          </div>
        </Overlay>
      )}
    </>
  );
}

export default HmoActions;