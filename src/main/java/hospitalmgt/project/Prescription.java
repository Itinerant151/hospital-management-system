package hospitalmgt.project;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "prescriptions")
public class Prescription {

    @Id
    private String id;

    private String patientId;
    private String patientName;
    private String doctorId;
    private String doctorName;
    private List<PrescribedItem> items;
    private String notes;
    private LocalDate dateIssued = LocalDate.now();
    private LocalDateTime createdAt; // set when the doctor issues it (older records do not have it)
    private boolean dispensed = false;
    private LocalDateTime dispensedAt;
    private LocalDateTime updatedAt;  // set when a doctor edits the prescription
    private String lastEditedBy;

    public static class PrescribedItem {
        private String medicineId;      // optional: set when the medicine is in the pharmacy inventory
        private String medicationName;
        private String dosage;          // e.g. "500 mg, 1 tablet twice daily"
        private String duration;        // e.g. "5 days"
        private String instructions;    // e.g. "Take after meals"
        private int quantity;           // how many units the pharmacy should hand out

        public PrescribedItem() {}
        public String getMedicineId() { return medicineId; }
        public void setMedicineId(String medicineId) { this.medicineId = medicineId; }
        public String getMedicationName() { return medicationName; }
        public void setMedicationName(String medicationName) { this.medicationName = medicationName; }
        public String getDosage() { return dosage; }
        public void setDosage(String dosage) { this.dosage = dosage; }
        public String getDuration() { return duration; }
        public void setDuration(String duration) { this.duration = duration; }
        public String getInstructions() { return instructions; }
        public void setInstructions(String instructions) { this.instructions = instructions; }
        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) { this.quantity = quantity; }
    }

    public Prescription() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }
    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }
    public List<PrescribedItem> getItems() { return items; }
    public void setItems(List<PrescribedItem> items) { this.items = items; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public LocalDate getDateIssued() { return dateIssued; }
    public void setDateIssued(LocalDate dateIssued) { this.dateIssued = dateIssued; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public boolean isDispensed() { return dispensed; }
    public void setDispensed(boolean dispensed) { this.dispensed = dispensed; }
    public LocalDateTime getDispensedAt() { return dispensedAt; }
    public void setDispensedAt(LocalDateTime dispensedAt) { this.dispensedAt = dispensedAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public String getLastEditedBy() { return lastEditedBy; }
    public void setLastEditedBy(String lastEditedBy) { this.lastEditedBy = lastEditedBy; }
}