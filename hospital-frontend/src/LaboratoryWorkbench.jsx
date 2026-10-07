import { useEffect, useMemo, useState } from 'react';
import api from './api';
import Overlay from './Overlay';
import { formatDateTime } from './format';
import { FLAGS, flagLabel, statusLabel, suggestFlag } from './laboratoryHelpers';
import './laboratory-orders.css';
import './laboratory-results.css';

const FILTERS = [
  { key: 'OPEN', label: 'Open' },
  { key: 'PENDING', label: 'Waiting for specimen' },
  { key: 'COLLECTED', label: 'Specimen collected' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'ALL', label: 'All' },
];

function StatusPill({ status }) {
  return (
    <span className={`lab-order-status lab-order-status-${String(status || '').toLowerCase()}`}>
      {statusLabel(status)}
    </span>
  );
}

function matchesFilter(order, filter) {
  if (filter === 'ALL') return true;
  if (filter === 'OPEN') return order.status !== 'COMPLETED';
  return order.status === filter;
}

function buildDraft(order) {
  const draft = {};
  (order.items || []).forEach((item) => {
    draft[item.testId] = {
      value: item.resultValue || '',
      unit: item.resultUnit || '',
      flag: item.resultFlag || '',
      comment: item.resultComment || '',
      flagTouched: Boolean(item.resultFlag),
    };
  });
  return draft;
}

