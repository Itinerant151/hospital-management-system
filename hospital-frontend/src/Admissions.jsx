import { useMemo, useState } from 'react';
import SearchFilter from './SearchFilter';
import { formatNaira } from './currency';
import { formatDateTime } from './format';
import { BILL_LABELS, dayText } from './wardsHelpers';

function Admissions({ admissions, canManage, onAdmit, onTransfer, onDischarge }) {
  const [view, setView] = useState('current'); // 'current' or 'history'
  const [filtered, setFiltered] = useState([]);

  const rows = useMemo(
    () =>
      admissions
        .filter((a) => (view === 'current' ? a.status === 'ADMITTED' : a.status === 'DISCHARGED'))
        .map((a) => ({
          ...a,
          doctorLabel: a.doctorName || '',
          billLabel: a.billStatus ? BILL_LABELS[a.billStatus] || a.billStatus : '',
        })),
    [admissions, view]
  );

  const current = view === 'current';

  return (
    <div>
      <div className="list-head">
        <h2>{current ? 'Patients in hospital' : 'Discharged patients'}</h2>
        <div className="row-actions">
          <button type="button" className={`btn btn-sm ${current ? 'btn-primary' : 'btn-quiet'}`} onClick={() => setView('current')}>
            Admitted now
          </button>
          <button type="button" className={`btn btn-sm ${!current ? 'btn-primary' : 'btn-quiet'}`} onClick={() => setView('history')}>
            Discharged
          </button>
          {canManage && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onAdmit(null)}>
              Admit a patient
            </button>
          )}
        </div>
      </div>

      <SearchFilter
        data={rows}
        fields={['patientName', 'wardName', 'bedLabel', 'doctorLabel', 'reason', 'billLabel']}
        onFiltered={setFiltered}
        placeholder="Search by patient, ward, bed, doctor or reason..."
      />

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>{current ? 'Ward and bed' : 'Last ward and bed'}</th>
              <th>Doctor</th>
              <th>Reason</th>
              <th>Admitted</th>
              {!current && <th>Discharged</th>}
              <th>{current ? 'Days so far' : 'Days'}</th>
              <th>{current ? 'Charges so far' : 'Bed charges'}</th>
              {!current && <th>Bill</th>}
              {current && canManage && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td className="empty" colSpan={current ? (canManage ? 8 : 7) : 9}>
                  {current ? 'Nobody is admitted right now.' : 'No discharged patients yet.'}
                </td>
              </tr>
            )}
            {filtered.map((a) => (
              <tr key={a.id}>
                <td>{a.patientName}</td>
                <td>
                  {a.wardName}, bed {a.bedLabel}
                  {a.stays.length > 1 && <><br /><span className="muted">{a.stays.length} beds used</span></>}
                </td>
                <td>{a.doctorName || <span className="muted">Not chosen</span>}</td>
                <td>{a.reason}</td>
                <td>{formatDateTime(a.admittedAt)}</td>
                {!current && <td>{formatDateTime(a.dischargedAt)}</td>}
                <td>{dayText(a.days)}</td>
                <td>{formatNaira(a.charges)}</td>
                {!current && (
                  <td>
                    <span className={`pill ${a.billStatus === 'PAID' ? 'pill-in' : 'pill-out'}`}>
                      {BILL_LABELS[a.billStatus] || a.billStatus || 'None'}
                    </span>
                  </td>
                )}
                {current && canManage && (
                  <td>
                    <div className="row-actions">
                      <button type="button" className="btn btn-quiet btn-sm" onClick={() => onTransfer(a.id)}>Transfer</button>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => onDischarge(a.id)}>Discharge</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Admissions;