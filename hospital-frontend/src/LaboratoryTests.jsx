import { useEffect, useMemo, useState } from 'react';
import api from './api';
import Overlay from './Overlay';
import { useConfirm } from './ConfirmDialog';
import { formatNaira } from './currency';
import './laboratory.css';

const CATEGORIES = [
  'Hematology',
  'Chemistry',
  'Microbiology',
  'Immunology',
  'Serology',
  'Urinalysis',
  'Parasitology',
];

const EMPTY_FORM = {
  testName: '',
  category: '',
  description: '',
  specimenType: '',
  price: '',
  referenceRange: '',
  active: true,
};

function LaboratoryTests() {
  const role = localStorage.getItem('role');
  const isAdmin = role === 'ADMIN';
  const confirm = useConfirm();

  const [tests, setTests] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);

    try {
      const response = await api.get('/api/laboratory/tests');

      setTests(response.data);
      setError('');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not load the laboratory test catalogue.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
        String(value || '').toLowerCase().includes(term)
      )
    );
  }, [tests, search]);

  const saved = (text) => {
    setEditing(null);
    setMessage(text);
    setError('');
    load();
  };

  const failed = (err) => {
    setError(
      err.response?.data?.message ||
      'The laboratory test could not be saved.'
    );

    setMessage('');
  };

  const changeStatus = async (test) => {
    const action = test.active ? 'deactivate' : 'activate';

    const accepted = await confirm(
      `Are you sure you want to ${action} ${test.testName}?`,
      {
        title: `${action[0].toUpperCase()}${action.slice(1)} laboratory test`,
        confirmLabel:
          action[0].toUpperCase() + action.slice(1),
        danger: test.active,
      }
    );

    if (!accepted) {
      return;
    }

    try {
      await api.put(
        `/api/laboratory/tests/${test.id}/status`,
        { active: !test.active }
      );

      saved(
        `Laboratory test ${test.active ? 'deactivated' : 'activated'}.`
      );
    } catch (err) {
      failed(err);
    }
  };

  const deleteTest = async (test) => {
    const accepted = await confirm(
      `Delete ${test.testName} from the laboratory catalogue?`,
      {
        title: 'Delete laboratory test',
        confirmLabel: 'Delete',
        danger: true,
      }
    );

    if (!accepted) {
      return;
    }

    try {
      await api.delete(`/api/laboratory/tests/${test.id}`);

      saved('Laboratory test deleted.');
    } catch (err) {
      failed(err);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Laboratory</h1>

        <p>
          {isAdmin
            ? 'Manage the hospital laboratory test catalogue used when doctors order tests.'
            : 'View the active laboratory tests available in the hospital catalogue.'}
        </p>
      </div>

      {(message || error) && (
        <div
          className={`lab-toast ${
            error
              ? 'lab-toast-error'
              : 'lab-toast-success'
          }`}
          role="alert"
        >
          <span>{error || message}</span>

          <button
            type="button"
            className="lab-toast-close"
            aria-label="Dismiss notification"
            onClick={() => {
              setMessage('');
              setError('');
            }}
          >
            ×
          </button>
        </div>
      )}

      <section className="panel laboratory-panel">
        <div className="list-head laboratory-list-head">
          <div>
            <h2>Test catalogue</h2>

            <span className="count">
              {filteredTests.length} test
              {filteredTests.length === 1 ? '' : 's'}
            </span>
          </div>

          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setEditing({ ...EMPTY_FORM })}
            >
              Add laboratory test
            </button>
          )}
        </div>

        <div className="laboratory-toolbar">
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search tests, categories or specimens..."
            aria-label="Search laboratory tests"
          />
        </div>

        {loading ? (
          <div className="empty">
            Loading laboratory tests...
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="empty">
            No laboratory tests match your search.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="laboratory-table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Category</th>
                  <th>Specimen</th>
                  <th>Reference range</th>
                  <th>Price</th>
                  <th>Status</th>

                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {filteredTests.map((test) => (
                  <tr key={test.id}>
                    <td>
                      <strong>{test.testName}</strong>

                      {test.description && (
                        <span className="lab-description">
                          {test.description}
                        </span>
                      )}
                    </td>

                    <td>{test.category}</td>

                    <td>{test.specimenType}</td>

                    <td>
                      {test.referenceRange || '—'}
                    </td>

                    <td>
                      {formatNaira(test.price)}
                    </td>

                    <td>
                      <span
                        className={`lab-status ${
                          test.active
                            ? 'lab-status-active'
                            : 'lab-status-inactive'
                        }`}
                      >
                        {test.active
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </td>

                    {isAdmin && (
                      <td>
                        <div className="row-actions lab-actions">
                          <button
                            type="button"
                            className="btn btn-quiet btn-sm"
                            onClick={() =>
                              setEditing({ ...test })
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="btn btn-quiet btn-sm"
                            onClick={() =>
                              changeStatus(test)
                            }
                          >
                            {test.active
                              ? 'Deactivate'
                              : 'Activate'}
                          </button>

                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() =>
                              deleteTest(test)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <Overlay
          title={
            editing.id
              ? 'Edit laboratory test'
              : 'Add laboratory test'
          }
          onClose={() => setEditing(null)}
          wide
        >
          <LaboratoryTestForm
            test={editing}
            onSaved={saved}
            onError={failed}
            onCancel={() => setEditing(null)}
          />
        </Overlay>
      )}
    </div>
  );
}

function LaboratoryTestForm({
  test,
  onSaved,
  onError,
  onCancel,
}) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    ...test,
  });

  const [saving, setSaving] = useState(false);

  const update = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    setSaving(true);

    try {
      const payload = {
        testName: form.testName.trim(),
        category: form.category,
        description: form.description.trim(),
        specimenType: form.specimenType.trim(),
        price: Number(form.price),
        referenceRange: form.referenceRange.trim(),
        active: Boolean(form.active),
      };

      if (
        !payload.testName ||
        !payload.category ||
        !payload.specimenType
      ) {
        throw new Error(
          'Test name, category and specimen type are required.'
        );
      }

      if (
        !Number.isFinite(payload.price) ||
        payload.price < 0
      ) {
        throw new Error(
          'Enter a valid non-negative test price.'
        );
      }

      if (form.id) {
        await api.put(
          `/api/laboratory/tests/${form.id}`,
          payload
        );

        onSaved(
          'Laboratory test updated successfully.'
        );
      } else {
        await api.post(
          '/api/laboratory/tests',
          payload
        );

        onSaved(
          'Laboratory test added successfully.'
        );
      }
    } catch (err) {
      onError(
        err.response
          ? err
          : {
              response: {
                data: {
                  message: err.message,
                },
              },
            }
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="form-grid laboratory-form"
      onSubmit={submit}
    >
      <label className="field">
        <span>Test name *</span>

        <input
          value={form.testName}
          onChange={(event) =>
            update('testName', event.target.value)
          }
          required
        />
      </label>

      <label className="field">
        <span>Category *</span>

        <select
          value={form.category}
          onChange={(event) =>
            update('category', event.target.value)
          }
          required
        >
          <option value="">
            Select category
          </option>

          {CATEGORIES.map((category) => (
            <option
              key={category}
              value={category}
            >
              {category}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Specimen type *</span>

        <input
          value={form.specimenType}
          onChange={(event) =>
            update(
              'specimenType',
              event.target.value
            )
          }
          placeholder="e.g. Blood"
          required
        />
      </label>

      <label className="field">
        <span>Price (NGN) *</span>

        <input
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={(event) =>
            update('price', event.target.value)
          }
          required
        />
      </label>

      <label className="field field-full">
        <span>Reference range</span>

        <input
          value={form.referenceRange}
          onChange={(event) =>
            update(
              'referenceRange',
              event.target.value
            )
          }
          placeholder="e.g. 70–100 mg/dL"
        />
      </label>

      <label className="field field-full">
        <span>Description</span>

        <textarea
          rows="3"
          value={form.description}
          onChange={(event) =>
            update(
              'description',
              event.target.value
            )
          }
          placeholder="Brief description of what the test checks."
        />
      </label>

      <label className="lab-checkbox">
        <input
          type="checkbox"
          checked={Boolean(form.active)}
          onChange={(event) =>
            update(
              'active',
              event.target.checked
            )
          }
        />

        <span>
          Active and available for ordering
        </span>
      </label>

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-quiet"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
        >
          {saving
            ? 'Saving...'
            : form.id
              ? 'Save changes'
              : 'Add test'}
        </button>
      </div>
    </form>
  );
}

export default LaboratoryTests;