import { useEffect, useState } from 'react';
import api from './api';
import { formatNaira } from './currency';
import { formatDateTime } from './format';
import Receipt from './Receipt';
import { PATIENT_METHODS, statusBadge, statusLabel, claimBadge, claimLabel, lastReceipt } from './billingHelpers';

function MyBilling() {
  const [bills, setBills] = useState([]);
  const [paying, setPaying] = useState(null); // the bill being paid
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Card');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null); // { billId, payment }

  const load = async () => {
    const response = await api.get('/api/bills/mine');
    setBills(response.data);
  };

  useEffect(() => { load(); }, []);

  const startPaying = (bill) => {
    setMessage('');
    setError('');
    setAmount(String(bill.balance));
    setMethod('Card');
    setPaying(bill);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post(`/api/bills/${paying.id}/pay`, { amount: Number(amount), method });
      setPaying(null);
      setMessage('Demo payment successful.');
      await load();
      setReceipt({ billId: response.data.id, payment: lastReceipt(response.data) });
    } catch (err) {
      setError(err.response?.data?.message || 'The payment did not go through.');
    }
  };

  // Every payment across all bills, newest first, so old receipts can be opened again
  const allPayments = bills
    .flatMap((bill) => (bill.payments || []).map((p) => ({ ...p, billId: bill.id })))
    .sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt)));

  return (
    <div>
      <div className="page-head">
        <h1>My billing</h1>
        <p>See what you owe, what your HMO covers, and pay all or part of your balance. </p>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}

      {paying && (
        <section className="panel prompt-card">
          <h2 className="panel-title">Pay your balance</h2>
          <p className="muted">
            Your share {formatNaira(paying.patientShare)} · Paid {formatNaira(paying.amountPaid)} · <strong>Balance {formatNaira(paying.balance)}</strong>
          </p>
          <form className="form-grid" onSubmit={submitPayment}>
            <label className="field">
              <span>Amount to pay (₦)</span>
              <input type="number" min="0.01" step="0.01" max={paying.balance} value={amount} onChange={(e) => setAmount(e.target.value)} required />
              <small className="field-hint">You can pay part now and the rest later.</small>
            </label>
            <label className="field">
              <span>Pay with</span>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                {PATIENT_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Pay now (demo)</button>
              <button type="button" className="btn btn-quiet" onClick={() => setPaying(null)}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Date</th><th>Items</th><th>Total</th><th>HMO</th><th>You pay</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {bills.length === 0 && <tr><td className="empty" colSpan="7">No bills have been issued to you.</td></tr>}
            {bills.map((bill) => (
              <tr key={bill.id}>
                <td>{bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('en-GB') : '—'}</td>
                <td>{(bill.items || []).map((item) => `${item.description} (${formatNaira(item.amount)})`).join(', ')}</td>
                <td>{formatNaira(bill.total)}</td>
                <td>
                  {bill.hmoCoveredAmount > 0 ? (
                    <>
                      <div>{bill.hmoProvider}</div>
                      <div>{formatNaira(bill.hmoCoveredAmount)}</div>
                      <span className={claimBadge(bill.claimStatus)}>{claimLabel(bill.claimStatus)}</span>
                    </>
                  ) : (
                    <span className="muted">None</span>
                  )}
                </td>
                <td>
                  <div>Share {formatNaira(bill.patientShare)}</div>
                  <div className="notif-meta">Paid {formatNaira(bill.amountPaid)}</div>
                  <div><strong>Balance {formatNaira(bill.balance)}</strong></div>
                </td>
                <td><span className={statusBadge(bill.status)}>{statusLabel(bill.status)}</span></td>
                <td>
                  <div className="row-actions">
                    {bill.balance > 0 && (
                      <button className="btn btn-primary btn-sm" onClick={() => startPaying(bill)}>
                        Pay
                      </button>
                    )}
                    {bill.status === 'AWAITING_HMO' && <span className="muted">Waiting for HMO</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="list-head" style={{ marginTop: '28px' }}>
        <h2>My receipts</h2>
        <span className="count">{allPayments.length} {allPayments.length === 1 ? 'payment' : 'payments'}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Receipt no.</th><th>Date</th><th>Method</th><th>Amount</th><th>Action</th></tr>
          </thead>
          <tbody>
            {allPayments.length === 0 && <tr><td className="empty" colSpan="5">No payments yet.</td></tr>}
            {allPayments.map((p) => (
              <tr key={p.receiptNumber}>
                <td>{p.receiptNumber}</td>
                <td>{formatDateTime(p.paidAt)}</td>
                <td>{p.method}</td>
                <td>{formatNaira(p.amount)}</td>
                <td>
                  <button className="btn btn-quiet btn-sm" onClick={() => setReceipt({ billId: p.billId, payment: p.receiptNumber })}>
                    View receipt
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {receipt && <Receipt billId={receipt.billId} paymentNumber={receipt.payment} onClose={() => setReceipt(null)} />}
    </div>
  );
}

export default MyBilling;