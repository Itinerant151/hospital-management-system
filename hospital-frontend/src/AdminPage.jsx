import { useState } from 'react';
import AppShell from './AppShell';
import Patients from './Patients';
import Doctors from './Doctors';
import VisitingDoctors from './VisitingDoctors';
import VisitingEarnings from './VisitingEarnings';
import Wards from './Wards';
import LaboratoryTests from './LaboratoryTests';
import Appointments from './Appointments';
import Billing from './Billing';
import HmoClaims from './HmoClaims';
import Pharmacy from './Pharmacy';
import PrescriptionQueue from './PrescriptionQueue';
import RoleDashboard from './RoleDashboard';
import Notifications from './Notifications';
import VisitationAdmin from './VisitationAdmin';
import VisitorLogbook from './VisitorLogbook';
import AccountSettings from './AccountSettings';
import EmergencyPatients from './EmergencyPatients';
import ReceptionistRequests from './ReceptionistRequests';
import AuditLogPage from './AuditLogPage';
import LicenceChecks from './LicenceChecks';

const NAV = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'patients', label: 'Patients' },
  { key: 'emergency', label: 'Emergency Patients' },
  { key: 'receptionists', label: 'Staff applications' },
  { key: 'licences', label: 'Licence checks' },
  { key: 'doctors', label: 'Doctors' },
  { key: 'visiting', label: 'Visiting doctors' },
  { key: 'earnings', label: 'Visiting earnings' },
  { key: 'wards', label: 'Wards and beds' },
  { key: 'laboratory', label: 'Laboratory' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'visitation', label: 'Visitation' },
  { key: 'logbook', label: 'Visitor logbook' },
  { key: 'billing', label: 'Billing' },
  { key: 'hmo', label: 'HMO claims' },
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'audit', label: 'Audit log' },
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
      {activeTab === 'dashboard' && <RoleDashboard />}
      {activeTab === 'patients' && <Patients />}
      {activeTab === 'emergency' && <EmergencyPatients />}
      {activeTab === 'receptionists' && <ReceptionistRequests />}
      {activeTab === 'licences' && <LicenceChecks />}
      {activeTab === 'doctors' && <Doctors />}
      {activeTab === 'visiting' && <VisitingDoctors />}
      {activeTab === 'earnings' && <VisitingEarnings />}
      {activeTab === 'wards' && <Wards />}
      {activeTab === 'laboratory' && <LaboratoryTests />}
      {activeTab === 'appointments' && <Appointments />}
      {activeTab === 'visitation' && <VisitationAdmin />}
      {activeTab === 'logbook' && <VisitorLogbook />}
      {activeTab === 'billing' && <Billing />}
      {activeTab === 'hmo' && <HmoClaims />}
      {activeTab === 'pharmacy' && <Pharmacy />}
      {activeTab === 'prescriptions' && <PrescriptionQueue />}
      {activeTab === 'audit' && <AuditLogPage />}
      {activeTab === 'reminders' && <Notifications />}
      {activeTab === 'account' && <AccountSettings />}
    </AppShell>
  );
}

export default AdminPage;