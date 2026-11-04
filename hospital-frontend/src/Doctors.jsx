import { useState, useEffect } from 'react';
import api from './api';
import { useConfirm } from './ConfirmDialog';
import { formatNaira } from './currency';

function Doctors() {
  const confirm = useConfirm();
  const isAdmin = localStorage.getItem('role') === 'ADMIN';

  const [doctors, setDoctors] = useState([]);
  const [visitingList, setVisitingList] = useState([]);
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fee, setFee] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDoctors();
    api.get('/api/visiting-doctors')
      .then((response) => setVisitingList(response.data))
      .catch(() => setVisitingList([]));
  }, []);

  const fetchDoctors = async () => {
    const response = await api.get('/doctors');
    setDoctors(response.data);
  };

  const resetForm = () => {
    setName('');
    setSpecialization('');
    setPhoneNumber('');
    setFee('');
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const doctorData = { name, specialization, phoneNumber, consultationFee: Number(fee) || 0 };

    try {
      if (editingId) {
        await api.put(`/doctors/${editingId}`, doctorData);
      } else {
        await api.post('/doctors', doctorData);
      }
      resetForm();
      fetchDoctors();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the doctor.');
    }
  };

  const startEditing = (doctor) => {
    setEditingId(doctor.id);
    setName(doctor.name);
    setSpecialization(doctor.specialization);
    setPhoneNumber(doctor.phoneNumber);
    setFee(doctor.consultationFee > 0 ? String(doctor.consultationFee) : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteDoctor = async (doctor) => {
    if (!(await confirm(`Delete ${doctor.name}? This cannot be undone.`))) return;
    await api.delete(`/doctors/${doctor.id}`);
    fetchDoctors();
  };

  // A visiting doctor is charged the fee on their visiting record, not the one on the doctor
  const feeText = (doctor) => {
    const visiting = visitingList.find((v) => v.doctorId === doctor.id);
    if (visiting) return `${formatNaira(visiting.consultationFee)} (visiting fee)`;
    return doctor.consultationFee > 0 ? formatNaira(doctor.consultationFee) : 'Not set';
  };

  return (
    <div>
      <div className="page-head">
        <h1>Doctors</h1>
        <p>Manage the doctors who can be assigned to patients and booked for appointments.</p>
      </div>

      <section className="panel">
        <h2 className="panel-title">{editingId ? 'Edit doctor' : 'Add a doctor'}</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="field">
            <span>Specialization</span>
            <input
              type="text"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Phone number</span>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
          </label>
          {isAdmin && (
            <label className="field">
              <span>Consultation fee (₦)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 10000"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
              <small className="field-hint">
                Added to the patient's bill when they attend an appointment with this doctor. Visiting doctors use the fee set on the Visiting doctors page.
              </small>
            </label>
          )}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Save changes' : 'Add doctor'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-quiet" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
        {error && (
          <p className="alert alert-error" role="alert" style={{ marginTop: '16px', marginBottom: 0 }}>
            {error}
          </p>
        )}
      </section>

      <div className="list-head">
        <h2>All doctors</h2>
        <span className="count">
          {doctors.length} {doctors.length === 1 ? 'doctor' : 'doctors'}
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Specialization</th>
              <th>Phone number</th>
              <th>Consultation fee</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {doctors.length === 0 && (
              <tr>
                <td className="empty" colSpan="5">
                  No doctors yet. Add the first one using the form above.
                </td>
              </tr>
            )}
            {doctors.map((doctor) => (
              <tr key={doctor.id}>
                <td>{doctor.name}</td>
                <td>{doctor.specialization}</td>
                <td>{doctor.phoneNumber}</td>
                <td>{feeText(doctor)}</td>
                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn btn-quiet btn-sm"
                      onClick={() => startEditing(doctor)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => deleteDoctor(doctor)}
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

export default Doctors;