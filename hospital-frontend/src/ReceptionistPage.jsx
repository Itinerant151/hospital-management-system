import { useState } from 'react';
import AppShell from './AppShell';
import FrontDesk from './FrontDesk';
import Patients from './Patients';
import Appointments from './Appointments';
import DoctorDirectory from './DoctorDirectory';
import EmergencyPatients from './EmergencyPatients';
import VisitationAdmin from './VisitationAdmin';
import Billing from './Billing';
import Notifications from './Notifications';
import AccountSettings from './AccountSettings';

const NAV = [
  { key: 'frontdesk', label: 'Front desk' },
  { key: 'patients', label: 'Patients' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'doctors', label: 'Doctors' },
  { key: 'emergency', label: 'Emergency Patients' },
  { key: 'visitation', label: 'Visitation' },
  { key: 'billing', label: 'Billing' },
  { key: 'reminders', label: 'Reminders' },
  { key: 'account', label: 'My account' },
];

function ReceptionistPage({ onLogout }) {
  const [activeTab, setActiveTab] = useState('frontdesk');
  return (
    <AppShell roleLabel="Receptionist" nav={NAV} active={activeTab} onNavigate={setActiveTab} onLogout={onLogout}>
      {activeTab === 'frontdesk' && <FrontDesk />}
      {activeTab === 'patients' && <Patients />}
      {activeTab === 'appointments' && <Appointments />}
      {activeTab === 'doctors' && <DoctorDirectory />}
      {activeTab === 'emergency' && <EmergencyPatients />}
      {activeTab === 'visitation' && <VisitationAdmin />}
      {activeTab === 'billing' && <Billing />}
      {activeTab === 'reminders' && <Notifications />}
      {activeTab === 'account' && <AccountSettings />}
    </AppShell>
  );
}

export default ReceptionistPage;