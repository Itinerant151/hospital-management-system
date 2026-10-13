import { useEffect, useState } from 'react';
import api from './api';
import BedMap from './BedMap';
import Admissions from './Admissions';
import WardManager from './WardManager';
import { AdmitDialog, TransferDialog, DischargeDialog } from './AdmissionDialogs';

function Wards() {
  const role = localStorage.getItem('role');
  const isAdmin = role === 'ADMIN';
  // Admin and receptionist run the beds; doctors can look but not change
  const canManage = role === 'ADMIN' || role === 'RECEPTIONIST';

  const [tab, setTab] = useState('map');
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [admitOpen, setAdmitOpen] = useState(false);
  const [presetBedId, setPresetBedId] = useState('');
  const [transferFor, setTransferFor] = useState(null);
  const [dischargeFor, setDischargeFor] = useState(null);

  const load = async () => {
    try {
      const [wardRes, bedRes, admissionRes, patientRes, doctorRes] = await Promise.all([
        api.get('/api/wards'),
        api.get('/api/wards/beds'),
        api.get('/api/admissions'),
        api.get('/patients'),
        api.get('/doctors'),
      ]);
      setWards(wardRes.data);
      setBeds(bedRes.data);
      setAdmissions(admissionRes.data);
      setPatients(patientRes.data);
      setDoctors(doctorRes.data);
    } catch (err) {
      setError('Could not load the wards. Please try again.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changed = (text) => {
    setError('');
    setMessage(text);
    load();
  };

  const failed = (text) => {
    setMessage('');
    setError(text);
  };

  const openAdmit = (bed) => {
    setPresetBedId(bed ? bed.id : '');
    setAdmitOpen(true);
  };

  const openTransfer = (admissionId) => {
    setTransferFor(admissions.find((a) => a.id === admissionId) || null);
  };

  const openDischarge = (admissionId) => {
    setDischargeFor(admissions.find((a) => a.id === admissionId) || null);
  };

  const done = (text) => {
    setAdmitOpen(false);
    setTransferFor(null);
    setDischargeFor(null);
    changed(text);
  };

  return (
    <div>
      <div className="page-head">
        <h1>Wards and beds</h1>
        <p>
          {canManage
            ? 'See every bed at a glance, admit patients, move them between beds and discharge them. Bed charges are billed at discharge.'
            : 'See which beds are free and who is admitted. Admissions are handled by the front desk.'}
        </p>
      </div>

      {message && <p className="alert alert-success">{message}</p>}
      {error && <p className="alert alert-error" role="alert">{error}</p>}

      <div className="tab-row">
        <button type="button" className={`btn btn-sm ${tab === 'map' ? 'btn-primary' : 'btn-quiet'}`} onClick={() => setTab('map')}>
          Bed map
        </button>
        <button type="button" className={`btn btn-sm ${tab === 'admissions' ? 'btn-primary' : 'btn-quiet'}`} onClick={() => setTab('admissions')}>
          Admissions
        </button>
        {isAdmin && (
          <button type="button" className={`btn btn-sm ${tab === 'manage' ? 'btn-primary' : 'btn-quiet'}`} onClick={() => setTab('manage')}>
            Manage wards
          </button>
        )}
      </div>

      {tab === 'map' && (
        <BedMap
          wards={wards}
          beds={beds}
          canManage={canManage}
          isAdmin={isAdmin}
          onAdmit={openAdmit}
          onTransfer={openTransfer}
          onDischarge={openDischarge}
          onChanged={changed}
          onError={failed}
        />
      )}

      {tab === 'admissions' && (
        <Admissions
          admissions={admissions}
          canManage={canManage}
          onAdmit={openAdmit}
          onTransfer={openTransfer}
          onDischarge={openDischarge}
        />
      )}

      {tab === 'manage' && isAdmin && <WardManager wards={wards} onChanged={changed} onError={failed} />}

      {admitOpen && (
        <AdmitDialog
          wards={wards}
          beds={beds}
          patients={patients}
          doctors={doctors}
          admissions={admissions}
          presetBedId={presetBedId}
          onClose={() => setAdmitOpen(false)}
          onDone={done}
        />
      )}
      {transferFor && (
        <TransferDialog admission={transferFor} wards={wards} beds={beds} onClose={() => setTransferFor(null)} onDone={done} />
      )}
      {dischargeFor && (
        <DischargeDialog admission={dischargeFor} onClose={() => setDischargeFor(null)} onDone={done} />
      )}
    </div>
  );
}

export default Wards;