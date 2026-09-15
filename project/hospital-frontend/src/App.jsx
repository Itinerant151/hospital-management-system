import { useState } from 'react';
import Patients from './Patients';
import Doctors from './Doctors';
import Appointments from './Appointments';

function App() {
  const [activeTab, setActiveTab] = useState('patients');

  return (
    <div style={{ padding: '20px' }}>
      <h1>Hospital Management System</h1>

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

export default App;