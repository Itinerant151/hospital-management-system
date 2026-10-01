import { useEffect, useMemo, useState } from 'react';
import api from './api';
import SearchFilter from './SearchFilter';

// Read-only list of doctors for the front desk, with who is currently checked in
function DoctorDirectory() {
  const [doctors, setDoctors] = useState([]);
  const [log, setLog] = useState([]);
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [doctorResponse, logResponse] = await Promise.all([
        api.get('/doctors'),
        api.get('/api/frontdesk'),
      ]);
      setDoctors(doctorResponse.data);
      setLog(logResponse.data);
    };
    load();
  }, []);

  const rows = useMemo(
    () =>
      doctors.map((doctor) => ({
        ...doctor,
        onDuty: log.some(
          (entry) =>
            entry.type === 'STAFF' &&
            entry.status === 'Checked In' &&
            (entry.personId === doctor.id ||
              (entry.personName || '').toLowerCase() === (doctor.name || '').toLowerCase())
        ),
      })),
    [doctors, log]
  );

  return (
    <div>
      <div className="page-head">
        <h1>Doctors</h1>
        <p>Who works here, how to reach them, and who is on duty right now.</p>
      </div>

      <div className="list-head">
        <h2>Doctor directory</h2>
        <span className="count">{filtered.length} {filtered.length === 1 ? 'doctor' : 'doctors'}</span>
      </div>
      <SearchFilter
        data={rows}
        fields={['name', 'specialization', 'phoneNumber']}
        onFiltered={setFiltered}
        placeholder="Search by name, specialization or phone..."
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Specialization</th><th>Phone</th><th>On duty</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td className="empty" colSpan="4">No doctors found.</td></tr>
            )}
            {filtered.map((doctor) => (
              <tr key={doctor.id}>
                <td>{doctor.name}</td>
                <td>{doctor.specialization}</td>
                <td>{doctor.phoneNumber || <span className="muted">Not given</span>}</td>
                <td>
                  {doctor.onDuty
                    ? <span className="pill pill-in">Checked in</span>
                    : <span className="muted">Not checked in</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DoctorDirectory;