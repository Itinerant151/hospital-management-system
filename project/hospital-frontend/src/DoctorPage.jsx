import Doctors from './Doctors';

function DoctorPage({ onLogout }) {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Hospital Management System — Doctors</h1>
      <p>
        Logged in as: DOCTOR <button onClick={onLogout}>Log Out</button>
      </p>

      <Doctors />
    </div>
  );
}

export default DoctorPage;