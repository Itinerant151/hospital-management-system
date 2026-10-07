import { useState } from 'react';
import AppShell from './AppShell';
import RoleDashboard from './RoleDashboard';
import FrontDesk from './FrontDesk';
import Patients from './Patients';
import Appointments from './Appointments';
import DoctorDirectory from './DoctorDirectory';
import VisitingDoctors from './VisitingDoctors';
import Wards from './Wards';
import LaboratoryTests from './LaboratoryTests';
import EmergencyPatients from './EmergencyPatients';
import VisitationAdmin from './VisitationAdmin';
import VisitorLogbook from './VisitorLogbook';
import Billing from './Billing';
import HmoClaims from './HmoClaims';
import Notifications from './Notifications';
import AccountSettings from './AccountSettings';

const NAV = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'frontdesk', label: 'Front desk' },
  { key: 'patients', label: 'Patients' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'doctors', label: 'Doctors' },
  { key: 'visiting', label: 'Visiting doctors' },
  { key: 'wards', label: 'Wards and beds' },
  { key: 'laboratory', label: 'Laboratory' },
  { key: 'emergency', label: 'Emergency Patients' },
  { key: 'visitation', label: 'Visitation' },
  { key: 'logbook', label: 'Visitor logbook' },
  { key: 'billing', label: 'Billing' },
  { key: 'hmo', label: 'HMO claims' },
  { key: 'reminders', label: 'Reminders' },
  { key: 'account', label: 'My account' },
];

function ReceptionistPage({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <AppShell
      roleLabel="Receptionist"
      nav={NAV}
      active={activeTab}
      onNavigate={setActiveTab}
      onLogout={onLogout}
    >
      {activeTab === 'dashboard' && <RoleDashboard />}

      {activeTab === 'frontdesk' && <FrontDesk />}

      {activeTab === 'patients' && <Patients />}

      {activeTab === 'appointments' && (
        <Appointments />
      )}

      {activeTab === 'doctors' && (
        <DoctorDirectory />
      )}

      {activeTab === 'visiting' && (
        <VisitingDoctors />
      )}

      {activeTab === 'wards' && <Wards />}

      {activeTab === 'laboratory' && (
        <LaboratoryTests />
      )}

      {activeTab === 'emergency' && (
        <EmergencyPatients />
      )}

      {activeTab === 'visitation' && (
        <VisitationAdmin />
      )}

      {activeTab === 'logbook' && (
        <VisitorLogbook />
      )}

      {activeTab === 'billing' && <Billing />}

      {activeTab === 'hmo' && <HmoClaims />}

      {activeTab === 'reminders' && (
        <Notifications />
      )}

      {activeTab === 'account' && (
        <AccountSettings />
      )}
    </AppShell>
  );
}

export default ReceptionistPage;