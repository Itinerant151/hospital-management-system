import { useEffect, useState } from 'react';

const EMPTY = {
  name: '',
  age: '',
  gender: '',
  dateOfBirth: '',
  bloodGroup: '',
  rhFactor: '',
  medicalHistory: '',
  allergies: '',
  disabilities: '',
  phoneNumber: '',
  email: '',
  address: '',
  maritalStatus: '',
  occupation: '',
  insuranceProvider: '',
  insuranceNumber: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  nextOfKin: '',
  nextOfKinPhone: '',
  notes: '',
};

function PatientDetailsForm({
  patient,
  onSave,
  onCancel,
  showStaffFields = false,
  allowMedicalHistory = false,
}) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (patient) {
      setForm(
        Object.fromEntries(
          Object.keys(EMPTY).map((key) => {
            const value = patient[key] ?? '';
            // Older records may still say "Other"
            return [key, key === 'gender' && value === 'Other' ? 'Rather Not Say' : value];
          })
        )
      );
    } else {
      setForm(EMPTY);
    }
  }, [patient]);

  const update = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();

    const data = {
      ...form,
      age: Number(form.age || 0),
    };

    if (!allowMedicalHistory) {
      delete data.medicalHistory;
      delete data.diagnosis;
      delete data.notes;
    }

    await onSave(data);
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      <label className="field">
        <span>Full name</span>
        <input
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          required
        />
      </label>

      <label className="field">
        <span>Age</span>
        <input
          type="number"
          min="0"
          max="130"
          value={form.age}
          onChange={(e) => update('age', e.target.value)}
          required
        />
      </label>

      <label className="field">
        <span>Gender</span>
        <select
          value={form.gender}
          onChange={(e) => update('gender', e.target.value)}
          required
        >
          <option value="">Select gender</option>
          <option>Male</option>
          <option>Female</option>
          <option>Rather Not Say</option>
        </select>
      </label>

      <label className="field">
        <span>Date of birth</span>
        <input
          type="date"
          value={form.dateOfBirth}
          onChange={(e) => update('dateOfBirth', e.target.value)}
        />
      </label>

      <label className="field">
        <span>Blood group</span>
        <select
          value={form.bloodGroup}
          onChange={(e) => update('bloodGroup', e.target.value)}
        >
          <option value="">Select</option>
          <option>A</option>
          <option>B</option>
          <option>AB</option>
          <option>O</option>
        </select>
      </label>

      <label className="field">
        <span>Rh factor</span>
        <select
          value={form.rhFactor}
          onChange={(e) => update('rhFactor', e.target.value)}
        >
          <option value="">Select</option>
          <option>Positive (+)</option>
          <option>Negative (-)</option>
        </select>
      </label>

      <label className="field">
        <span>Phone number</span>
        <input
          value={form.phoneNumber}
          onChange={(e) => update('phoneNumber', e.target.value)}
        />
      </label>

      <label className="field">
        <span>Email</span>
        <input
          type="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
        />
        <small className="field-hint">
          For patients with an account, this is the account email.
        </small>
      </label>

      <label className="field">
        <span>Marital status</span>
        <select
          value={form.maritalStatus}
          onChange={(e) => update('maritalStatus', e.target.value)}
        >
          <option value="">Select</option>
          <option>Single</option>
          <option>Married</option>
          <option>Divorced</option>
          <option>Widowed</option>
        </select>
      </label>

      <label className="field">
        <span>Occupation</span>
        <input
          value={form.occupation}
          onChange={(e) => update('occupation', e.target.value)}
        />
      </label>

      <label className="field field-full">
        <span>Address</span>
        <input
          value={form.address}
          onChange={(e) => update('address', e.target.value)}
        />
      </label>

      {allowMedicalHistory && (
        <label className="field field-full">
          <span>Medical history</span>
          <textarea
            value={form.medicalHistory}
            onChange={(e) => update('medicalHistory', e.target.value)}
            rows="4"
            placeholder="Previous illnesses, surgeries, chronic conditions and other relevant medical history"
          />
        </label>
      )}

      <label className="field">
        <span>Allergies</span>
        <textarea
          value={form.allergies}
          onChange={(e) => update('allergies', e.target.value)}
          rows="3"
          placeholder="Medication, food or other allergies"
        />
      </label>

      <label className="field">
        <span>Disabilities</span>
        <textarea
          value={form.disabilities}
          onChange={(e) => update('disabilities', e.target.value)}
          rows="3"
        />
      </label>

      <label className="field">
        <span>Insurance provider</span>
        <input
          value={form.insuranceProvider}
          onChange={(e) => update('insuranceProvider', e.target.value)}
        />
      </label>

      <label className="field">
        <span>Insurance number</span>
        <input
          value={form.insuranceNumber}
          onChange={(e) => update('insuranceNumber', e.target.value)}
        />
      </label>

      <label className="field">
        <span>Emergency contact name</span>
        <input
          value={form.emergencyContactName}
          onChange={(e) => update('emergencyContactName', e.target.value)}
        />
      </label>

      <label className="field">
        <span>Emergency contact phone</span>
        <input
          value={form.emergencyContactPhone}
          onChange={(e) => update('emergencyContactPhone', e.target.value)}
        />
      </label>

      <label className="field">
        <span>Emergency contact relationship</span>
        <input
          value={form.emergencyContactRelationship}
          onChange={(e) =>
            update('emergencyContactRelationship', e.target.value)
          }
        />
      </label>

      <label className="field">
        <span>Next of kin</span>
        <input
          value={form.nextOfKin}
          onChange={(e) => update('nextOfKin', e.target.value)}
        />
      </label>

      <label className="field">
        <span>Next of kin phone</span>
        <input
          value={form.nextOfKinPhone}
          onChange={(e) => update('nextOfKinPhone', e.target.value)}
        />
      </label>

      {showStaffFields && allowMedicalHistory && (
        <label className="field field-full">
          <span>Clinical notes</span>
          <textarea
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            rows="4"
            placeholder="Doctor's clinical observations and treatment notes"
          />
        </label>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {patient?.id ? 'Save patient information' : 'Create emergency record'}
        </button>

        {onCancel && (
          <button
            type="button"
            className="btn btn-quiet"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default PatientDetailsForm;