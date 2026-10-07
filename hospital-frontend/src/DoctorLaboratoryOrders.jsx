import { useEffect, useMemo, useState } from 'react';
import api from './api';
import { formatNaira } from './currency';
import './laboratory-orders.css';

const EMPTY_FORM = {
  patientId: '',
  clinicalReason: '',
  notes: '',
  priority: 'NORMAL',
  selectedTests: [],
};

function DoctorLaboratoryOrders({ presetPatientId }) {
  const ownDoctorId = localStorage.getItem('doctorId');

  const [patients, setPatients] = useState([]);
  const [tests, setTests] = useState([]);
  const [orders, setOrders] = useState([]);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    patientId: presetPatientId || '',
  });

  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);

    try {
      const [patientsResponse, testsResponse, ordersResponse] =
        await Promise.all([
          ownDoctorId
            ? api.get(`/patients/by-doctor/${ownDoctorId}`)
            : Promise.resolve({ data: [] }),

          api.get('/api/laboratory/tests/active'),

          api.get('/api/laboratory/orders/mine'),
        ]);

      setPatients(patientsResponse.data || []);
      setTests(testsResponse.data || []);
      setOrders(ordersResponse.data || []);

      setError('');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not load the laboratory ordering page.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (presetPatientId) {
      setForm((current) => ({
        ...current,
        patientId: presetPatientId,
      }));
    }
  }, [presetPatientId]);

  useEffect(() => {
    if (!message && !error) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setMessage('');
      setError('');
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [message, error]);

  const filteredTests = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return tests;
    }

    return tests.filter((test) =>
      [
        test.testName,
        test.category,
        test.specimenType,
        test.referenceRange,
      ].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(term)
      )
    );
  }, [tests, search]);

  const selectedTestObjects = useMemo(
    () =>
      tests.filter((test) =>
        form.selectedTests.includes(test.id)
      ),
    [tests, form.selectedTests]
  );

  const selectedTotal = useMemo(
    () =>
      selectedTestObjects.reduce(
        (total, test) =>
          total + Number(test.price || 0),
        0
      ),
    [selectedTestObjects]
  );

  const selectedPatient = patients.find(
    (patient) => patient.id === form.patientId
  );

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleTest = (testId) => {
    setForm((current) => {
      const alreadySelected =
        current.selectedTests.includes(testId);

      return {
        ...current,
        selectedTests: alreadySelected
          ? current.selectedTests.filter(
              (id) => id !== testId
            )
          : [...current.selectedTests, testId],
      };
    });
  };

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      patientId: presetPatientId || '',
    });

    setSearch('');
  };

  const submit = async (event) => {
    event.preventDefault();

    setMessage('');
    setError('');

    if (!form.patientId) {
      setError('Choose a patient.');
      return;
    }

    if (form.selectedTests.length === 0) {
      setError(
        'Select at least one laboratory test.'
      );
      return;
    }

    setSaving(true);

    try {
      await api.post('/api/laboratory/orders', {
        patientId: form.patientId,

        clinicalReason:
          form.clinicalReason.trim(),

        notes: form.notes.trim(),

        priority: form.priority,

        items: form.selectedTests.map(
          (testId) => ({
            testId,
          })
        ),
      });

      setMessage(
        `Laboratory order created for ${
          selectedPatient?.name || 'the patient'
        }.`
      );

      resetForm();

      const response = await api.get(
        '/api/laboratory/orders/mine'
      );

      setOrders(response.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not create the laboratory order.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-head">
          <h1>Laboratory orders</h1>
          <p>
            Order laboratory tests for your assigned
            patients.
          </p>
        </div>

        <p className="muted">
          Loading laboratory ordering page...
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <h1>Laboratory orders</h1>

        <p>
          Order laboratory tests for patients assigned
          to you. Completed results will appear here in
          a later laboratory phase.
        </p>
      </div>

      {(message || error) && (
        <div
          className={`lab-order-toast ${
            error
              ? 'lab-order-toast-error'
              : 'lab-order-toast-success'
          }`}
          role="alert"
        >
          <span>{error || message}</span>

          <button
            type="button"
            className="lab-order-toast-close"
            onClick={() => {
              setMessage('');
              setError('');
            }}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      <section className="panel laboratory-order-panel">
        <div className="list-head">
          <div>
            <h2 className="panel-title">
              New laboratory order
            </h2>

            <span className="muted">
              Select one or more tests for your patient.
            </span>
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="laboratory-order-top">
            <label className="field">
              <span>Patient *</span>

              <select
                value={form.patientId}
                onChange={(event) =>
                  updateForm(
                    'patientId',
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Select a patient
                </option>

                {patients.map((patient) => (
                  <option
                    key={patient.id}
                    value={patient.id}
                  >
                    {patient.name}
                    {patient.emergencyPatient
                      ? ' (emergency)'
                      : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Priority</span>

              <select
                value={form.priority}
                onChange={(event) =>
                  updateForm(
                    'priority',
                    event.target.value
                  )
                }
              >
                <option value="NORMAL">
                  Normal
                </option>

                <option value="URGENT">
                  Urgent
                </option>
              </select>
            </label>
          </div>

          <div className="laboratory-order-section">
            <div className="list-head">
              <div>
                <h3>Laboratory tests</h3>

                <span className="count">
                  {form.selectedTests.length}{' '}
                  selected
                </span>
              </div>
            </div>

            <div className="laboratory-order-search">
              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search test name, category or specimen..."
                aria-label="Search laboratory tests"
              />
            </div>

            {filteredTests.length === 0 ? (
              <p className="muted">
                No active laboratory tests match your
                search.
              </p>
            ) : (
              <div className="laboratory-test-picker">
                {filteredTests.map((test) => {
                  const selected =
                    form.selectedTests.includes(
                      test.id
                    );

                  return (
                    <label
                      key={test.id}
                      className={`laboratory-test-option ${
                        selected
                          ? 'laboratory-test-option-selected'
                          : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          toggleTest(test.id)
                        }
                      />

                      <div className="laboratory-test-option-main">
                        <strong>
                          {test.testName}
                        </strong>

                        <span>
                          {test.category} ·{' '}
                          {test.specimenType}
                        </span>

                        {test.referenceRange && (
                          <small>
                            Reference:{' '}
                            {test.referenceRange}
                          </small>
                        )}
                      </div>

                      <strong className="laboratory-test-price">
                        {formatNaira(test.price)}
                      </strong>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="laboratory-order-selected">
            <div>
              <strong>
                Selected tests
              </strong>

              <span>
                {selectedTestObjects.length === 0
                  ? 'None selected'
                  : selectedTestObjects
                      .map(
                        (test) => test.testName
                      )
                      .join(', ')}
              </span>
            </div>

            <div>
              <strong>Total</strong>

              <span>
                {formatNaira(selectedTotal)}
              </span>
            </div>
          </div>

          <div className="laboratory-order-fields">
            <label className="field">
              <span>Clinical reason *</span>

              <textarea
                rows="3"
                value={form.clinicalReason}
                onChange={(event) =>
                  updateForm(
                    'clinicalReason',
                    event.target.value
                  )
                }
                placeholder="Why are these tests being requested?"
                required
              />
            </label>

            <label className="field">
              <span>
                Additional notes
              </span>

              <textarea
                rows="3"
                value={form.notes}
                onChange={(event) =>
                  updateForm(
                    'notes',
                    event.target.value
                  )
                }
                placeholder="Additional information for laboratory staff..."
              />
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-quiet"
              onClick={resetForm}
              disabled={saving}
            >
              Clear
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving
                ? 'Placing order...'
                : 'Place laboratory order'}
            </button>
          </div>
        </form>
      </section>

      <section className="laboratory-order-history">
        <div className="list-head">
          <div>
            <h2>
              My laboratory orders
            </h2>

            <span className="count">
              {orders.length}{' '}
              {orders.length === 1
                ? 'order'
                : 'orders'}
            </span>
          </div>
        </div>

        {orders.length === 0 ? (
          <p className="muted">
            You have not placed any laboratory
            orders yet.
          </p>
        ) : (
          <div className="laboratory-order-cards">
            {orders.map((order) => (
              <article
                className="panel laboratory-order-card"
                key={order.id}
              >
                <div className="laboratory-order-card-head">
                  <div>
                    <h3>
                      {order.patientName}
                    </h3>

                    <span className="muted">
                      {order.orderedAt
                        ? new Date(
                            order.orderedAt
                          ).toLocaleString()
                        : 'Date unavailable'}
                    </span>
                  </div>

                  <div className="laboratory-order-card-status">
                    <span
                      className={`lab-order-status lab-order-status-${String(
                        order.status || ''
                      ).toLowerCase()}`}
                    >
                      {order.status}
                    </span>

                    {order.priority ===
                      'URGENT' && (
                      <span className="lab-order-priority">
                        Urgent
                      </span>
                    )}
                  </div>
                </div>

                <div className="laboratory-order-items">
                  {(order.items || []).map(
                    (item) => (
                      <div
                        className="laboratory-order-item"
                        key={`${order.id}-${item.testId}`}
                      >
                        <div>
                          <strong>
                            {item.testName}
                          </strong>

                          <span>
                            {item.category} ·{' '}
                            {item.specimenType}
                          </span>
                        </div>

                        <strong>
                          {formatNaira(
                            item.price
                          )}
                        </strong>
                      </div>
                    )
                  )}
                </div>

                {order.clinicalReason && (
                  <div className="laboratory-order-note">
                    <strong>
                      Clinical reason:
                    </strong>

                    <span>
                      {order.clinicalReason}
                    </span>
                  </div>
                )}

                {order.notes && (
                  <div className="laboratory-order-note">
                    <strong>Notes:</strong>

                    <span>
                      {order.notes}
                    </span>
                  </div>
                )}

                <div className="laboratory-order-total">
                  <span>Total order value</span>

                  <strong>
                    {formatNaira(
                      order.totalPrice
                    )}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default DoctorLaboratoryOrders;