import { useState, useEffect } from 'react';
import api from './api';

function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    const response = await api.get('/doctors');
    setDoctors(response.data);
  };

  const addDoctor = async (e) => {
    e.preventDefault();
    await api.post('/doctors', { name, specialization, phoneNumber });
    setName('');
    setSpecialization('');
    setPhoneNumber('');
    fetchDoctors();
  };

  const deleteDoctor = async (id) => {
    await api.delete(`/doctors/${id}`);
    fetchDoctors();
  };

  return (
    <div>
      <h2>Doctors</h2>

      <form onSubmit={addDoctor}>
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
        <button type="submit">Add Doctor</button>
      </form>

      <table border="1" cellPadding="8" style={{ marginTop: '20px' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Specialization</th>
            <th>Phone Number</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {doctors.map((doctor) => (
            <tr key={doctor.id}>
              <td>{doctor.name}</td>
              <td>{doctor.specialization}</td>
              <td>{doctor.phoneNumber}</td>
              <td>
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