import { useEffect, useState } from 'react';
import api from './api';
import Overlay from './Overlay';
import { formatNaira } from './currency';
import { formatDateTime } from './format';
import './lab-report.css';

const FLAG_LABELS = { NORMAL: 'Normal', LOW: 'Low', HIGH: 'High', CRITICAL: 'Critical', ABNORMAL: 'Abnormal' };
const BILL_LABELS = {
  NOT_BILLED: 'Not billed',
  PENDING: 'Unpaid',
  PARTIALLY_PAID: 'Partly paid',
  AWAITING_HMO: 'Awaiting HMO',
  PAID: 'Paid',
};

// Printable laboratory report for one completed order. "Print report" opens the browser's print window.
function LabReport({ orderId, onClose }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api
      .get(`/api/laboratory/orders/${orderId}/report`)
      .then((response) => alive && setReport(response.data))
      .catch((err) => alive && setError(err.response?.data?.message || 'Could not load the report.'));
    return () => {
      alive = false;
    };
  }, [orderId]);

  return (
    <Overlay title="Laboratory report" wide onClose={onClose}>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {!report && !error && <p className="muted">Loading report...</p>}
      {report && (
        <>
          <div className="lab-report-sheet print-area">
            <div className="lab-report-top">
              <div className="lab-report-hospital">{report.hospital}</div>
              <div className="lab-report-title">LABORATORY REPORT</div>
            </div>

            <div className="lab-report-meta">
              <div><span>Report no.</span><strong>{report.reportNumber}</strong></div>
              <div><span>Patient</span><strong>{report.patientName}</strong></div>
              <div><span>Hospital ID</span><strong>{report.patientCode}</strong></div>
              <div><span>Ordered by</span><strong>{report.doctorName || '—'}</strong></div>
              <div><span>Ordered</span><strong>{formatDateTime(report.orderedAt)}</strong></div>
              <div><span>Specimen collected</span><strong>{formatDateTime(report.collectedAt) || '—'}</strong></div>
              <div><span>Completed</span><strong>{formatDateTime(report.completedAt)}</strong></div>
              <div><span>Priority</span><strong>{report.priority}</strong></div>
            </div>

            {report.clinicalReason && (
              <p className="lab-report-notes"><strong>Clinical reason:</strong> {report.clinicalReason}</p>
            )}

            {report.hasCritical && (
              <div className="lab-report-critical">
                <strong>Critical result.</strong> At least one result is flagged critical and should be
                reviewed by a doctor.
              </div>
            )}

            <table className="lab-report-table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Result</th>
                  <th>Flag</th>
                  <th>Reference range</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                {report.tests.map((test, i) => (
                  <tr key={i}>
                    <td>
                      {test.testName}
                      {test.specimenType && <div className="lab-report-sub">{test.specimenType}</div>}
                    </td>
                    <td>{test.resultValue} {test.resultUnit}</td>
                    <td>
                      {test.resultFlag ? (
                        <span className={`lab-report-flag lab-report-flag--${test.resultFlag.toLowerCase()}`}>
                          {FLAG_LABELS[test.resultFlag] || test.resultFlag}
                        </span>
                      ) : '—'}
                    </td>
                    <td>{test.referenceRange || '—'}</td>
                    <td>{test.resultComment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {report.labNotes && (
              <p className="lab-report-notes"><strong>Laboratory notes:</strong> {report.labNotes}</p>
            )}

            <div className="lab-report-foot">
              <span>Completed by: {report.completedBy || 'Laboratory staff'}</span>
              <span>
                Billing: {formatNaira(report.billTotal)} · {BILL_LABELS[report.billStatus] || report.billStatus}
              </span>
            </div>
          </div>

          <div className="lab-report-actions no-print">
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              Print report
            </button>
          </div>
        </>
      )}
    </Overlay>
  );
}

export default LabReport;