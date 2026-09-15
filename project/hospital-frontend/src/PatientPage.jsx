import Patients from './Patients';
import Appointments from './Appointments';

function PatientPage({ onLogout }) {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Hospital Management System — Patients</h1>
      <p>
        Logged in as: PATIENT <button onClick={onLogout}>Log Out</button>
      </p>

      <Patients />
      <Appointments />
    </div>
  );
}

export default PatientPage;