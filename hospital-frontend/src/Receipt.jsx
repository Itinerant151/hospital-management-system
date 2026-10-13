import { useEffect, useState } from 'react';
import api from './api';
import Overlay from './Overlay';
import { formatNaira } from './currency';
import { formatDateTime } from './format';
import { claimLabel, statusLabel } from './billingHelpers';

// On-screen receipt for one payment. "Print Receipt" opens the browser's print window .
function Receipt({ billId, paymentNumber, onClose }) {
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api
      .get(`/api/bills/${billId}/receipt`, { params: paymentNumber ? { payment: paymentNumber } : {} })
      .then((response) => alive && setReceipt(response.data))
      .catch((err) => alive && setError(err.response?.data?.message || 'Could not load the receipt.'));
    return () => {
      alive = false;
    };
  }, [billId, paymentNumber]);

  return (
    <Overlay title="Payment receipt" onClose={onClose}>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {!receipt && !error && <p className="muted">Loading receipt...</p>}
      {receipt && (
        <>
          <div className="receipt-sheet print-area">
            <div className="receipt-top">
              <div className="receipt-hospital">{receipt.hospital}</div>
              <div className="receipt-title">PAYMENT RECEIPT</div>
            </div>

            <div className="receipt-meta">
              <div><span>Receipt no.</span><strong>{receipt.receiptNumber}</strong></div>
              <div><span>Date</span><strong>{formatDateTime(receipt.paidAt)}</strong></div>
              <div><span>Patient</span><strong>{receipt.patientName}</strong></div>
              <div><span>Hospital ID</span><strong>{receipt.patientCode}</strong></div>
            </div>

            <table className="receipt-table">
              <thead>
                <tr><th>Item</th><th className="num">Amount</th></tr>
              </thead>
              <tbody>
                {(receipt.items || []).map((item, i) => (
                  <tr key={i}><td>{item.description}</td><td className="num">{formatNaira(item.amount)}</td></tr>
                ))}
              </tbody>
            </table>

            <div className="receipt-lines">
              <div><span>Bill total</span><span>{formatNaira(receipt.total)}</span></div>
              {receipt.hmoCoveredAmount > 0 && (
                <div>
                  <span>
                    HMO ({receipt.hmoProvider}, member {receipt.hmoMemberNumber}) · {claimLabel(receipt.claimStatus)}
                  </span>
                  <span>− {formatNaira(receipt.hmoAmount)}</span>
                </div>
              )}
              <div><span>Patient's share</span><span>{formatNaira(receipt.patientShare)}</span></div>
              <div className="receipt-paid"><span>Paid now ({receipt.method})</span><span>{formatNaira(receipt.paymentAmount)}</span></div>
              <div><span>Total paid so far</span><span>{formatNaira(receipt.totalPaid)}</span></div>
              <div className="receipt-balance"><span>Balance remaining</span><span>{formatNaira(receipt.balance)}</span></div>
            </div>

            <div className="receipt-foot">
              <div>Bill status: <strong>{statusLabel(receipt.status)}</strong></div>
              <div>Received by: {receipt.receivedBy || '—'}</div>
              <div className="receipt-demo">Thank you. Please keep this receipt for your records.</div>
            </div>
          </div>

          <div className="form-actions no-print" style={{ marginTop: '16px' }}>
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              Print Receipt
            </button>
            <button type="button" className="btn btn-quiet" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      )}
    </Overlay>
  );
}

export default Receipt;