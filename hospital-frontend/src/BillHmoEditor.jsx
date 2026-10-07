import { useState } from 'react';
import api from './api';
import Overlay from './Overlay';
import { formatNaira } from './currency';

// "Add HMO" / "Edit HMO" button for a bill that nobody has paid on yet.
// Provider and member number are prefilled from the patient's record when it has them.
function BillHmoEditor({ bill, patient, onChanged }) {
        const [open, setOpen] = useState(false);
        const [provider, setProvider] = useState('');
        const [member, setMember] = useState('');
        const [percent, setPercent] = useState('');
        const [error, setError] = useState('');
        const [busy, setBusy] = useState(false);

        const claim = bill.claimStatus || 'NONE';
        const hasPayments = (bill.amountPaid || 0) > 0 || (bill.payments || []).length > 0;
        const editable = !bill.hmoPaid && bill.status !== 'PAID' && !hasPayments && (claim === 'NONE' || claim === 'PENDING');

        if (!editable) return null;

        const hasHmo = bill.hmoCoveredAmount > 0;

        const openEditor = () => {
        setError('');
        setProvider(bill.hmoProvider || patient?.insuranceProvider || '');
        setMember(bill.hmoMemberNumber || patient?.insuranceNumber || '');
        setPercent(hasHmo ? String(bill.hmoCoveragePercent) : '');
        setOpen(true);
        };

        const pct = Math.min(100, Math.max(0, Number(percent) || 0));
        const hmoShare = Math.round(bill.total * pct) / 100;
        const patientShare = Math.round((bill.total - hmoShare) * 100) / 100;

        const save = async (coveragePercent) => {
        setBusy(true);
        setError('');
        try {
        await api.put(`/api/bills/${bill.id}/hmo`, {
        hmoProvider: provider,
        hmoMemberNumber: member,
        hmoCoveragePercent: coveragePercent,
        });
        setOpen(false);
        if (onChanged) await onChanged();
        } catch (err) {
        setError(err.response?.data?.message || 'Could not save the HMO details.');
        } finally {
        setBusy(false);
        }
        };

        const submit = (e) => {
        e.preventDefault();
        if (pct <= 0) {
        setError('Enter an HMO coverage between 1% and 100%.');
        return;
        }
        save(pct);
        };

        return (
        <>
        <button type="button" className="btn btn-quiet btn-sm" onClick={openEditor}>
        {hasHmo ? 'Edit HMO' : 'Add HMO'}
        </button>

        {open && (
        <Overlay title={hasHmo ? 'Edit HMO coverage' : 'Add HMO coverage'} onClose={() => setOpen(false)}>
        <form className="form-grid" onSubmit={submit}>
        <label className="field">
        <span>HMO provider</span>
        <input type="text" value={provider} onChange={(e) => setProvider(e.target.value)} maxLength={80} />
        </label>
        <label className="field">
        <span>Member number</span>
        <input type="text" value={member} onChange={(e) => setMember(e.target.value)} maxLength={60} />
        </label>
        <label className="field">
        <span>HMO covers (%)</span>
        <input type="number" min="1" max="100" step="0.5" value={percent} onChange={(e) => setPercent(e.target.value)} />
        </label>

        <div className="summary-strip">
        <div><span>Bill total</span><strong>{formatNaira(bill.total)}</strong></div>
        <div><span>HMO pays</span><strong>{formatNaira(hmoShare)}</strong></div>
        <div><span>Patient pays</span><strong>{formatNaira(patientShare)}</strong></div>
        </div>

        {error && <p className="alert alert-error" role="alert">{error}</p>}

        <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Saving...' : 'Save HMO'}
        </button>
        {hasHmo && (
        <button type="button" className="btn btn-danger" disabled={busy} onClick={() => save(0)}>
        Remove HMO
        </button>
        )}
        <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>Cancel</button>
        </div>
        </form>
        </Overlay>
        )}
        </>
        );
        }

        export default BillHmoEditor;