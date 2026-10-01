import { useState, useEffect } from 'react';
import api from './api';

function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const response = await api.get('/api/statistics/summary');
    setStats(response.data);
  };

  if (!stats) return <p className="muted">Loading statistics...</p>;

  const cards = [
    { label: 'Total patients', value: stats.totalPatients },
    { label: 'Total doctors', value: stats.totalDoctors },
    { label: 'Total appointments', value: stats.totalAppointments },
    { label: "Appointments today", value: stats.appointmentsToday },
    { label: 'Total bills', value: stats.totalBills },
    { label: 'Pending bills', value: stats.pendingBills },
    { label: 'Paid bills', value: stats.paidBills },
    { label: 'Medicines in stock', value: stats.totalMedicines },
    { label: 'Low stock medicines', value: stats.lowStockMedicines },
  ];

  return (
    <div>
      <div className="page-head">
        <h1>Dashboard</h1>
        <p>A snapshot of MediCore's current activity.</p>
      </div>

      <div className="stat-grid">
        {cards.map((card) => (
          <div className="stat-card" key={card.label}>
            <span className="stat-value">{card.value}</span>
            <span className="stat-label">{card.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
