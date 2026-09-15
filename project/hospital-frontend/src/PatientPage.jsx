import MyProfile from './MyProfile';
import MyAppointments from './MyAppointments';

function PatientPage({ onLogout }) {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Hospital Management System — My Portal</h1>
      <p>
        Logged in as: PATIENT <button onClick={onLogout}>Log Out</button>
      </p>

      <MyProfile />
      <MyAppointments />
    </div>
  );
}

export default PatientPage;