import { useState } from 'react';
import AppShell from './AppShell';
import RoleDashboard from './RoleDashboard';
import PrescriptionQueue from './PrescriptionQueue';
import PharmacistStock from './PharmacistStock';
import AccountSettings from './AccountSettings';

const NAV = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'stock', label: 'Medicine stock' },
  { key: 'account', label: 'My account' },
];

function PharmacistPage({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <AppShell
      roleLabel="Pharmacist"
      nav={NAV}
      active={activeTab}
      onNavigate={setActiveTab}
      onLogout={onLogout}
    >
      {activeTab === 'dashboard' && <RoleDashboard />}

      {activeTab === 'prescriptions' && <PrescriptionQueue />}

      {activeTab === 'stock' && <PharmacistStock />}

      {activeTab === 'account' && <AccountSettings />}
    </AppShell>
  );
}

export default PharmacistPage;