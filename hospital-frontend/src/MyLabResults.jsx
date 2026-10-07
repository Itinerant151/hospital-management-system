import { useCallback, useEffect, useState } from 'react';
import api from './api';
import './laboratory-results.css';

const STATUS_CONFIG = {
  PENDING: {
    label: 'Waiting for specimen',
    className: 'lab-order-status-pending',
  },
  COLLECTED: {
    label: 'Collected',
    className: 'lab-order-status-collected',
  },
  IN_PROGRESS: {
    label: 'In progress',
    className: 'lab-order-status-in_progress',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'lab-order-status-completed',
  },
};

const FLAG_CONFIG = {
  NORMAL: {
    label: 'Normal',
    className: 'lab-flag-normal',
  },
  LOW: {
    label: 'Low',
    className: 'lab-flag-low',
  },
  HIGH: {
    label: 'High',
    className: 'lab-flag-high',
  },
  CRITICAL: {
    label: 'Critical',
    className: 'lab-flag-critical',
  },
  ABNORMAL: {
    label: 'Abnormal',
    className: 'lab-flag-abnormal',
  },
};

function formatDateTime(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString([], {
    dateStyle: 'medium',
  });
}

function getStatusConfig(status) {
  return (
    STATUS_CONFIG[status] || {
      label: status || 'Unknown',
      className: '',
    }
  );
}

function getFlagConfig(flag) {
  if (!flag) {
    return null;
  }

  return (
    FLAG_CONFIG[String(flag).toUpperCase()] || {
      label: String(flag).replaceAll('_', ' '),
      className: 'lab-flag-abnormal',
    }
  );
}

