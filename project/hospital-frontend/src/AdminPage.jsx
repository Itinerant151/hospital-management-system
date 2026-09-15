import { useState } from 'react';
import Patients from './Patients';
import Doctors from './Doctors';
import Appointments from './Appointments';

function AdminPage({ onLogout }) {
  const [activeTab, setActiveTab] = useState('patients');

  return (
    <div style={{ padding: '20px' }}>
      <h1>Hospital Management System — Admin</h1>
      <p>
        Logged in as: ADMIN <button onClick={onLogout}>Log Out</button>
      </p>

      <nav style={{ marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('patients')}>Patients</button>
        <button onClick={() => setActiveTab('doctors')}>Doctors</button>
        <button onClick={() => setActiveTab('appointments')}>Appointments</button>
      </nav>

      {activeTab === 'patients' && <Patients />}
      {activeTab === 'doctors' && <Doctors />}
      {activeTab === 'appointments' && <Appointments />}
    </div>
  );
}

export default AdminPage;