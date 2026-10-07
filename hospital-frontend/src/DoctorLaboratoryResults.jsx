import { useCallback, useEffect, useMemo, useState } from 'react';
import api from './api';
import Overlay from './Overlay';
import PatientTimeline from './PatientTimeline';
import './laboratory-orders.css';

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

function DoctorLaboratoryResults({ presetPatientId = '' }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [historyFor, setHistoryFor] = useState(null);

  const loadResults = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const response = await api.get('/api/laboratory/orders/mine');

      const data = Array.isArray(response.data)
        ? response.data
        : [];

      setOrders(
        data.filter(
          (order) => order.status === 'COMPLETED'
        )
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Unable to load your completed laboratory results.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  useEffect(() => {
    if (presetPatientId) {
      setSearch('');
    }
  }, [presetPatientId]);

  const criticalOrders = useMemo(
    () =>
      orders.filter((order) =>
        (order.items || []).some(
          (item) =>
            String(item.resultFlag || '').toUpperCase() ===
            'CRITICAL'
        )
      ),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      if (
        presetPatientId &&
        order.patientId !== presetPatientId
      ) {
        return false;
      }

      const hasCritical = (order.items || []).some(
        (item) =>
          String(item.resultFlag || '').toUpperCase() ===
          'CRITICAL'
      );

      if (filter === 'CRITICAL' && !hasCritical) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const patientName =
        order.patientName?.toLowerCase() || '';

      const clinicalReason =
        order.clinicalReason?.toLowerCase() || '';

      const orderId =
        order.id?.toLowerCase() || '';

      const testMatches = (order.items || []).some(
        (item) =>
          item.testName
            ?.toLowerCase()
            .includes(normalizedSearch) ||
          item.category
            ?.toLowerCase()
            .includes(normalizedSearch)
      );

      return (
        patientName.includes(normalizedSearch) ||
        clinicalReason.includes(normalizedSearch) ||
        orderId.includes(normalizedSearch) ||
        testMatches
      );
    });
  }, [orders, presetPatientId, search, filter]);

  if (loading) {
    return (
      <div>
        <div className="page-head">
          <h1>Completed laboratory results</h1>
          <p>
            Review completed laboratory results for your patients.
          </p>
        </div>

        <section className="panel lab-doctor-loading">
          <div className="lab-loading-spinner" />
          <p>Loading completed laboratory results...</p>
        </section>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Completed laboratory results</h1>

          <p>
            Review completed laboratory results for patients
            assigned to you.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => loadResults(true)}
          disabled={refreshing}
        >
          {refreshing
            ? 'Refreshing...'
            : 'Refresh results'}
        </button>
      </div>

      {presetPatientId && (
        <div className="lab-doctor-patient-filter">
          <div>
            <strong>Patient-specific results</strong>
            <span>
              Showing completed laboratory results for the
              selected patient.
            </span>
          </div>

          <button
            type="button"
            className="btn btn-quiet btn-sm"
            onClick={() => {
              setSearch('');
              window.dispatchEvent(
                new CustomEvent(
                  'medicore-clear-lab-patient-filter'
                )
              );
            }}
          >
            Clear patient filter
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {!error && (
        <>
          <div className="lab-doctor-summary">
            <div className="lab-doctor-summary-card">
              <span>Total completed</span>
              <strong>{orders.length}</strong>
            </div>

            <div className="lab-doctor-summary-card">
              <span>With critical results</span>
              <strong>{criticalOrders.length}</strong>
            </div>

            <div className="lab-doctor-summary-card">
              <span>Patients with results</span>
              <strong>
                {
                  new Set(
                    orders.map(
                      (order) => order.patientId
                    )
                  ).size
                }
              </strong>
            </div>
          </div>

          <section className="panel lab-doctor-results-panel">
            <div className="lab-doctor-toolbar">
              <div className="lab-doctor-filter-tabs">
                <button
                  type="button"
                  className={`lab-doctor-filter ${
                    filter === 'ALL'
                      ? 'is-active'
                      : ''
                  }`}
                  onClick={() =>
                    setFilter('ALL')
                  }
                >
                  All results
                  <span>
                    {orders.length}
                  </span>
                </button>

                <button
                  type="button"
                  className={`lab-doctor-filter ${
                    filter === 'CRITICAL'
                      ? 'is-active'
                      : ''
                  }`}
                  onClick={() =>
                    setFilter('CRITICAL')
                  }
                >
                  Critical
                  <span>
                    {criticalOrders.length}
                  </span>
                </button>
              </div>

              <input
                type="search"
                className="lab-doctor-search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search patient, test or order..."
                aria-label="Search laboratory results"
              />
            </div>

            {filteredOrders.length === 0 ? (
              <div className="lab-doctor-empty">
                <div className="lab-doctor-empty-icon">
                  🧪
                </div>

                <h2>
                  {orders.length === 0
                    ? 'No completed laboratory results'
                    : 'No matching results'}
                </h2>

                <p>
                  {orders.length === 0
                    ? 'Completed laboratory results for your patients will appear here.'
                    : 'Try changing the filter or search term.'}
                </p>
              </div>
            ) : (
              <div className="lab-doctor-result-list">
                {filteredOrders.map((order) => {
                  const items = Array.isArray(
                    order.items
                  )
                    ? order.items
                    : [];

                  const hasCriticalResult =
                    items.some(
                      (item) =>
                        String(
                          item.resultFlag || ''
                        ).toUpperCase() ===
                        'CRITICAL'
                    );

                  return (
                    <article
                      className={`lab-doctor-result-card ${
                        hasCriticalResult
                          ? 'lab-doctor-result-card-critical'
                          : ''
                      }`}
                      key={order.id}
                    >
                      <div className="lab-doctor-result-header">
                        <div>
                          <div className="lab-doctor-result-title">
                            <h2>
                              {order.patientName ||
                                'Patient'}
                            </h2>

                            {order.priority ===
                              'URGENT' && (
                              <span className="lab-order-priority">
                                Urgent
                              </span>
                            )}

                            {hasCriticalResult && (
                              <span className="lab-critical-badge">
                                ⚠ Critical
                              </span>
                            )}
                          </div>

                          <p>
                            Order #{order.id}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="btn btn-quiet btn-sm"
                          onClick={() =>
                            setHistoryFor({
                              id: order.patientId,
                              name:
                                order.patientName ||
                                'Patient',
                            })
                          }
                        >
                          View medical history
                        </button>
                      </div>

                      <div className="lab-doctor-result-meta">
                        <div>
                          <span>Doctor</span>
                          <strong>
                            {order.doctorName ||
                              'Not available'}
                          </strong>
                        </div>

                        <div>
                          <span>Date ordered</span>
                          <strong>
                            {formatDate(
                              order.orderedAt
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>Specimen collected</span>
                          <strong>
                            {formatDateTime(
                              order.collectedAt
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>Completed</span>
                          <strong>
                            {formatDateTime(
                              order.completedAt
                            )}
                          </strong>
                        </div>
                      </div>

                      {order.clinicalReason && (
                        <div className="lab-doctor-clinical-reason">
                          <strong>
                            Clinical reason
                          </strong>

                          <p>
                            {order.clinicalReason}
                          </p>
                        </div>
                      )}

                      {hasCriticalResult && (
                        <div
                          className="lab-doctor-critical-warning"
                          role="alert"
                        >
                          <span>⚠</span>

                          <div>
                            <strong>
                              Critical result requires
                              attention
                            </strong>

                            <p>
                              One or more laboratory
                              results in this order have
                              been flagged as critical.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="table-wrap">
                        <table>
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
                            {items.map(
                              (item, index) => {
                                const flag =
                                  getFlagConfig(
                                    item.resultFlag
                                  );

                                const isCritical =
                                  String(
                                    item.resultFlag ||
                                      ''
                                  ).toUpperCase() ===
                                  'CRITICAL';

                                return (
                                  <tr
                                    key={
                                      item.testId ||
                                      `${order.id}-${index}`
                                    }
                                    className={
                                      isCritical
                                        ? 'lab-doctor-critical-row'
                                        : ''
                                    }
                                  >
                                    <td>
                                      <strong>
                                        {item.testName ||
                                          'Laboratory test'}
                                      </strong>

                                      {item.category && (
                                        <div className="muted">
                                          {
                                            item.category
                                          }
                                        </div>
                                      )}

                                      {item.specimenType && (
                                        <div className="muted">
                                          Specimen:{' '}
                                          {
                                            item.specimenType
                                          }
                                        </div>
                                      )}
                                    </td>

                                    <td>
                                      <strong>
                                        {item.resultValue ||
                                          '—'}
                                      </strong>
                                    </td>

                                    <td>
                                      {item.resultUnit ||
                                        '—'}
                                    </td>

                                    <td>
                                      {flag ? (
                                        <span
                                          className={`lab-flag ${flag.className}`}
                                        >
                                          {
                                            flag.label
                                          }
                                        </span>
                                      ) : (
                                        '—'
                                      )}
                                    </td>

                                    <td>
                                      {item.referenceRange ||
                                        '—'}
                                    </td>

                                    <td>
                                      {item.resultComment ||
                                        '—'}
                                    </td>
                                  </tr>
                                );
                              }
                            )}
                          </tbody>
                        </table>
                      </div>

                      {order.labNotes && (
                        <div className="lab-doctor-lab-notes">
                          <strong>
                            Laboratory notes
                          </strong>

                          <p>
                            {order.labNotes}
                          </p>
                        </div>
                      )}

                      <div className="lab-doctor-result-footer">
                        <span>
                          Completed by:{' '}
                          <strong>
                            {order.completedBy ||
                              'Laboratory staff'}
                          </strong>
                        </span>

                        <span>
                          Completed{' '}
                          {formatDateTime(
                            order.completedAt
                          )}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {historyFor && (
        <Overlay
          title={`Medical history: ${historyFor.name}`}
          wide
          onClose={() =>
            setHistoryFor(null)
          }
        >
          <PatientTimeline
            patientId={historyFor.id}
          />
        </Overlay>
      )}
    </div>
  );
}

export default DoctorLaboratoryResults;