function MyLabResults() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadResults = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const response = await api.get('/laboratory/orders/my-results');

      const data = Array.isArray(response.data) ? response.data : [];

      setOrders(data);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        'Unable to load your laboratory results. Please try again.';

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const totalOrders = orders.length;

  const completedOrders = orders.filter(
    (order) => order.status === 'COMPLETED'
  ).length;

  const pendingOrders = orders.filter(
    (order) => order.status === 'PENDING'
  ).length;

  const processingOrders = orders.filter(
    (order) =>
      order.status === 'COLLECTED' ||
      order.status === 'IN_PROGRESS'
  ).length;

  if (loading) {
    return (
      <div className="lab-patient-page">
        <div className="page-head">
          <h1>My lab results</h1>
          <p>View your laboratory orders and completed test results.</p>
        </div>

        <div className="card lab-patient-loading">
          <div className="lab-loading-spinner" />
          <p>Loading your laboratory results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lab-patient-page">
      <div className="page-head lab-patient-page-head">
        <div>
          <h1>My lab results</h1>
          <p>
            View your laboratory orders, test progress and completed results.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => loadResults(true)}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh results'}
        </button>
      </div>

      {error && (
        <div className="lab-patient-error" role="alert">
          <div>
            <strong>Unable to load laboratory results</strong>
            <p>{error}</p>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => loadResults()}
          >
            Try again
          </button>
        </div>
      )}

      {!error && (
        <>
          <div className="lab-patient-summary">
            <div className="lab-summary-card">
              <div className="lab-summary-icon">🧪</div>
              <div>
                <span>Total orders</span>
                <strong>{totalOrders}</strong>
              </div>
            </div>

            <div className="lab-summary-card">
              <div className="lab-summary-icon">⏳</div>
              <div>
                <span>Waiting</span>
                <strong>{pendingOrders}</strong>
              </div>
            </div>

            <div className="lab-summary-card">
              <div className="lab-summary-icon">🔬</div>
              <div>
                <span>Processing</span>
                <strong>{processingOrders}</strong>
              </div>
            </div>

            <div className="lab-summary-card">
              <div className="lab-summary-icon">✓</div>
              <div>
                <span>Completed</span>
                <strong>{completedOrders}</strong>
              </div>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="card lab-empty-state">
              <div className="lab-empty-icon">🧪</div>
              <h2>No laboratory orders yet</h2>
              <p>
                You do not have any laboratory tests ordered at the moment.
                When a doctor orders a test for you, it will appear here.
              </p>
            </div>
          ) : (
            <div className="lab-patient-orders">
              {orders.map((order) => {
                const status = getStatusConfig(order.status);
                const isCompleted = order.status === 'COMPLETED';
                const items = Array.isArray(order.items) ? order.items : [];

                const hasCriticalResult = items.some(
                  (item) =>
                    String(item.resultFlag || '').toUpperCase() === 'CRITICAL'
                );

                return (
                  <article
                    className={`card lab-patient-order-card ${
                      isCompleted ? 'lab-patient-order-completed' : ''
                    } ${
                      hasCriticalResult
                        ? 'lab-patient-order-has-critical'
                        : ''
                    }`}
                    key={order.id}
                  >
                    <div className="lab-patient-order-header">
                      <div>
                        <div className="lab-patient-order-title-row">
                          <h2>Laboratory order</h2>

                          {order.priority === 'URGENT' && (
                            <span className="lab-priority-badge">
                              Urgent
                            </span>
                          )}
                        </div>

                        <p className="lab-patient-order-id">
                          Order #{order.id || 'N/A'}
                        </p>
                      </div>

                      <span
                        className={`lab-order-status ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="lab-patient-order-meta">
                      <div>
                        <span>Doctor</span>
                        <strong>
                          {order.doctorName || 'Not available'}
                        </strong>
                      </div>

                      <div>
                        <span>Date ordered</span>
                        <strong>{formatDate(order.orderedAt)}</strong>
                      </div>

                      {order.collectedAt && (
                        <div>
                          <span>Specimen collected</span>
                          <strong>{formatDateTime(order.collectedAt)}</strong>
                        </div>
                      )}

                      {order.completedAt && (
                        <div>
                          <span>Completed</span>
                          <strong>{formatDateTime(order.completedAt)}</strong>
                        </div>
                      )}
                    </div>

                    {order.clinicalReason && (
                      <div className="lab-patient-clinical-reason">
                        <span>Clinical reason</span>
                        <p>{order.clinicalReason}</p>
                      </div>
                    )}

                    {hasCriticalResult && (
                      <div
                        className="lab-critical-result-warning"
                        role="alert"
                      >
                        <div className="lab-critical-warning-icon">
                          ⚠
                        </div>

                        <div>
                          <strong>Critical result</strong>
                          <p>
                            A laboratory result in this order has been flagged
                            as critical. Please contact your doctor for
                            further explanation.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="lab-patient-tests">
                      <div className="lab-patient-section-title">
                        <h3>Tests ordered</h3>
                        <span>
                          {items.length}{' '}
                          {items.length === 1 ? 'test' : 'tests'}
                        </span>
                      </div>

                      {!isCompleted ? (
                        <div className="lab-patient-pending-message">
                          <div className="lab-pending-icon">⏳</div>

                          <div>
                            <strong>
                              Your laboratory results are not ready yet.
                            </strong>

                            <p>
                              {order.status === 'PENDING'
                                ? 'The laboratory is waiting for your specimen to be collected.'
                                : order.status === 'COLLECTED'
                                  ? 'Your specimen has been collected and is waiting to be processed.'
                                  : 'The laboratory is currently processing your tests.'}
                            </p>

                            <span>
                              Your results will appear here once the laboratory
                              completes the order.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="lab-results-table-wrapper">
                          <table className="lab-results-table">
                            <thead>
                              <tr>
                                <th>Test</th>
                                <th>Result</th>
                                <th>Unit</th>
                                <th>Flag</th>
                                <th>Reference range</th>
                                <th>Comments</th>
                              </tr>
                            </thead>

                            <tbody>
                              {items.map((item, index) => {
                                const flag = getFlagConfig(item.resultFlag);

                                return (
                                  <tr
                                    key={
                                      item.testId ||
                                      `${order.id}-result-${index}`
                                    }
                                    className={
                                      String(item.resultFlag || '').toUpperCase() ===
                                      'CRITICAL'
                                        ? 'lab-critical-result-row'
                                        : ''
                                    }
                                  >
                                    <td>
                                      <div className="lab-result-test-name">
                                        <strong>
                                          {item.testName || 'Laboratory test'}
                                        </strong>

                                        {item.category && (
                                          <span>{item.category}</span>
                                        )}
                                      </div>
                                    </td>

                                    <td>
                                      <strong className="lab-result-value">
                                        {item.resultValue || '—'}
                                      </strong>
                                    </td>

                                    <td>{item.resultUnit || '—'}</td>

                                    <td>
                                      {flag ? (
                                        <span
                                          className={`lab-flag ${flag.className}`}
                                        >
                                          {flag.label}
                                        </span>
                                      ) : (
                                        '—'
                                      )}
                                    </td>

                                    <td>
                                      {item.referenceRange || '—'}
                                    </td>

                                    <td>
                                      <span className="lab-result-comment">
                                        {item.resultComment || '—'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {isCompleted && order.labNotes && (
                      <div className="lab-patient-lab-notes">
                        <div>
                          <strong>Laboratory notes</strong>
                          <p>{order.labNotes}</p>
                        </div>
                      </div>
                    )}

                    {isCompleted && (
                      <div className="lab-patient-result-footer">
                        <span>
                          Results completed on{' '}
                          <strong>{formatDateTime(order.completedAt)}</strong>
                        </span>

                        <span>
                          These results are read-only and cannot be edited from
                          the patient portal.
                        </span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MyLabResults;