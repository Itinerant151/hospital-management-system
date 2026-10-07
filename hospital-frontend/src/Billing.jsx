import { useState, useEffect, useMemo } from 'react';
import api from './api';
import { useConfirm } from './ConfirmDialog';
import { formatNaira } from './currency';
import Receipt from './Receipt';
import HmoReceipt from './HmoReceipt';
import HmoActions from './HmoActions';
import { STAFF_METHODS, statusBadge, statusLabel, claimBadge, claimLabel, lastReceipt, percentText } from './billingHelpers';

const EMPTY_ITEMS = [{ description: '', amount: '' }];

function Billing() {
  const confirm = useConfirm();
  const role = localStorage.getItem('role');

  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [receipt, setReceipt] = useState(null);       // { billId, payment }
  const [hmoReceiptFor, setHmoReceiptFor] = useState(null);

  // Create-bill form
  const [patientId, setPatientId] = useState('');
  const [items, setItems] = useState(EMPTY_ITEMS);
  const [hmoOn, setHmoOn] = useState(false);
  const [hmoProvider, setHmoProvider] = useState('');
  const [hmoMember, setHmoMember] = useState('');
  const [hmoPercent, setHmoPercent] = useState('');

  // Record-payment panel
  const [paying, setPaying] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');

  useEffect(() => {
    fetchBills();
    api.get('/patients').then((response) => setPatients(response.data));
  }, []);

  const fetchBills = async () => {
    const response = await api.get('/api/bills');
    setBills(response.data);
  };

  const patientName = (id) => patients.find((p) => p.id === id)?.name || 'Unknown';

  const total = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const percent = hmoOn ? Math.min(100, Math.max(0, Number(hmoPercent) || 0)) : 0;
  const covered = Math.round(total * percent) / 100;

  const choosePatient = (id) => {
    setPatientId(id);
    // Use the insurance details already on the patient's record
    const patient = patients.find((p) => p.id === id);
    if (patient && patient.insuranceProvider) {
      setHmoOn(true);
      setHmoProvider(patient.insuranceProvider);
      setHmoMember(patient.insuranceNumber || '');
    }
  };

  const updateItem = (index, field, value) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));

  const resetForm = () => {
    setPatientId('');
    setItems(EMPTY_ITEMS);
    setHmoOn(false);
    setHmoProvider('');
    setHmoMember('');
    setHmoPercent('');
  };

  const createBill = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const cleanItems = items
      .filter((it) => it.description && it.amount !== '')
      .map((it) => ({ description: it.description, amount: Number(it.amount) }));
    if (!patientId || cleanItems.length === 0) {
      setError('Choose a patient and add at least one line item.');
      return;
    }
    if (hmoOn && (Number(hmoPercent) <= 0 || Number(hmoPercent) > 100)) {
      setError('Enter an HMO coverage between 1% and 100%.');
      return;
    }
    try {
      await api.post('/api/bills', {
        patientId,
        items: cleanItems,
        hmoProvider: hmoOn ? hmoProvider : null,
        hmoMemberNumber: hmoOn ? hmoMember : null,
        hmoCoveragePercent: hmoOn ? Number(hmoPercent) : 0,
      });
      resetForm();
      setMessage('Bill created.');
      fetchBills();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create the bill.');
    }
  };

  const openPay = (bill) => {
    setError('');
    setMessage('');
    setPayAmount(String(bill.balance));
    setPayMethod('Cash');
    setPaying(bill);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post(`/api/bills/${paying.id}/pay`, {
        amount: Number(payAmount),
        method: payMethod,
      });
      setPaying(null);
      setMessage('Payment recorded.');
      await fetchBills();
      setReceipt({ billId: response.data.id, payment: lastReceipt(response.data) });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not record the payment.');
    }
  };

  const deleteBill = async (id) => {
    if (!(await confirm('Delete this bill? This cannot be undone.'))) return;
    await api.delete(`/api/bills/${id}`);
    fetchBills();
  };

  const visible = useMemo(() => {
    if (filter === 'OUTSTANDING') return bills.filter((b) => b.status !== 'PAID');
    if (filter === 'HMO') return bills.filter((b) => b.hmoCoveredAmount > 0);
    if (filter === 'PAID') return bills.filter((b) => b.status === 'PAID');
    return bills;
  }, [bills, filter]);

  return (
    <div>
      <div className="page-head">
        <h1>Billing</h1>
        <p>Create bills, split them with the patient's HMO by percentage, record payments and print receipts. Claim approvals are on the HMO claims page.</p>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}

      {paying && (
        <section className="panel prompt-card">
          <h2 className="panel-title">Record a payment: {patientName(paying.patientId)}</h2>
          <p className="muted">
            Bill total {formatNaira(paying.total)} · Patient's share {formatNaira(paying.patientShare)} · Paid{' '}
            {formatNaira(paying.amountPaid)} · <strong>Balance {formatNaira(paying.balance)}</strong>
          </p>
          <form className="form-grid" onSubmit={submitPayment}>
            <label className="field">
              <span>Amount paid (₦)</span>
              <input type="number" min="0.01" step="0.01" max={paying.balance} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
              <small className="field-hint">Pay part of the balance or all of it.</small>
            </label>
            <label className="field">
              <span>Payment method</span>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                {STAFF_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Record payment</button>
              <button type="button" className="btn btn-quiet" onClick={() => setPaying(null)}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <h2 className="panel-title">Create a bill</h2>
        <form className="form-grid" onSubmit={createBill}>
          <label className="field">
            <span>Patient</span>
            <select value={patientId} onChange={(e) => choosePatient(e.target.value)} required>
              <option value="">Select a patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          <div className="field field-full">
            <span>Line items</span>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input type="text" placeholder="Description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} />
                <input type="number" min="0" step="0.01" placeholder="Amount (₦)" value={item.amount} onChange={(e) => updateItem(i, 'amount', e.target.value)} style={{ maxWidth: '140px' }} />
                {items.length > 1 && (
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            <div>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setItems((prev) => [...prev, { description: '', amount: '' }])}>
                + Add line item
              </button>
            </div>
          </div>

          <label className="field field-full check-row">
            <input type="checkbox" checked={hmoOn} onChange={(e) => setHmoOn(e.target.checked)} />
            <span>Part of this bill is covered by an HMO</span>
          </label>

          {hmoOn && (
            <>
              <label className="field">
                <span>HMO provider</span>
                <input type="text" value={hmoProvider} onChange={(e) => setHmoProvider(e.target.value)} required />
              </label>
              <label className="field">
                <span>HMO member number</span>
                <input type="text" value={hmoMember} onChange={(e) => setHmoMember(e.target.value)} required />
              </label>
              <label className="field">
                <span>HMO coverage (%)</span>
                <input type="number" min="1" max="100" step="0.5" placeholder="e.g. 80" value={hmoPercent} onChange={(e) => setHmoPercent(e.target.value)} required />
                <small className="field-hint">The share of the bill the HMO pays. The patient pays the rest.</small>
              </label>
            </>
          )}

          <div className="field field-full">
            <div className="summary-strip">
              <div><span>Bill total</span><strong>{formatNaira(total)}</strong></div>
              <div><span>HMO covers {hmoOn ? percentText(percent) : ''}</span><strong>{formatNaira(covered)}</strong></div>
              <div><span>Patient pays</span><strong>{formatNaira(Math.max(0, total - covered))}</strong></div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Create bill</button>
          </div>
        </form>
      </section>

      <div className="list-head">
        <h2>All bills</h2>
        <div className="row-actions">
          <select className="cell-select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter bills">
            <option value="ALL">All bills</option>
            <option value="OUTSTANDING">Outstanding</option>
            <option value="HMO">With an HMO</option>
            <option value="PAID">Paid</option>
          </select>
          <span className="count">{visible.length} {visible.length === 1 ? 'bill' : 'bills'}</span>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Items</th>
              <th>Total</th>
              <th>HMO</th>
              <th>Patient pays</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td className="empty" colSpan="7">No bills to show.</td></tr>
            )}
            {visible.map((bill) => (
              <tr key={bill.id}>
                <td>{patientName(bill.patientId)}</td>
                <td>
                  {(bill.items || []).map((it, i) => (
                    <div key={i}>{it.description} — {formatNaira(it.amount)}</div>
                  ))}
                </td>
                <td>{formatNaira(bill.total)}</td>
                <td>
                  {bill.hmoCoveredAmount > 0 ? (
                    <>
                      <div>{bill.hmoProvider}</div>
                      <div className="notif-meta">Member {bill.hmoMemberNumber}</div>
                      <div>{percentText(bill.hmoCoveragePercent)} · {formatNaira(bill.hmoCoveredAmount)}</div>
                      <span className={claimBadge(bill.claimStatus)}>{claimLabel(bill.claimStatus)}</span>
                      {bill.claimStatus === 'PARTIALLY_APPROVED' && (
                        <div className="notif-meta">Approved {percentText(bill.hmoApprovedPercent)}</div>
                      )}
                      <div>{bill.hmoPaid ? <span className="badge badge-completed">HMO paid</span> : <span className="notif-meta">HMO not paid yet</span>}</div>
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
                <td>
                  <span className={statusBadge(bill.status)}>{statusLabel(bill.status)}</span>
                </td>
                <td>
                  <div className="row-actions">
                    {bill.balance > 0 && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => openPay(bill)}>
                        Record payment
                      </button>
                    )}
                    {lastReceipt(bill) && (
                      <button type="button" className="btn btn-quiet btn-sm" onClick={() => setReceipt({ billId: bill.id, payment: lastReceipt(bill) })}>
                        Receipt
                      </button>
                    )}
                    <HmoActions bill={bill} onChanged={fetchBills} onShowReceipt={setHmoReceiptFor} />
                    {role === 'ADMIN' && (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteBill(bill.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {receipt && <Receipt billId={receipt.billId} paymentNumber={receipt.payment} onClose={() => setReceipt(null)} />}
      {hmoReceiptFor && <HmoReceipt billId={hmoReceiptFor} onClose={() => setHmoReceiptFor(null)} />}
    </div>
  );
}

export default Billing;