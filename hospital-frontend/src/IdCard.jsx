import './IdCard.css';

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="idc-row">
      <span className="idc-label">{label}</span>
      <span className="idc-value">{value}</span>
    </div>
  );
}

export default function IdCard({ card }) {
  if (!card) return null;
  const isPatient = card.type === 'PATIENT';
  const initials = (card.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  const blood = [card.bloodGroup, card.rhFactor].filter(Boolean).join(' ');

  return (
    <div className={`idc-card ${isPatient ? 'idc-patient' : 'idc-staff'}`}>
      <div className="idc-header">
        <div className="idc-logo">+</div>
        <div>
          <div className="idc-hospital">MediCore</div>
          <div className="idc-subtitle">{isPatient ? 'PATIENT ID CARD' : 'STAFF ID CARD'}</div>
        </div>
      </div>

      {isPatient && card.emergencyPatient && (
        <div className="idc-alert">EMERGENCY PATIENT</div>
      )}

      <div className="idc-body">
        <div className="idc-photo">{initials}</div>
        <div className="idc-info">
          <div className="idc-name">{card.name}</div>
          {isPatient ? (
            <>
              <Row label="Gender" value={card.gender} />
              <Row label="Date of birth" value={card.dateOfBirth} />
              <Row label="Blood group" value={blood} />
              <Row label="Allergies" value={card.allergies} />
              <Row label="Phone" value={card.phoneNumber} />
              <Row label="Emergency" value={[card.emergencyContactName, card.emergencyContactPhone].filter(Boolean).join(' - ')} />
              <Row label="HMO" value={[card.insuranceProvider, card.insuranceNumber].filter(Boolean).join(' / ')} />
            </>
          ) : (
            <>
              <Row label="Role" value={card.roleLabel} />
              <Row label="Username" value={card.username} />
              <Row label="Email" value={card.email} />
              <Row label="Phone" value={card.phoneNumber} />
            </>
          )}
        </div>
      </div>

      <div className="idc-footer">
        <span className="idc-number">{card.cardNumber}</span>
        <span>Issued: {card.issuedOn}</span>
      </div>
    </div>
  );
}