import { useState } from 'react';
import AppShell from './AppShell';
import Patients from './Patients';
import Doctors from './Doctors';
import Appointments from './Appointments';
import Billing from './Billing';
import Pharmacy from './Pharmacy';
import Dashboard from './Dashboard';
import Notifications from './Notifications';
import VisitationAdmin from './VisitationAdmin';
import AccountSettings from './AccountSettings';
import EmergencyPatients from './EmergencyPatients';
import ReceptionistRequests from './ReceptionistRequests';

const NAV = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'patients', label: 'Patients' },
  { key: 'emergency', label: 'Emergency Patients' },
  { key: 'receptionists', label: 'Receptionist applications' },
  { key: 'doctors', label: 'Doctors' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'visitation', label: 'Visitation' },
  { key: 'billing', label: 'Billing' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'reminders', label: 'Reminders' },
  { key: 'account', label: 'My account' },
];

function AdminPage({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <AppShell
      roleLabel="Administrator"
      nav={NAV}
      active={activeTab}
      onNavigate={setActiveTab}
      onLogout={onLogout}
    >
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'patients' && <Patients />}
      {activeTab === 'emergency' && <EmergencyPatients />}
      {activeTab === 'receptionists' && <ReceptionistRequests />}
      {activeTab === 'doctors' && <Doctors />}
      {activeTab === 'appointments' && <Appointments />}
      {activeTab === 'visitation' && <VisitationAdmin />}
      {activeTab === 'billing' && <Billing />}
      {activeTab === 'pharmacy' && <Pharmacy />}
      {activeTab === 'reminders' && <Notifications />}
      {activeTab === 'account' && <AccountSettings />}
    </AppShell>
  );
}

export default AdminPage;