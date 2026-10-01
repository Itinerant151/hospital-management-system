import { useState, useEffect } from 'react';
import api from './api';
import { useConfirm } from './ConfirmDialog';
import { formatNaira } from './currency';

function Billing() {
  const confirm = useConfirm();
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [items, setItems] = useState([{ description: '', amount: '' }]);
  const [paymentInfo, setPaymentInfo] = useState({});
  const role = localStorage.getItem('role');

  useEffect(() => {
    fetchBills();
    fetchPatients();
  }, []);

  const fetchBills = async () => {
    const response = await api.get('/api/bills');
    setBills(response.data);
  };

  const fetchPatients = async () => {
    const response = await api.get('/patients');
    setPatients(response.data);
  };

  const getPatientName = (id) => {
    const patient = patients.find((p) => p.id === id);
    return patient ? patient.name : 'Unknown';
  };

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const addItemRow = () => setItems((prev) => [...prev, { description: '', amount: '' }]);
  const removeItemRow = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  const createBill = async (e) => {
    e.preventDefault();
    const cleanItems = items
      .filter((it) => it.description && it.amount !== '')
      .map((it) => ({ description: it.description, amount: Number(it.amount) }));
    if (!patientId || cleanItems.length === 0) return;

    await api.post('/api/bills', { patientId, items: cleanItems });
    setPatientId('');
    setItems([{ description: '', amount: '' }]);
    fetchBills();
  };

  const markPaid = async (id) => {
  await api.post(`/api/bills/${id}/pay`, {
    paymentMethod: 'PATIENT',
  });

  fetchBills();
};

const payWithHmo = async (bill) => {
  const info = paymentInfo[bill.id] || {};

  if (
    !info.hmoProvider ||
    !info.hmoMemberNumber ||
    !info.hmoCoveredAmount
  ) {
    return;
  }

  await api.post(`/api/bills/${bill.id}/pay`, {
    paymentMethod: 'HMO',
    hmoProvider: info.hmoProvider,
    hmoMemberNumber: info.hmoMemberNumber,
    hmoCoveredAmount: Number(
      info.hmoCoveredAmount
    ),
  });

  setPaymentInfo((previous) => {
    const next = { ...previous };

    delete next[bill.id];

    return next;
  });

  fetchBills();
};

const updatePaymentInfo = (
  billId,
  field,
  value
) => {
  setPaymentInfo((previous) => ({
    ...previous,

    [billId]: {
      ...(previous[billId] || {}),
      [field]: value,
    },
  }));
};

  const deleteBill = async (id) => {
    if (!(await confirm('Delete this bill? This cannot be undone.'))) return;
    await api.delete(`/api/bills/${id}`);
    fetchBills();
  };

  return (
    <div>
      <div className="page-head">
        <h1>Billing</h1>
        <p>Create and manage patient bills.</p>
      </div>

      <section className="panel">
        <h2 className="panel-title">Create a bill</h2>
        <form className="form-grid" onSubmit={createBill}>
          <label className="field">
            <span>Patient</span>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
              <option value="">Select a patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <span>Line items</span>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(i, 'description', e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount (₦)"
                  value={item.amount}
                  onChange={(e) => updateItem(i, 'amount', e.target.value)}
                  style={{ maxWidth: '140px' }}
                />
                {items.length > 1 && (
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => removeItemRow(i)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-quiet btn-sm" onClick={addItemRow}>
              + Add line item
            </button>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Create bill
            </button>
          </div>
        </form>
      </section>

      <div className="list-head">
        <h2>All bills</h2>
        <span className="count">
          {bills.length} {bills.length === 1 ? 'bill' : 'bills'}
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.length === 0 && (
              <tr>
                <td className="empty" colSpan="5">
                  No bills yet.
                </td>
              </tr>
            )}
            {bills.map((bill) => (
              <tr key={bill.id}>
                <td>{getPatientName(bill.patientId)}</td>
                <td>
                  {(bill.items || []).map((it, i) => (
                    <div key={i}>
                      {it.description} — {formatNaira(it.amount)}
                    </div>
                  ))}
                </td>
                <td>{formatNaira(bill.total)}</td>
                <td>
                  <span className={`badge badge-${bill.status === 'PAID' ? 'completed' : 'scheduled'}`}>
                    {bill.status}
                  </span>
                  {bill.transactionId && <div className="notif-meta">{bill.transactionId}</div>}
                </td>
                <td>
                  <div className="row-actions">
                    {bill.status !== 'PAID' && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => markPaid(bill.id)}>
                        Mark paid
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
    </div>
  );
}

export default Billing;