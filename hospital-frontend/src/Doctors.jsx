import { useState, useEffect } from 'react';
import api from './api';
import { useConfirm } from './ConfirmDialog';

function Doctors() {
  const confirm = useConfirm();
  const [doctors, setDoctors] = useState([]);
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    const response = await api.get('/doctors');
    setDoctors(response.data);
  };

  const resetForm = () => {
    setName('');
    setSpecialization('');
    setPhoneNumber('');
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const doctorData = { name, specialization, phoneNumber };

    if (editingId) {
      await api.put(`/doctors/${editingId}`, doctorData);
    } else {
      await api.post('/doctors', doctorData);
    }

    resetForm();
    fetchDoctors();
  };

  const startEditing = (doctor) => {
    setEditingId(doctor.id);
    setName(doctor.name);
    setSpecialization(doctor.specialization);
    setPhoneNumber(doctor.phoneNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

    const deleteDoctor = async (doctor) => {
    if (!(await confirm(`Delete ${doctor.name}? This cannot be undone.`))) return;
    await api.delete(`/doctors/${doctor.id}`);
    fetchDoctors();
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {doctors.length === 0 && (
              <tr>
                <td className="empty" colSpan="4">
                  No doctors yet. Add the first one using the form above.
                </td>
              </tr>
            )}
            {doctors.map((doctor) => (
              <tr key={doctor.id}>
                <td>{doctor.name}</td>
                <td>{doctor.specialization}</td>
                <td>{doctor.phoneNumber}</td>
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
