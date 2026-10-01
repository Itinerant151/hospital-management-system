import { useState, useEffect } from 'react';
import api from './api';
import { useConfirm } from './ConfirmDialog';
import { formatNaira } from './currency';

function Pharmacy() {
  const confirm = useConfirm();
  const [medicines, setMedicines] = useState([]);
  const [name, setName] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    const response = await api.get('/api/medicines');
    setMedicines(response.data);
  };

  const resetForm = () => {
    setName('');
    setStockQuantity('');
    setPrice('');
    setExpiryDate('');
    setEditingId(null);
  };

  const submitMedicine = async (e) => {
    e.preventDefault();
    const medicineData = {
      name,
      stockQuantity: Number(stockQuantity),
      price: Number(price),
      expiryDate: expiryDate || null,
    };

    if (editingId) {
      await api.put(`/api/medicines/${editingId}`, medicineData);
    } else {
      await api.post('/api/medicines', medicineData);
    }

    resetForm();
    fetchMedicines();
  };

  const startEditing = (med) => {
    setEditingId(med.id);
    setName(med.name);
    setStockQuantity(med.stockQuantity);
    setPrice(med.price);
    setExpiryDate(med.expiryDate || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteMedicine = async (id) => {
    if (!(await confirm('Delete this medicine? This cannot be undone.'))) return;
    await api.delete(`/api/medicines/${id}`);
    fetchMedicines();
  };

  return (
    <div>
      <div className="page-head">
        <h1>Pharmacy &amp; Inventory</h1>
        <p>Track medicine stock levels and pricing.</p>
      </div>

      <section className="panel">
        <h2 className="panel-title">{editingId ? 'Edit medicine' : 'Add a medicine'}</h2>
        <form className="form-grid" onSubmit={submitMedicine}>
          <label className="field">
            <span>Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="field">
            <span>Stock quantity</span>
            <input
              type="number"
              min="0"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Price (₦)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Expiry date</span>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Save changes' : 'Add medicine'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-quiet" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <div className="list-head">
        <h2>Inventory</h2>
        <span className="count">
          {medicines.length} {medicines.length === 1 ? 'medicine' : 'medicines'}
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Stock</th>
              <th>Price</th>
              <th>Expiry date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {medicines.length === 0 && (
              <tr>
                <td className="empty" colSpan="5">
                  No medicines yet. Add the first one using the form above.
                </td>
              </tr>
            )}
            {medicines.map((med) => (
              <tr key={med.id}>
                <td>{med.name}</td>
                <td>
                  {med.stockQuantity}
                  {med.stockQuantity < 10 && (
                    <span className="badge badge-cancelled" style={{ marginLeft: '8px' }}>
                      Low stock
                    </span>
                  )}
                </td>
                <td>{formatNaira(med.price)}</td>
                <td>{med.expiryDate || <span className="muted">Not set</span>}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => startEditing(med)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteMedicine(med.id)}
                    >
                      Delete
                    </button>
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

export default Pharmacy;