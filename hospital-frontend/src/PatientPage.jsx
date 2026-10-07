import { useEffect, useState } from 'react';
import api from './api';
import AppShell from './AppShell';
import RoleDashboard from './RoleDashboard';
import MyProfile from './MyProfile';
import MyAppointments from './MyAppointments';
import Notifications from './Notifications';
import MyVisitation from './MyVisitation';
import AccountSettings from './AccountSettings';
import MyBilling from './MyBilling';
import MyPrescriptions from './MyPrescriptions';
import MyAdmission from './MyAdmission';
import PatientTimeline from './PatientTimeline';
import MyLabResults from './MyLabResults';

const NAV = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'profile', label: 'My profile' },
  { key: 'appointments', label: 'My appointments' },
  { key: 'admission', label: 'My admission' },
  { key: 'history', label: 'My medical history' },
  { key: 'prescriptions', label: 'My prescriptions' },
  { key: 'lab-results', label: 'My lab results' },
  { key: 'visitation', label: 'Visitation' },
  { key: 'billing', label: 'My billing' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'account', label: 'My account' },
];

function PatientPage({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [temporary, setTemporary] = useState(false);

  // If staff created this account, the password is temporary:
  // take the patient straight to My account.
  useEffect(() => {
    api
      .get('/account/me')
      .then((response) => {
        if (response.data.temporaryPassword) {
          setTemporary(true);
          setActiveTab('account');
        }
      })
      .catch(() => {});
  }, []);

  return (
    <AppShell
      roleLabel="Patient"
      nav={NAV}
      active={activeTab}
      onNavigate={setActiveTab}
      onLogout={onLogout}
    >
      {temporary && (
        <div className="temp-banner" role="alert">
          <span>
            You are using a temporary password. Change it now to keep your
            account safe.
          </span>

          {activeTab !== 'account' && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setActiveTab('account')}
            >
              Change password
            </button>
          )}
        </div>
      )}

      {activeTab === 'dashboard' && <RoleDashboard />}

      {activeTab === 'profile' && <MyProfile />}

      {activeTab === 'appointments' && <MyAppointments />}

      {activeTab === 'admission' && <MyAdmission />}

      {activeTab === 'history' && (
        <div>
          <div className="page-head">
            <h1>My medical history</h1>
            <p>
              Your appointments, diagnoses, treatment, prescriptions and
              hospital visits in date order.
            </p>
          </div>

          <PatientTimeline mine />
        </div>
      )}

      {activeTab === 'prescriptions' && <MyPrescriptions />}

      {activeTab === 'lab-results' && <MyLabResults />}

      {activeTab === 'visitation' && <MyVisitation />}

      {activeTab === 'billing' && <MyBilling />}

      {activeTab === 'notifications' && <Notifications />}

      {activeTab === 'account' && (
        <AccountSettings onPasswordChanged={() => setTemporary(false)} />
      )}
    </AppShell>
  );
}

export default PatientPage;