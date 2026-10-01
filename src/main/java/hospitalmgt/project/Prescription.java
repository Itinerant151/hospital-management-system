package hospitalmgt.project;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.List;

@Document(collection = "prescriptions")
public class Prescription {

    @Id
    private String id;

    private String patientId;
    private String doctorId;
    private List<PrescribedItem> items;
    private LocalDate dateIssued = LocalDate.now();
    private boolean dispensed = false;

    public static class PrescribedItem {
        private String medicineId;
        private String dosage; // e.g. "1 tablet twice daily for 5 days"
        private int quantity;

        public PrescribedItem() {}
        public String getMedicineId() { return medicineId; }
        public void setMedicineId(String medicineId) { this.medicineId = medicineId; }
        public String getDosage() { return dosage; }
        public void setDosage(String dosage) { this.dosage = dosage; }
        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) { this.quantity = quantity; }
    }

    public Prescription() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }
    public List<PrescribedItem> getItems() { return items; }
    public void setItems(List<PrescribedItem> items) { this.items = items; }
    public LocalDate getDateIssued() { return dateIssued; }
    public void setDateIssued(LocalDate dateIssued) { this.dateIssued = dateIssued; }
    public boolean isDispensed() { return dispensed; }
    public void setDispensed(boolean dispensed) { this.dispensed = dispensed; }
}
