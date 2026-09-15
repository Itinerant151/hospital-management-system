import { useState, useEffect } from 'react';
import api from './api';

function Doctors() {
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
  };

  const deleteDoctor = async (id) => {
    await api.delete(`/doctors/${id}`);
    fetchDoctors();
  };

  return (
    <div>
      <h2>Doctors</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Specialization"
          value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Phone Number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />
        <button type="submit">{editingId ? 'Update Doctor' : 'Add Doctor'}</button>
        {editingId && (
          <button type="button" onClick={resetForm}>
            Cancel
          </button>
        )}
      </form>

      <table border="1" cellPadding="8" style={{ marginTop: '20px' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Specialization</th>
            <th>Phone Number</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {doctors.map((doctor) => (
            <tr key={doctor.id}>
              <td>{doctor.name}</td>
              <td>{doctor.specialization}</td>
              <td>{doctor.phoneNumber}</td>
              <td>
                <button onClick={() => startEditing(doctor)}>Edit</button>
                <button onClick={() => deleteDoctor(doctor.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Doctors;