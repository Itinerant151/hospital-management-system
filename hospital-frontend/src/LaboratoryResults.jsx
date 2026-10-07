import { useEffect, useMemo, useState } from 'react';
import api from './api';
import Overlay from './Overlay';
import { useConfirm } from './ConfirmDialog';
import { formatDateTime } from './format';
import './laboratory-results.css';

const OPEN_STATUSES = ['PENDING', 'COLLECTED', 'IN_PROGRESS'];

const STATUS_LABELS = {
  PENDING: 'Waiting for specimen',
  COLLECTED: 'Specimen collected',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
};

const FLAGS = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'ABNORMAL', label: 'Abnormal' },
];

const FILTERS = [
  { key: 'OPEN', label: 'Open work', test: (o) => OPEN_STATUSES.includes(o.status) },
  { key: 'PENDING', label: 'Waiting for specimen', test: (o) => o.status === 'PENDING' },
  { key: 'COMPLETED', label: 'Completed', test: (o) => o.status === 'COMPLETED' },
  { key: 'ALL', label: 'All', test: () => true },
];

function flagLabel(flag) {
  return FLAGS.find((f) => f.value === flag)?.label || '';
}

/* ---------- Results form (inside a pop-up) ---------- */

function ResultsForm({ order, onSaved, onUpdate, onClose }) {
  const confirm = useConfirm();

  const [rows, setRows] = useState(() =>
    order.items.map((item) => ({
      testId: item.testId,
      resultValue: item.resultValue || '',
      resultUnit: item.resultUnit || '',
      resultFlag: item.resultFlag || 'NORMAL',
      resultComment: item.resultComment || '',
    }))
  );
  const [labNotes, setLabNotes] = useState(order.labNotes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateRow = (index, field, value) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const submit = async (complete) => {
    setError('');

    if (complete) {
      const missing = order.items.find((item, i) => !rows[i].resultValue.trim());

      if (missing) {
        setError(`Enter a result for ${missing.testName} before completing the order.`);
        return;
      }

      const ok = await confirm(
        'Once completed, the results are locked and the patient can see them. You will not be able to change them.',
        {
          title: 'Complete order',
          confirmLabel: 'Yes, complete it',
          cancelLabel: 'Keep editing',
          danger: false,
        }
      );

      if (!ok) return;
    }

    setSaving(true);

    try {
      const saved = await api.put(`/api/laboratory/orders/${order.id}/results`, {
        items: rows,
        labNotes,
      });

      if (!complete) {
        onSaved(saved.data, 'Results saved. You can continue later.');
        return;
      }

      // The results are saved at this point, so show them even if completing fails
      onUpdate(saved.data);

      try {
        const done = await api.put(`/api/laboratory/orders/${order.id}/complete`);
        onSaved(done.data, 'Order completed. The patient can now see the results.');
      } catch (err) {
        setError(err.response?.data?.message || 'The results were saved, but the order could not be completed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the results.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lab-results-form">
      <p className="muted">
        {order.patientName} · ordered by Dr. {order.doctorName}
      </p>

      {order.items.map((item, index) => (
        <div className="lab-result-entry" key={item.testId}>
          <div className="lab-result-entry-head">
            <strong>{item.testName}</strong>
            <span className="muted">
              {item.specimenType ? `${item.specimenType} · ` : ''}
              Reference: {item.referenceRange || 'not set'}
            </span>
          </div>

          <div className="lab-result-entry-fields">
            <label className="field">
              <span>Result</span>
              <input
                type="text"
                value={rows[index].resultValue}
                maxLength={200}
                onChange={(e) => updateRow(index, 'resultValue', e.target.value)}
                disabled={saving}
              />
            </label>

            <label className="field">
              <span>Unit</span>
              <input
                type="text"
                value={rows[index].resultUnit}
                maxLength={50}
                onChange={(e) => updateRow(index, 'resultUnit', e.target.value)}
                disabled={saving}
              />
            </label>

            <label className="field">
              <span>Flag</span>
              <select
                value={rows[index].resultFlag}
                onChange={(e) => updateRow(index, 'resultFlag', e.target.value)}
                disabled={saving}
              >
                {FLAGS.map((flag) => (
                  <option key={flag.value} value={flag.value}>
                    {flag.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Comment (optional)</span>
            <input
              type="text"
              value={rows[index].resultComment}
              maxLength={500}
              onChange={(e) => updateRow(index, 'resultComment', e.target.value)}
              disabled={saving}
            />
          </label>
        </div>
      ))}

      <label className="field">
        <span>Lab notes (optional)</span>
        <textarea
          rows={3}
          value={labNotes}
          maxLength={1000}
          onChange={(e) => setLabNotes(e.target.value)}
          disabled={saving}
        />
      </label>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-quiet" onClick={onClose} disabled={saving}>
          Close
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => submit(false)}
          disabled={saving}
        >
          Save results
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => submit(true)}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save and complete'}
        </button>
      </div>
    </div>
  );
}

/* ---------- The work queue ---------- */

function LaboratoryResults() {
  const canWork = localStorage.getItem('role') === 'LAB_STAFF';

  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('OPEN');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [resultsFor, setResultsFor] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);

    try {
      const response = await api.get('/api/laboratory/orders');
      setOrders(response.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the laboratory work queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => setMessage(''), 4500);
    return () => window.clearTimeout(timer);
  }, [message]);

  // Update one order in the list without closing anything
  const updateOrder = (updated) => {
    setOrders((current) => current.map((o) => (o.id === updated.id ? updated : o)));
  };

  // Update one order, close the results pop-up and show a message
  const replaceOrder = (updated, text) => {
    updateOrder(updated);
    setResultsFor(null);
    setError('');
    if (text) setMessage(text);
  };

  const collectSpecimen = async (order) => {
    setBusyId(order.id);

    try {
      const response = await api.put(`/api/laboratory/orders/${order.id}/collect`);
      replaceOrder(response.data, `Specimen collected for ${order.patientName}.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the order.');
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(() => {
    const result = {};
    FILTERS.forEach((f) => {
      result[f.key] = orders.filter(f.test).length;
    });
    return result;
  }, [orders]);

  const visible = useMemo(() => {
    const active = FILTERS.find((f) => f.key === filter) || FILTERS[0];
    const term = search.trim().toLowerCase();

    return orders.filter(active.test).filter((order) => {
      if (!term) return true;

      const haystack = [
        order.patientName,
        order.doctorName,
        ...order.items.map((item) => item.testName),
      ];

      return haystack.some((value) => String(value || '').toLowerCase().includes(term));
    });
  }, [orders, filter, search]);

  return (
    <div>
      <div className="page-head">
        <h1>Laboratory work queue</h1>
        <p>Collect specimens, enter results and complete orders.</p>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      <div className="lab-queue-toolbar">
        <div className="lab-filter-tabs" role="tablist" aria-label="Order filter">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              className={`lab-filter-tab${filter === f.key ? ' is-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label} <span className="lab-filter-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>

        <input
          type="search"
          className="lab-queue-search"
          placeholder="Search patient, doctor or test"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button type="button" className="btn btn-quiet btn-sm" onClick={load}>
          Refresh
        </button>
      </div>

      {loading && <p className="muted">Loading orders...</p>}

      {!loading && visible.length === 0 && (
        <p className="muted">No laboratory orders to show here.</p>
      )}

      <div className="lab-queue-cards">
        {visible.map((order) => (
          <article className="panel lab-queue-card" key={order.id}>
            <div className="lab-queue-card-head">
              <div>
                <h3>{order.patientName}</h3>
                <span className="muted">
                  Dr. {order.doctorName} · ordered {formatDateTime(order.orderedAt)}
                </span>
              </div>

              <div className="lab-queue-card-badges">
                {order.priority === 'URGENT' && <span className="lab-order-priority">Urgent</span>}
                <span
                  className={`lab-order-status lab-order-status-${String(order.status || '').toLowerCase()}`}
                >
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
            </div>

            {order.clinicalReason && (
              <p className="lab-queue-note">
                <strong>Clinical reason:</strong> {order.clinicalReason}
              </p>
            )}

            {order.notes && (
              <p className="lab-queue-note">
                <strong>Doctor's notes:</strong> {order.notes}
              </p>
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Specimen</th>
                    <th>Reference range</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.testId}>
                      <td>
                        {item.testName}
                        {item.category && <div className="muted">{item.category}</div>}
                      </td>
                      <td>{item.specimenType || '—'}</td>
                      <td>{item.referenceRange || '—'}</td>
                      <td>
                        {item.resultValue ? (
                          <>
                            <strong>
                              {item.resultValue}
                              {item.resultUnit ? ` ${item.resultUnit}` : ''}
                            </strong>{' '}
                            {item.resultFlag && (
                              <span className={`lab-flag lab-flag-${item.resultFlag.toLowerCase()}`}>
                                {flagLabel(item.resultFlag)}
                              </span>
                            )}
                            {item.resultComment && (
                              <div className="muted">{item.resultComment}</div>
                            )}
                          </>
                        ) : (
                          <span className="muted">Not entered</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {order.labNotes && (
              <p className="lab-queue-note">
                <strong>Lab notes:</strong> {order.labNotes}
              </p>
            )}

            {order.collectedAt && (
              <p className="muted lab-queue-meta">
                Specimen collected {formatDateTime(order.collectedAt)}
                {order.collectedBy ? ` by ${order.collectedBy}` : ''}
              </p>
            )}

            {order.completedAt && (
              <p className="muted lab-queue-meta">
                Completed {formatDateTime(order.completedAt)}
                {order.completedBy ? ` by ${order.completedBy}` : ''}
              </p>
            )}

            {canWork && OPEN_STATUSES.includes(order.status) && (
              <div className="lab-queue-actions">
                {order.status === 'PENDING' ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => collectSpecimen(order)}
                    disabled={busyId === order.id}
                  >
                    {busyId === order.id ? 'Saving...' : 'Mark specimen collected'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setResultsFor(order)}
                  >
                    {order.status === 'IN_PROGRESS' ? 'Continue results' : 'Enter results'}
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      {resultsFor && (
        <Overlay title="Enter laboratory results" wide onClose={() => setResultsFor(null)}>
          <ResultsForm
            order={resultsFor}
            onSaved={replaceOrder}
            onUpdate={updateOrder}
            onClose={() => {
              setResultsFor(null);
              load();
            }}
          />
        </Overlay>
      )}
    </div>
  );
}

export default LaboratoryResults;