// The pop-up where results are typed in (or read, once the order is completed)
function ResultsDialog({ order, onClose, onChanged }) {
  const readOnly = order.status === 'COMPLETED';

  const [draft, setDraft] = useState(() => buildDraft(order));
  const [labNotes, setLabNotes] = useState(order.labNotes || '');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const change = (item, field, text) => {
    setDraft((current) => {
      const next = { ...current[item.testId], [field]: text };
      if (field === 'flag') next.flagTouched = true;
      if (field === 'value' && !next.flagTouched) {
        next.flag = suggestFlag(text, item.referenceRange);
      }
      return { ...current, [item.testId]: next };
    });
    setConfirming(false);
  };

  const payload = () => ({
    items: order.items.map((item) => ({
      testId: item.testId,
      resultValue: draft[item.testId].value,
      resultUnit: draft[item.testId].unit,
      resultFlag: draft[item.testId].flag,
      resultComment: draft[item.testId].comment,
    })),
    labNotes,
  });

  const saveDraft = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await api.put(`/api/laboratory/orders/${order.id}/results`, payload());
      onChanged(response.data);
      setMessage('Draft saved.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the results.');
    } finally {
      setSaving(false);
    }
  };

  const startComplete = () => {
    setError('');
    const missing = order.items
      .filter((item) => !draft[item.testId].value.trim())
      .map((item) => item.testName);
    if (missing.length > 0) {
      setError(`Enter a result for: ${missing.join(', ')}.`);
      return;
    }
    setConfirming(true);
  };

  const finish = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/api/laboratory/orders/${order.id}/results`, payload());
      const response = await api.put(`/api/laboratory/orders/${order.id}/complete`);
      onChanged(response.data, `Order completed for ${order.patientName}.`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not complete the order.');
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay
      title={`${readOnly ? 'Results' : 'Enter results'} · ${order.patientName}`}
      onClose={onClose}
      wide
    >
      <div className="lab-result-meta">
        <StatusPill status={order.status} />
        {order.priority === 'URGENT' && <span className="lab-order-priority">Urgent</span>}
        <span>Ordered by {order.doctorName}</span>
        <span>{formatDateTime(order.orderedAt)}</span>
      </div>

      {order.clinicalReason && (
        <p className="muted" style={{ marginTop: 0 }}>
          <strong>Clinical reason:</strong> {order.clinicalReason}
        </p>
      )}

      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {message && <p className="alert alert-success">{message}</p>}

      <div className="lab-result-list">
        {(order.items || []).map((item) => {
          const row = draft[item.testId];
          return (
            <div className="lab-result-card" key={item.testId}>
              <div className="lab-result-head">
                <strong>{item.testName}</strong>
                <span className="muted">
                  {item.category} · {item.specimenType}
                </span>
              </div>
              <div className="lab-result-range">
                Reference range: <strong>{item.referenceRange || 'not set'}</strong>
              </div>

              {readOnly ? (
                <div>
                  <div className="lab-result-value">
                    <strong>
                      {item.resultValue} {item.resultUnit}
                    </strong>
                    {item.resultFlag && (
                      <span className={`lab-flag lab-flag-${item.resultFlag.toLowerCase()}`}>
                        {flagLabel(item.resultFlag)}
                      </span>
                    )}
                  </div>
                  {item.resultComment && <p className="muted" style={{ margin: '6px 0 0' }}>{item.resultComment}</p>}
                </div>
              ) : (
                <div className="lab-result-grid">
                  <label className="field">
                    <span>Result</span>
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => change(item, 'value', e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Unit</span>
                    <input
                      type="text"
                      value={row.unit}
                      onChange={(e) => change(item, 'unit', e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Flag</span>
                    <select value={row.flag} onChange={(e) => change(item, 'flag', e.target.value)}>
                      <option value="">Normal (default)</option>
                      {FLAGS.map((flag) => (
                        <option key={flag.value} value={flag.value}>
                          {flag.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Comment (optional)</span>
                    <input
                      type="text"
                      value={row.comment}
                      onChange={(e) => change(item, 'comment', e.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <label className="field" style={{ marginTop: '14px' }}>
        <span>Laboratory notes (optional)</span>
        {readOnly ? (
          <p className="muted" style={{ margin: 0 }}>{order.labNotes || 'None.'}</p>
        ) : (
          <textarea rows="3" value={labNotes} onChange={(e) => setLabNotes(e.target.value)} />
        )}
      </label>

      {readOnly && order.completedAt && (
        <p className="muted">
          Completed {formatDateTime(order.completedAt)} by {order.completedBy}.
        </p>
      )}

      {!readOnly && !confirming && (
        <div className="lab-dialog-actions">
          <button type="button" className="btn btn-quiet" onClick={saveDraft} disabled={saving}>
            {saving ? 'Saving...' : 'Save draft'}
          </button>
          <button type="button" className="btn btn-primary" onClick={startComplete} disabled={saving}>
            Complete order
          </button>
        </div>
      )}

      {!readOnly && confirming && (
        <div className="lab-confirm-strip" role="alert">
          <span>Complete this order? The results are locked afterwards and cannot be edited.</span>
          <span className="row-actions">
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setConfirming(false)} disabled={saving}>
              Keep editing
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={finish} disabled={saving}>
              {saving ? 'Completing...' : 'Yes, complete'}
            </button>
          </span>
        </div>
      )}
    </Overlay>
  );
}

function LaboratoryWorkbench() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('OPEN');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [openId, setOpenId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/laboratory/orders');
      setOrders(response.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the laboratory orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const replaceOrder = (updated) => {
    setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
  };

  const collect = async (order) => {
    setBusyId(order.id);
    setError('');
    setMessage('');
    try {
      const response = await api.put(`/api/laboratory/orders/${order.id}/collect`);
      replaceOrder(response.data);
      setMessage(`Specimen recorded as collected for ${order.patientName}.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the order.');
    } finally {
      setBusyId('');
    }
  };

  const counts = useMemo(() => {
    const result = {};
    FILTERS.forEach((f) => {
      result[f.key] = orders.filter((order) => matchesFilter(order, f.key)).length;
    });
    return result;
  }, [orders]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (!matchesFilter(order, filter)) return false;
      if (!term) return true;
      const haystack = [
        order.patientName,
        order.doctorName,
        ...(order.items || []).map((item) => item.testName),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [orders, filter, search]);

  const working = orders.find((order) => order.id === openId);

  return (
    <div>
      <div className="page-head">
        <h1>Laboratory orders</h1>
        <p>Collect specimens, enter results and complete the orders sent by doctors.</p>
      </div>

      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {message && <p className="alert alert-success">{message}</p>}

      <div className="lab-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`lab-filter${filter === f.key ? ' is-active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="lab-filter-count">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <div className="lab-search">
        <input
          type="search"
          placeholder="Search by patient, doctor or test"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search laboratory orders"
        />
      </div>

      <div className="list-head">
        <h2>Orders</h2>
        <span className="count">
          {visible.length} {visible.length === 1 ? 'order' : 'orders'}
        </span>
        <button type="button" className="btn btn-quiet btn-sm" onClick={load}>
          Refresh
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ordered</th>
              <th>Patient</th>
              <th>Ordered by</th>
              <th>Tests</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="empty" colSpan="6">Loading orders...</td>
              </tr>
            )}
            {!loading && visible.length === 0 && (
              <tr>
                <td className="empty" colSpan="6">No laboratory orders to show.</td>
              </tr>
            )}
            {visible.map((order) => {
              const names = (order.items || []).map((item) => item.testName);
              const shown = names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2} more` : '');
              return (
                <tr key={order.id}>
                  <td>{formatDateTime(order.orderedAt)}</td>
                  <td>{order.patientName}</td>
                  <td>{order.doctorName}</td>
                  <td className="lab-tests-cell">{shown}</td>
                  <td>
                    <StatusPill status={order.status} />
                    {order.priority === 'URGENT' && (
                      <span className="lab-order-priority" style={{ marginLeft: '6px' }}>Urgent</span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      {order.status === 'PENDING' && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={busyId === order.id}
                          onClick={() => collect(order)}
                        >
                          {busyId === order.id ? 'Saving...' : 'Collect specimen'}
                        </button>
                      )}
                      {(order.status === 'COLLECTED' || order.status === 'IN_PROGRESS') && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setOpenId(order.id)}
                        >
                          Enter results
                        </button>
                      )}
                      {order.status === 'COMPLETED' && (
                        <button
                          type="button"
                          className="btn btn-quiet btn-sm"
                          onClick={() => setOpenId(order.id)}
                        >
                          View results
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {working && (
        <ResultsDialog
          key={working.id}
          order={working}
          onClose={() => setOpenId('')}
          onChanged={(updated, note) => {
            replaceOrder(updated);
            if (note) setMessage(note);
          }}
        />
      )}
    </div>
  );
}

export default LaboratoryWorkbench;