import { useState, useEffect, useMemo, useRef } from 'react';
import api from './api';
import { useConfirm } from './ConfirmDialog';
import { formatNaira } from './currency';
import Receipt from './Receipt';
import HmoReceipt from './HmoReceipt';
import HmoActions from './HmoActions';
import BillHmoEditor from './BillHmoEditor';
import { STAFF_METHODS, statusBadge, statusLabel, claimBadge, claimLabel, lastReceipt, percentText } from './billingHelpers';

const EMPTY_ITEMS = [{ description: '', amount: '' }];

// Looks like a plain link so a patient's name reads as clickable in any theme
const nameLink = {
  background: 'none',
  border: 'none',
  padding: 0,
  font: 'inherit',
  color: 'inherit',
  textDecoration: 'underline',
  cursor: 'pointer',
  textAlign: 'left',
};

// Tells staff which kind of bill a charge sits on
const billLabel = (bill) => {
  if (bill.running) return 'Running bill';
  if (bill.laboratoryOrderId) return 'Laboratory bill';
  if (bill.appointmentId) return 'Consultation bill';
  return 'Bill';
};

function Billing() {
  const confirm = useConfirm();
  const role = localStorage.getItem('role');
  const formRef = useRef(null);

  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [receipt, setReceipt] = useState(null);       // { billId, payment }
  const [hmoReceiptFor, setHmoReceiptFor] = useState(null);

  // The patient chosen in the form, and what bringing their charges up to date did
  const [patientId, setPatientId] = useState('');
  const [syncInfo, setSyncInfo] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Extra charges and HMO for the bill
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

  // Choosing a patient brings their charges up to date and shows them in the form
  const selectPatient = async (id, scrollToForm = false) => {
    setError('');
    setMessage('');
    setSyncInfo(null);
    setItems(EMPTY_ITEMS);
    setHmoPercent('');
    setSearch('');

    if (!id) {
      setPatientId('');
      setHmoOn(false);
      setHmoProvider('');
      setHmoMember('');
      return;
    }

    setPatientId(id);
    setFilter('ALL');

    // Use the insurance details already on the patient's record
    const patient = patients.find((p) => p.id === id);
    if (patient && patient.insuranceProvider) {
      setHmoOn(true);
      setHmoProvider(patient.insuranceProvider);
      setHmoMember(patient.insuranceNumber || '');
    } else {
      setHmoOn(false);
      setHmoProvider('');
      setHmoMember('');
    }

    if (scrollToForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    setSyncing(true);
    try {
      const response = await api.post(`/api/bills/patient/${id}/sync`);
      setSyncInfo(response.data);
      await fetchBills();
    } catch (err) {
      setError(err.response?.data?.message || "Could not bring this patient's charges up to date.");
    } finally {
      setSyncing(false);
    }
  };

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return patients.filter((p) => (p.name || '').toLowerCase().includes(q)).slice(0, 12);
  }, [patients, search]);

  // Everything the chosen patient still has to pay, from all of their unpaid bills
  const patientBills = useMemo(
    () => (patientId ? bills.filter((b) => b.patientId === patientId) : []),
    [bills, patientId]
  );
  const outstanding = patientBills.filter((b) => b.status !== 'PAID');
  const outstandingLines = outstanding.flatMap((b) =>
    (b.items || []).map((it, i) => ({
      key: `${b.id}-${i}`,
      description: it.description,
      amount: it.amount,
      label: billLabel(b),
    }))
  );
  const owed = outstanding.reduce((sum, b) => sum + (b.balance || 0), 0);

  // Whether the HMO share can still be set on the patient's running bill
  const runningBill = patientBills.find((b) => b.running) || null;
  const runningClaim = runningBill?.claimStatus || 'NONE';
  const runningHasPayments = Boolean(
    runningBill && ((runningBill.amountPaid || 0) > 0 || (runningBill.payments || []).length > 0)
  );
  const runningHasHmo = Boolean(runningBill && runningBill.hmoCoveredAmount > 0);
  const hmoLocked = Boolean(
    runningBill &&
      (runningBill.hmoPaid ||
        runningBill.status === 'PAID' ||
        runningHasPayments ||
        !(runningClaim === 'NONE' || runningClaim === 'PENDING'))
  );
  const showHmoFields = !runningHasHmo && !hmoLocked;

  const manualTotal = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const billTotal = Math.round(((runningBill ? runningBill.total : 0) + manualTotal) * 100) / 100;
  const percent = hmoOn ? Math.min(100, Math.max(0, Number(hmoPercent) || 0)) : 0;
  let covered = 0;
  if (runningHasHmo) {
    covered =
      runningClaim === 'PENDING'
        ? Math.round(billTotal * runningBill.hmoCoveragePercent) / 100
        : runningBill.hmoAmount || 0;
  } else if (showHmoFields && hmoOn) {
    covered = Math.round(billTotal * percent) / 100;
  }
  const shownPercent = runningHasHmo ? runningBill.hmoCoveragePercent : percent;

  const updateItem = (index, field, value) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));

  // Saves the extra charges (and the HMO share) onto the patient's bill
  const saveCharges = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!patientId) {
      setError('Choose a patient first.');
      return;
    }
    const extras = items
      .filter((it) => it.description && it.amount !== '')
      .map((it) => ({ description: it.description, amount: Number(it.amount) }));
    const addHmo = showHmoFields && hmoOn;
    if (addHmo && (Number(hmoPercent) <= 0 || Number(hmoPercent) > 100)) {
      setError('Enter an HMO coverage between 1% and 100%.');
      return;
    }
    if (extras.length === 0 && !addHmo) {
      setError('Add a charge below, or add an HMO share, before saving.');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post(`/api/bills/patient/${patientId}/sync`, {
        items: extras,
        hmoProvider: addHmo ? hmoProvider : null,
        hmoMemberNumber: addHmo ? hmoMember : null,
        hmoCoveragePercent: addHmo ? Number(hmoPercent) : 0,
      });
      setSyncInfo(response.data);
      setItems(EMPTY_ITEMS);
      setHmoPercent('');
      setMessage("Saved on the patient's bill.");
      await fetchBills();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the charges.');
    } finally {
      setSaving(false);
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
    const base = patientId ? bills.filter((b) => b.patientId === patientId) : bills;
    if (filter === 'OUTSTANDING') return base.filter((b) => b.status !== 'PAID');
    if (filter === 'HMO') return base.filter((b) => b.hmoCoveredAmount > 0);
    if (filter === 'PAID') return base.filter((b) => b.status === 'PAID');
    return base;
  }, [bills, filter, patientId]);

  const added = syncInfo?.added || [];
  const updated = syncInfo?.updated || [];
  const notes = syncInfo?.notes || [];

  return (
    <div>
      <div className="page-head">
        <h1>Billing</h1>
        <p>Choose a patient to see everything they owe, add other charges, split the bill with the patient's HMO by percentage, record payments and print receipts. Claim approvals are on the HMO claims page.</p>
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
        <h2 className="panel-title">Find a patient</h2>
        <p className="muted">
          Type a name and click the patient. Their charges for the bed, dispensed drugs and attended consultations are added to their bill and shown in the form below.
          You can also click a patient's name in the table.
        </p>
        <label className="field">
          <span>Patient name</span>
          <input type="text" placeholder="Start typing a name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        {matches.length > 0 && (
          <div className="row-actions" style={{ flexWrap: 'wrap', marginTop: '8px' }}>
            {matches.map((p) => (
              <button key={p.id} type="button" className="btn btn-quiet btn-sm" disabled={syncing} onClick={() => selectPatient(p.id, true)}>
                {p.name}
              </button>
            ))}
          </div>
        )}
        {search.trim() && matches.length === 0 && <p className="muted">No patient matches that name.</p>}
      </section>

      <section className="panel" ref={formRef}>
        <h2 className="panel-title">Create a bill</h2>
        <form className="form-grid" onSubmit={saveCharges}>
          <label className="field">
            <span>Patient</span>
            <select value={patientId} onChange={(e) => selectPatient(e.target.value)}>
              <option value="">Select a patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          {!patientId && (
            <div className="field field-full">
              <p className="muted" style={{ margin: 0 }}>Choose a patient to see what they owe.</p>
            </div>
          )}

          {patientId && (
            <>
              <div className="field field-full">
                <span>Charges for {patientName(patientId)}</span>
                {syncing && <p className="muted">Bringing the charges up to date...</p>}
                {!syncing && outstandingLines.length === 0 && (
                  <p className="muted">Nothing is outstanding for this patient right now.</p>
                )}
                {outstandingLines.length > 0 && (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Description</th><th>Bill</th><th>Price</th></tr>
                      </thead>
                      <tbody>
                        {outstandingLines.map((line) => (
                          <tr key={line.key}>
                            <td>{line.description}</td>
                            <td><span className="notif-meta">{line.label}</span></td>
                            <td>{formatNaira(line.amount)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan="2"><strong>Still to be paid by the patient</strong></td>
                          <td><strong>{formatNaira(owed)}</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                {added.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <strong>Added just now</strong>
                    {added.map((line, i) => <div key={i}>{line}</div>)}
                  </div>
                )}
                {updated.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <strong>Brought up to date</strong>
                    {updated.map((line, i) => <div key={i}>{line}</div>)}
                  </div>
                )}
                {notes.map((note, i) => <p key={i} className="notif-meta">{note}</p>)}
              </div>

              <div className="field field-full">
                <span>Add other charges (optional)</span>
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

              {runningHasHmo && (
                <div className="field field-full">
                  <p className="muted" style={{ margin: 0 }}>
                    This bill already has HMO cover ({runningBill.hmoProvider}, {percentText(runningBill.hmoCoveragePercent)}).
                    Use Edit HMO in the table to change it.
                  </p>
                </div>
              )}
              {!runningHasHmo && hmoLocked && (
                <div className="field field-full">
                  <p className="muted" style={{ margin: 0 }}>
                    An HMO can no longer be added here because this bill already has a payment or a decided claim.
                  </p>
                </div>
              )}

              {showHmoFields && (
                <>
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
                </>
              )}

              <div className="field field-full">
                <div className="summary-strip">
                  <div><span>Bill total</span><strong>{formatNaira(billTotal)}</strong></div>
                  <div><span>HMO covers {shownPercent > 0 ? percentText(shownPercent) : ''}</span><strong>{formatNaira(covered)}</strong></div>
                  <div><span>Patient pays</span><strong>{formatNaira(Math.max(0, billTotal - covered))}</strong></div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving || syncing}>
                  {saving ? 'Saving...' : runningBill ? 'Add to the bill' : 'Create bill'}
                </button>
              </div>
            </>
          )}
        </form>
      </section>

      <div className="list-head">
        <h2>{patientId ? `Bills for ${patientName(patientId)}` : 'All bills'}</h2>
        <div className="row-actions">
          {patientId && (
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => selectPatient('')}>
              Show all bills
            </button>
          )}
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
                <td>
                  <button
                    type="button"
                    style={nameLink}
                    title="Show this patient's charges in the form"
                    disabled={syncing}
                    onClick={() => selectPatient(bill.patientId, true)}
                  >
                    {patientName(bill.patientId)}
                  </button>
                  {bill.running && <div className="notif-meta">Running bill</div>}
                </td>
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
                    <BillHmoEditor bill={bill} patient={patients.find((p) => p.id === bill.patientId)} onChanged={fetchBills} />
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