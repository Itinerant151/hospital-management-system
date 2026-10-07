package hospitalmgt.project;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "laboratory_orders")
public class LaboratoryOrder {

    // Order statuses: PENDING -> COLLECTED -> IN_PROGRESS -> COMPLETED
    public static final String PENDING = "PENDING";
    public static final String COLLECTED = "COLLECTED";
    public static final String IN_PROGRESS = "IN_PROGRESS";
    public static final String COMPLETED = "COMPLETED";

    @Id
    private String id;

    private String patientId;
    private String patientName;

    private String doctorId;
    private String doctorName;

    private List<LaboratoryOrderItem> items = new ArrayList<>();

    private String clinicalReason;
    private String notes;

    private String status = PENDING;
    private String priority = "NORMAL";

    private double totalPrice;

    private LocalDateTime orderedAt;
    private LocalDateTime updatedAt;

    private LocalDateTime collectedAt;
    private String collectedBy;
    private LocalDateTime completedAt;
    private String completedBy;
    private String labNotes;
    private String billId;


    public LaboratoryOrder() {
    }

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

    public List<LaboratoryOrderItem> getItems() { return items; }
    public void setItems(List<LaboratoryOrderItem> items) { this.items = items; }

    public String getClinicalReason() { return clinicalReason; }
    public void setClinicalReason(String clinicalReason) { this.clinicalReason = clinicalReason; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public double getTotalPrice() { return totalPrice; }
    public void setTotalPrice(double totalPrice) { this.totalPrice = totalPrice; }

    public LocalDateTime getOrderedAt() { return orderedAt; }
    public void setOrderedAt(LocalDateTime orderedAt) { this.orderedAt = orderedAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public LocalDateTime getCollectedAt() { return collectedAt; }
    public void setCollectedAt(LocalDateTime collectedAt) { this.collectedAt = collectedAt; }

    public String getCollectedBy() { return collectedBy; }
    public void setCollectedBy(String collectedBy) { this.collectedBy = collectedBy; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public String getCompletedBy() { return completedBy; }
    public void setCompletedBy(String completedBy) { this.completedBy = completedBy; }

    public String getLabNotes() { return labNotes; }
    public void setLabNotes(String labNotes) { this.labNotes = labNotes; }

    public String getBillId() { return billId; }
    public void setBillId(String billId) { this.billId = billId; }

    public static class LaboratoryOrderItem {

        private String testId;
        private String testName;
        private String category;
        private String specimenType;
        private String referenceRange;
        private double price;

        private String resultValue;
        private String resultUnit;
        private String resultFlag;
        private String resultComment;
        private LocalDateTime resultEnteredAt;
        private String resultEnteredBy;

        public LaboratoryOrderItem() {
        }

        public String getTestId() { return testId; }
        public void setTestId(String testId) { this.testId = testId; }

        public String getTestName() { return testName; }
        public void setTestName(String testName) { this.testName = testName; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public String getSpecimenType() { return specimenType; }
        public void setSpecimenType(String specimenType) { this.specimenType = specimenType; }

        public String getReferenceRange() { return referenceRange; }
        public void setReferenceRange(String referenceRange) { this.referenceRange = referenceRange; }

        public double getPrice() { return price; }
        public void setPrice(double price) { this.price = price; }

        public String getResultValue() { return resultValue; }
        public void setResultValue(String resultValue) { this.resultValue = resultValue; }

        public String getResultUnit() { return resultUnit; }
        public void setResultUnit(String resultUnit) { this.resultUnit = resultUnit; }

        public String getResultFlag() { return resultFlag; }
        public void setResultFlag(String resultFlag) { this.resultFlag = resultFlag; }

        public String getResultComment() { return resultComment; }
        public void setResultComment(String resultComment) { this.resultComment = resultComment; }

        public LocalDateTime getResultEnteredAt() { return resultEnteredAt; }
        public void setResultEnteredAt(LocalDateTime resultEnteredAt) { this.resultEnteredAt = resultEnteredAt; }

        public String getResultEnteredBy() { return resultEnteredBy; }
        public void setResultEnteredBy(String resultEnteredBy) { this.resultEnteredBy = resultEnteredBy; }
    }
}