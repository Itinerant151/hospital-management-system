import { useMemo } from 'react';
import api from './api';
import { useConfirm } from './ConfirmDialog';
import { formatNaira } from './currency';
import { formatDateTime } from './format';
import { BED_STATUS } from './wardsHelpers';

function BedTile({ bed, canManage, isAdmin, onAdmit, onTransfer, onDischarge, onStatus, onRemove }) {
  const info = BED_STATUS[bed.status] || BED_STATUS.AVAILABLE;

  return (
    <div className={`bed-tile bed-${bed.status.toLowerCase()}`}>
      <div className="bed-top">
        <span className="bed-label">{bed.label}</span>
        <span className={`pill ${info.pill}`}>{info.label}</span>
      </div>

      {bed.status === 'OCCUPIED' && (
        <div className="bed-patient">
          {bed.patientName || 'Unknown patient'}
          {bed.since && <><br /><span className="muted">since {formatDateTime(bed.since)}</span></>}
        </div>
      )}

      {canManage && (
        <div className="row-actions">
          {bed.status === 'AVAILABLE' && (
            <>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => onAdmit(bed)}>Admit</button>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => onStatus(bed, 'MAINTENANCE')}>Maintenance</button>
            </>
          )}
          {bed.status === 'OCCUPIED' && (
            <>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => onTransfer(bed.admissionId)}>Transfer</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => onDischarge(bed.admissionId)}>Discharge</button>
            </>
          )}
          {bed.status === 'MAINTENANCE' && (
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => onStatus(bed, 'AVAILABLE')}>Make available</button>
          )}
          {isAdmin && bed.status !== 'OCCUPIED' && (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => onRemove(bed)}>Remove</button>
          )}
        </div>
      )}
    </div>
  );
}

function BedMap({ wards, beds, canManage, isAdmin, onAdmit, onTransfer, onDischarge, onChanged, onError }) {
  const confirm = useConfirm();

  const totals = useMemo(() => {
    const count = (status) => beds.filter((b) => b.status === status).length;
    const occupied = count('OCCUPIED');
    const usable = beds.length - count('MAINTENANCE');
    return {
      total: beds.length,
      available: count('AVAILABLE'),
      occupied,
      maintenance: count('MAINTENANCE'),
      occupancy: usable > 0 ? Math.round((occupied / usable) * 100) : 0,
    };
  }, [beds]);

  const setStatus = async (bed, status) => {
    try {
      await api.put(`/api/wards/beds/${bed.id}/status`, { status });
      onChanged(`Bed ${bed.label} is now ${status === 'AVAILABLE' ? 'available' : 'under maintenance'}.`);
    } catch (err) {
      onError(err.response?.data?.message || 'Could not change the bed.');
    }
  };

  const removeBed = async (bed) => {
    if (!(await confirm(`Remove bed ${bed.label} from ${bed.wardName}? This cannot be undone.`))) return;
    try {
      await api.delete(`/api/wards/beds/${bed.id}`);
      onChanged(`Bed ${bed.label} removed.`);
    } catch (err) {
      onError(err.response?.data?.message || 'Could not remove the bed.');
    }
  };

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card"><span className="stat-value">{totals.total}</span><span className="stat-label">Beds in total</span></div>
        <div className="stat-card"><span className="stat-value">{totals.available}</span><span className="stat-label">Available</span></div>
        <div className="stat-card"><span className="stat-value">{totals.occupied}</span><span className="stat-label">Occupied</span></div>
        <div className="stat-card"><span className="stat-value">{totals.maintenance}</span><span className="stat-label">In maintenance</span></div>
        <div className="stat-card"><span className="stat-value">{totals.occupancy}%</span><span className="stat-label">Occupancy</span></div>
      </div>

      {wards.length === 0 && (
        <p className="muted">
          No wards yet.{isAdmin ? ' Create the first one under "Manage wards".' : ' Ask the administrator to create wards.'}
        </p>
      )}

      {wards.map((ward) => {
        const wardBeds = beds.filter((b) => b.wardId === ward.id);
        const usable = ward.totalBeds - ward.maintenance;
        const percent = usable > 0 ? Math.round((ward.occupied / usable) * 100) : 0;

        return (
          <section className="ward-block" key={ward.id}>
            <div className="ward-head">
              <h2>{ward.name}</h2>
              <span className="muted">
                {ward.type}{ward.floor ? `, ${ward.floor}` : ''} · {formatNaira(ward.dailyRate)} a day ·{' '}
                {ward.occupied} of {ward.totalBeds} occupied
              </span>
            </div>
            <div className="ward-meter" aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>

            {wardBeds.length === 0 ? (
              <p className="muted">This ward has no beds yet.</p>
            ) : (
              <div className="bed-grid">
                {wardBeds.map((bed) => (
                  <BedTile
                    key={bed.id}
                    bed={bed}
                    canManage={canManage}
                    isAdmin={isAdmin}
                    onAdmit={onAdmit}
                    onTransfer={onTransfer}
                    onDischarge={onDischarge}
                    onStatus={setStatus}
                    onRemove={removeBed}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default BedMap;