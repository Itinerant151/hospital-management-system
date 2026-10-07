import { useEffect, useMemo, useState } from 'react';
import api from './api';
import { formatNaira } from './currency';
import { formatDateTime } from './format';
import HmoActions from './HmoActions';
import HmoReceipt from './HmoReceipt';
import { awaitingHmoPayment, claimBadge, claimLabel, percentText } from './billingHelpers';

const FILTERS = [
  { key: 'ALL', label: 'All claims' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'UNPAID', label: 'Approved, awaiting HMO payment' },
  { key: 'PAID', label: 'Paid by the HMO' },
  { key: 'REJECTED', label: 'Rejected' },
];

const sum = (list, pick) => list.reduce((total, b) => total + (Number(pick(b)) || 0), 0);

// Every HMO claim: where it stands, whether the HMO has paid, and receipts for HMO payments
function HmoClaims() {
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [provider, setProvider] = useState('ALL');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [receiptFor, setReceiptFor] = useState(null);

  // Update-claim panel
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState('PENDING');
  const [approvedPercent, setApprovedPercent] = useState('');
  const [note, setNote] = useState('');

  const load = async () => {
    const [billResponse, patientResponse] = await Promise.all([api.get('/api/bills'), api.get('/patients')]);
    setBills(billResponse.data);
    setPatients(patientResponse.data);
  };

  useEffect(() => {
    load().catch(() => setError('Could not load the claims. Check that the backend is running.'));
  }, []);

  const patientName = (id) => patients.find((p) => p.id === id)?.name || 'Unknown';

  const claims = useMemo(() => bills.filter((b) => b.hmoCoveredAmount > 0), [bills]);
  const providers = useMemo(() => [...new Set(claims.map((b) => b.hmoProvider).filter(Boolean))].sort(), [claims]);

  const stats = useMemo(() => {
    const pending = claims.filter((b) => b.claimStatus === 'PENDING');
    const unpaid = claims.filter(awaitingHmoPayment);
    const paid = claims.filter((b) => b.hmoPaid);
    const rejected = claims.filter((b) => b.claimStatus === 'REJECTED');
    return {
      pending: { count: pending.length, amount: sum(pending, (b) => b.hmoCoveredAmount) },
      unpaid: { count: unpaid.length, amount: sum(unpaid, (b) => b.hmoAmount) },
      paid: { count: paid.length, amount: sum(paid, (b) => b.hmoPaidAmount) },
      rejected: { count: rejected.length, amount: sum(rejected, (b) => b.hmoCoveredAmount) },
    };
  }, [claims]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims.filter((b) => {
      if (provider !== 'ALL' && b.hmoProvider !== provider) return false;
      if (filter === 'PENDING' && b.claimStatus !== 'PENDING') return false;
      if (filter === 'UNPAID' && !awaitingHmoPayment(b)) return false;
      if (filter === 'PAID' && !b.hmoPaid) return false;
      if (filter === 'REJECTED' && b.claimStatus !== 'REJECTED') return false;
      if (!q) return true;
      return (
        patientName(b.patientId).toLowerCase().includes(q) ||
        (b.hmoMemberNumber || '').toLowerCase().includes(q) ||
        (b.hmoProvider || '').toLowerCase().includes(q)
      );
    });
  }, [claims, filter, provider, search, patients]);

  const openEdit = (bill) => {
    setError('');
    setMessage('');
    setStatus(bill.claimStatus);
    setApprovedPercent(bill.hmoApprovedPercent ? String(bill.hmoApprovedPercent) : '');
    setNote(bill.claimNote || '');
    setEditing(bill);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveClaim = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/api/bills/${editing.id}/claim`, {
        claimStatus: status,
        approvedPercent: status === 'PARTIALLY_APPROVED' ? Number(approvedPercent) : null,
        note,
      });
      setEditing(null);
      setMessage('Claim updated.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the claim.');
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>HMO claims</h1>
        <p>Follow each claim from pending to approved, then mark it as paid when the HMO pays and print the receipt.</p>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}

      <div className="stat-grid">
        <div className="stat-card"><span className="stat-value">{stats.pending.count}</span><span className="stat-label">Pending · {formatNaira(stats.pending.amount)}</span></div>
        <div className="stat-card"><span className="stat-value">{stats.unpaid.count}</span><span className="stat-label">Awaiting HMO payment · {formatNaira(stats.unpaid.amount)}</span></div>
        <div className="stat-card"><span className="stat-value">{stats.paid.count}</span><span className="stat-label">Paid by HMOs · {formatNaira(stats.paid.amount)}</span></div>
        <div className="stat-card"><span className="stat-value">{stats.rejected.count}</span><span className="stat-label">Rejected · {formatNaira(stats.rejected.amount)}</span></div>
      </div>

      {editing && (
        <section className="panel prompt-card">
          <h2 className="panel-title">Update claim: {patientName(editing.patientId)}</h2>
          <p className="muted">
            {editing.hmoProvider} · member {editing.hmoMemberNumber} · covers {percentText(editing.hmoCoveragePercent)} ({formatNaira(editing.hmoCoveredAmount)})
          </p>
          <form className="form-grid" onSubmit={saveClaim}>
            <label className="field">
              <span>Claim status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="PARTIALLY_APPROVED">Partially approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
            {status === 'PARTIALLY_APPROVED' && (
              <label className="field">
                <span>Percentage the HMO approved (%)</span>
                <input type="number" min="0.1" max="99.9" step="0.1" value={approvedPercent} onChange={(e) => setApprovedPercent(e.target.value)} required />
                <small className="field-hint">Less than {percentText(editing.hmoCoveragePercent)}. The patient pays the rest.</small>
              </label>
            )}
            <label className="field field-full">
              <span>Note (optional)</span>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason from the HMO, reference number..." />
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Save claim</button>
              <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      <div className="audit-toolbar">
        <select className="cell-select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter claims">
          {FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <select className="cell-select" value={provider} onChange={(e) => setProvider(e.target.value)} aria-label="Filter by HMO">
          <option value="ALL">All HMOs</option>
          {providers.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <input type="search" placeholder="Search patient, HMO or member number..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="count">{visible.length} {visible.length === 1 ? 'claim' : 'claims'}</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>HMO</th>
              <th>Bill total</th>
              <th>Coverage</th>
              <th>Claim</th>
              <th>HMO payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && <tr><td className="empty" colSpan="7">No claims match.</td></tr>}
            {visible.map((bill) => (
              <tr key={bill.id}>
                <td>{patientName(bill.patientId)}</td>
                <td>
                  <div>{bill.hmoProvider}</div>
                  <div className="notif-meta">Member {bill.hmoMemberNumber}</div>
                </td>
                <td>{formatNaira(bill.total)}</td>
                <td>
                  <div>{percentText(bill.hmoCoveragePercent)}</div>
                  <div className="notif-meta">{formatNaira(bill.hmoCoveredAmount)}</div>
                </td>
                <td>
                  <span className={claimBadge(bill.claimStatus)}>{claimLabel(bill.claimStatus)}</span>
                  {bill.claimStatus === 'PARTIALLY_APPROVED' && (
                    <div className="notif-meta">Approved {percentText(bill.hmoApprovedPercent)} · {formatNaira(bill.hmoApprovedAmount)}</div>
                  )}
                  {bill.claimNote && <div className="notif-meta">{bill.claimNote}</div>}
                </td>
                <td>
                  {bill.hmoPaid ? (
                    <>
                      <span className="badge badge-completed">Paid {formatNaira(bill.hmoPaidAmount)}</span>
                      <div className="notif-meta">{formatDateTime(bill.hmoPaidAt)}</div>
                    </>
                  ) : bill.claimStatus === 'REJECTED' ? (
                    <span className="muted">Not payable</span>
                  ) : (
                    <span className="badge badge-hmo">Unpaid {formatNaira(bill.hmoAmount)}</span>
                  )}
                </td>
                <td>
                  <div className="row-actions">
                    {!bill.hmoPaid && (
                      <button type="button" className="btn btn-quiet btn-sm" onClick={() => openEdit(bill)}>
                        Update claim
                      </button>
                    )}
                    <HmoActions bill={bill} onChanged={load} onShowReceipt={setReceiptFor} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {receiptFor && <HmoReceipt billId={receiptFor} onClose={() => setReceiptFor(null)} />}
    </div>
  );
}

export default HmoClaims;