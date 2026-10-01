import { useState } from 'react';
import AppShell from './AppShell';
import MyProfile from './MyProfile';
import MyAppointments from './MyAppointments';
import Notifications from './Notifications';
import MyVisitation from './MyVisitation';
import AccountSettings from './AccountSettings';
import MyBilling from './MyBilling';

const NAV = [
  { key: 'profile', label: 'My profile' },
  { key: 'appointments', label: 'My appointments' },
  { key: 'visitation', label: 'Visitation' },
  { key: 'billing', label: 'My billing' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'account', label: 'My account' },
];

function PatientPage({ onLogout }) {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <AppShell
      roleLabel="Patient"
      nav={NAV}
      active={activeTab}
      onNavigate={setActiveTab}
      onLogout={onLogout}
    >
      {activeTab === 'profile' && <MyProfile />}
      {activeTab === 'appointments' && <MyAppointments />}
      {activeTab === 'visitation' && <MyVisitation />}
      {activeTab === 'billing' && <MyBilling />}
      {activeTab === 'notifications' && <Notifications />}
      {activeTab === 'account' && <AccountSettings />}
    </AppShell>
  );
}

export default PatientPage;