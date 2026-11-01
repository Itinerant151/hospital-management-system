import { Fragment, useEffect, useState } from 'react';
import api from './api';

function PharmacistStock() {
  const [categories, setCategories] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [openCategory, setOpenCategory] = useState(null);
  const [amounts, setAmounts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [cats, meds] = await Promise.all([
        api.get('/api/medicines/categories'),
        api.get('/api/medicines'),
      ]);
      setCategories(cats.data);
      setMedicines(meds.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the medicine stock. Please try again in a moment.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const categoryOf = (m) => m.category || 'Uncategorised';
  const today = new Date().toISOString().slice(0, 10);

  const saveAmount = async (med) => {
    const raw = amounts[med.id];
    if (raw === undefined || raw === '') return;
    setSavingId(med.id);
    setMessage('');
    setError('');
    try {
      await api.put(`/api/medicines/${med.id}/stock`, { stockQuantity: Number(raw) });
      setMessage(`${med.name} is now set to ${Number(raw)} units.`);
      setAmounts((prev) => {
        const next = { ...prev };
        delete next[med.id];
        return next;
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the amount. Please try again.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>Medicine stock</h1>
        <p>
          Open a category to see its medicines and enter how many units are available. A category is
          marked Low stock when any medicine in it has fewer than 10 units.
        </p>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}

      <div className="list-head">
        <h2>Categories</h2>
        <span className="count">{categories.length} categories</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Medicines</th>
              <th>Total units</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr>
                <td className="empty" colSpan="5">No categories to show.</td>
              </tr>
            )}
            {categories.map((cat) => {
              const isOpen = openCategory === cat.category;
              const items = medicines.filter((m) => categoryOf(m) === cat.category);
              return (
                <Fragment key={cat.category}>
                  <tr>
                    <td>{cat.category}</td>
                    <td>{cat.medicineCount}</td>
                    <td>{cat.totalUnits}</td>
                    <td>{cat.lowStock && <span className="badge badge-cancelled">Low stock</span>}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-quiet btn-sm"
                          onClick={() => setOpenCategory(isOpen ? null : cat.category)}
                        >
                          {isOpen ? 'Close' : 'Open'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan="5">
                        {items.length === 0 ? (
                          <p className="muted">
                            No medicines in this category yet. The administrator adds new medicines.
                          </p>
                        ) : (
                          <table>
                            <thead>
                              <tr>
                                <th>Medicine</th>
                                <th>Expiry date</th>
                                <th>In stock</th>
                                <th>Set amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((med) => (
                                <tr key={med.id}>
                                  <td>{med.name}</td>
                                  <td>
                                    {med.expiryDate || <span className="muted">Not set</span>}
                                    {med.expiryDate && med.expiryDate < today && (
                                      <span className="badge badge-cancelled" style={{ marginLeft: '8px' }}>
                                        Expired
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    {med.stockQuantity}
                                    {med.stockQuantity < 10 && (
                                      <span className="badge badge-cancelled" style={{ marginLeft: '8px' }}>
                                        Low stock
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    <div className="row-actions">
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="New amount"
                                        value={amounts[med.id] ?? ''}
                                        onChange={(e) => setAmounts({ ...amounts, [med.id]: e.target.value })}
                                        style={{ width: '120px' }}
                                      />
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        disabled={
                                          savingId === med.id ||
                                          amounts[med.id] === undefined ||
                                          amounts[med.id] === ''
                                        }
                                        onClick={() => saveAmount(med)}
                                      >
                                        {savingId === med.id ? 'Saving...' : 'Save'}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PharmacistStock;