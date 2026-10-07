import { useState } from 'react';
import AppShell from './AppShell';
import RoleDashboard from './RoleDashboard';
import LaboratoryResults from './LaboratoryResults';
import LaboratoryTests from './LaboratoryTests';
import AccountSettings from './AccountSettings';

const NAV = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'work', label: 'Work queue' },
  { key: 'catalogue', label: 'Test catalogue' },
  { key: 'account', label: 'My account' },
];

function LaboratoryStaffPage({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <AppShell
      roleLabel="Laboratory staff"
      nav={NAV}
      active={activeTab}
      onNavigate={setActiveTab}
      onLogout={onLogout}
    >
      {activeTab === 'dashboard' && <RoleDashboard />}

      {activeTab === 'work' && <LaboratoryResults />}

      {activeTab === 'catalogue' && <LaboratoryTests />}

      {activeTab === 'account' && <AccountSettings />}
    </AppShell>
  );
}

export default LaboratoryStaffPage;