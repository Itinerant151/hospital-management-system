import { useState, useEffect, useMemo } from 'react';
import api from './api';
import { useConfirm } from './ConfirmDialog';
import { formatNaira } from './currency';
import Receipt from './Receipt';
import { STAFF_METHODS, statusBadge, statusLabel, claimBadge, claimLabel, lastReceipt } from './billingHelpers';

const EMPTY_ITEMS = [{ description: '', amount: '' }];

function Billing() {
  const confirm = useConfirm();
  const role = localStorage.getItem('role');

  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [receipt, setReceipt] = useState(null); // { billId, payment }

  // Create-bill form
  const [patientId, setPatientId] = useState('');
  const [items, setItems] = useState(EMPTY_ITEMS);
  const [hmoOn, setHmoOn] = useState(false);
  const [hmoProvider, setHmoProvider] = useState('');
  const [hmoMember, setHmoMember] = useState('');
  const [hmoCovered, setHmoCovered] = useState('');

  // Record-payment and HMO-claim panels (only one open at a time)
  const [panel, setPanel] = useState(null); // { type: 'pay' | 'claim', bill }
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [claimStatus, setClaimStatus] = useState('PENDING');
  const [claimApproved, setClaimApproved] = useState('');
  const [claimNote, setClaimNote] = useState('');

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
  const covered = hmoOn ? Number(hmoCovered) || 0 : 0;

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
    setHmoCovered('');
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
    if (covered > total) {
      setError('The HMO-covered amount cannot be more than the bill total.');
      return;
    }
    try {
      await api.post('/api/bills', {
        patientId,
        items: cleanItems,
        hmoProvider: hmoOn ? hmoProvider : null,
        hmoMemberNumber: hmoOn ? hmoMember : null,
        hmoCoveredAmount: covered,
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
    setPanel({ type: 'pay', bill });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openClaim = (bill) => {
    setError('');
    setMessage('');
    setClaimStatus(bill.claimStatus === 'NONE' ? 'PENDING' : bill.claimStatus);
    setClaimApproved(bill.hmoApprovedAmount ? String(bill.hmoApprovedAmount) : '');
    setClaimNote(bill.claimNote || '');
    setPanel({ type: 'claim', bill });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post(`/api/bills/${panel.bill.id}/pay`, {
        amount: Number(payAmount),
        method: payMethod,
      });
      setPanel(null);
      setMessage('Payment recorded.');
      await fetchBills();
      setReceipt({ billId: response.data.id, payment: lastReceipt(response.data) });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not record the payment.');
    }
  };

  const submitClaim = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/api/bills/${panel.bill.id}/claim`, {
        claimStatus,
        approvedAmount: claimStatus === 'PARTIALLY_APPROVED' ? Number(claimApproved) : null,
        note: claimNote,
      });
      setPanel(null);
      setMessage('HMO claim updated.');
      fetchBills();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the claim.');
    }
  };

  const deleteBill = async (id) => {
    if (!(await confirm('Delete this bill? This cannot be undone.'))) return;
    await api.delete(`/api/bills/${id}`);
    fetchBills();
  };

  const visible = useMemo(() => {
    if (filter === 'OUTSTANDING') return bills.filter((b) => b.status !== 'PAID');
    if (filter === 'CLAIMS') return bills.filter((b) => b.claimStatus === 'PENDING');
    if (filter === 'PAID') return bills.filter((b) => b.status === 'PAID');
    return bills;
  }, [bills, filter]);

  return (
    <div>
      <div className="page-head">
        <h1>Billing</h1>
        <p>Create bills, split them with the patient's HMO, record payments and follow HMO claims.</p>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}

      {panel && panel.type === 'pay' && (
        <section className="panel prompt-card">
          <h2 className="panel-title">Record a payment: {patientName(panel.bill.patientId)}</h2>
          <p className="muted">
            Bill total {formatNaira(panel.bill.total)} · Patient's share {formatNaira(panel.bill.patientShare)} · Paid{' '}
            {formatNaira(panel.bill.amountPaid)} · <strong>Balance {formatNaira(panel.bill.balance)}</strong>
          </p>
          <form className="form-grid" onSubmit={submitPayment}>
            <label className="field">
              <span>Amount paid (₦)</span>
              <input type="number" min="0.01" step="0.01" max={panel.bill.balance} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
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
              <button type="button" className="btn btn-quiet" onClick={() => setPanel(null)}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      {panel && panel.type === 'claim' && (
        <section className="panel prompt-card">
          <h2 className="panel-title">HMO claim: {patientName(panel.bill.patientId)}</h2>
          <p className="muted">
            {panel.bill.hmoProvider} · member {panel.bill.hmoMemberNumber} · claimed {formatNaira(panel.bill.hmoCoveredAmount)}
          </p>
          <form className="form-grid" onSubmit={submitClaim}>
            <label className="field">
              <span>Claim status</span>
              <select value={claimStatus} onChange={(e) => setClaimStatus(e.target.value)}>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="PARTIALLY_APPROVED">Partially approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
            {claimStatus === 'PARTIALLY_APPROVED' && (
              <label className="field">
                <span>Amount the HMO approved (₦)</span>
                <input type="number" min="0.01" step="0.01" value={claimApproved} onChange={(e) => setClaimApproved(e.target.value)} required />
                <small className="field-hint">Less than {formatNaira(panel.bill.hmoCoveredAmount)}. The patient pays the rest.</small>
              </label>
            )}
            <label className="field field-full">
              <span>Note (optional)</span>
              <input type="text" value={claimNote} onChange={(e) => setClaimNote(e.target.value)} placeholder="Reason from the HMO, reference number..." />
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Save claim status</button>
              <button type="button" className="btn btn-quiet" onClick={() => setPanel(null)}>Cancel</button>
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
                <span>HMO-covered amount (₦)</span>
                <input type="number" min="0" step="0.01" max={total || undefined} value={hmoCovered} onChange={(e) => setHmoCovered(e.target.value)} required />
              </label>
            </>
          )}

          <div className="field field-full">
            <div className="summary-strip">
              <div><span>Bill total</span><strong>{formatNaira(total)}</strong></div>
              <div><span>HMO covers</span><strong>{formatNaira(covered)}</strong></div>
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
            <option value="CLAIMS">HMO claims pending</option>
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
                      <div>{formatNaira(bill.hmoCoveredAmount)}</div>
                      <span className={claimBadge(bill.claimStatus)}>{claimLabel(bill.claimStatus)}</span>
                      {bill.claimStatus === 'PARTIALLY_APPROVED' && (
                        <div className="notif-meta">Approved {formatNaira(bill.hmoApprovedAmount)}</div>
                      )}
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
                    {bill.hmoCoveredAmount > 0 && (
                      <button type="button" className="btn btn-quiet btn-sm" onClick={() => openClaim(bill)}>
                        HMO claim
                      </button>
                    )}
                    {lastReceipt(bill) && (
                      <button type="button" className="btn btn-quiet btn-sm" onClick={() => setReceipt({ billId: bill.id, payment: lastReceipt(bill) })}>
                        Receipt
                      </button>
                    )}
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
    </div>
  );
}

export default Billing;