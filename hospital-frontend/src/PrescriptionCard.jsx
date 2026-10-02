import { formatDateTime } from './format';

// One prescription: medication, dosage, instructions and date. `children` is used for action buttons.
function PrescriptionCard({ prescription, showPatient = false, showDoctor = true, children }) {
  const issued = prescription.createdAt || prescription.dateIssued;

  return (
    <article className="rx-card">
      <div className="rx-head">
        <div>
          <h3>{showPatient ? prescription.patientName || 'Unknown patient' : 'Prescription'}</h3>
          <div className="rx-meta">
            {issued ? formatDateTime(issued) : 'Date not recorded'}
            {showDoctor && prescription.doctorName ? ` · ${prescription.doctorName}` : ''}
          </div>
        </div>
        <span className={`badge ${prescription.dispensed ? 'badge-completed' : 'badge-scheduled'}`}>
          {prescription.dispensed ? 'Dispensed' : 'Not dispensed'}
        </span>
      </div>

      {(prescription.items || []).map((item, i) => (
        <div className="rx-item" key={i}>
          <div className="rx-name">{item.medicationName || 'Medicine'}</div>
          <div className="rx-line">
            <strong>Dosage:</strong> {item.dosage || '—'}
            {item.duration ? ` · for ${item.duration}` : ''}
            {item.quantity > 0 ? ` · quantity ${item.quantity}` : ''}
          </div>
          {item.instructions && (
            <div className="rx-line">
              <strong>Instructions:</strong> {item.instructions}
            </div>
          )}
        </div>
      ))}

      {prescription.notes && <div className="rx-notes">{prescription.notes}</div>}
      {children && <div className="rx-actions">{children}</div>}
    </article>
  );
}

export default PrescriptionCard;