package hospitalmgt.project;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * One stay in hospital, from admission to discharge. A transfer ends the current Stay and starts a new one,
 * so the list of stays is the full bed history of the admission.
 */
@Document(collection = "admissions")
public class Admission {

    @Id
    private String id;
    private String patientId;
    private String attendingDoctorId; // optional
    private String reason;
    private String status = "ADMITTED"; // ADMITTED or DISCHARGED
    private LocalDateTime admittedAt;
    private String admittedBy;
    private LocalDateTime dischargedAt;
    private String dischargedBy;
    private String dischargeNote;
    private String billId;              // the bed-charge bill created at discharge
    private List<Stay> stays = new ArrayList<>();

    /** Time spent in one bed. Ward name, bed label and rate are copied so history never changes. */
    public static class Stay {
        private String wardId;
        private String wardName;
        private String bedId;
        private String bedLabel;
        private double dailyRate;
        private LocalDateTime startedAt;
        private LocalDateTime endedAt;   // null while the patient is still in this bed
        private String transferReason;   // why the patient was moved here (null for the first bed)
        private String movedBy;

        public Stay() {}

        public String getWardId() { return wardId; }
        public void setWardId(String wardId) { this.wardId = wardId; }
        public String getWardName() { return wardName; }
        public void setWardName(String wardName) { this.wardName = wardName; }
        public String getBedId() { return bedId; }
        public void setBedId(String bedId) { this.bedId = bedId; }
        public String getBedLabel() { return bedLabel; }
        public void setBedLabel(String bedLabel) { this.bedLabel = bedLabel; }
        public double getDailyRate() { return dailyRate; }
        public void setDailyRate(double dailyRate) { this.dailyRate = dailyRate; }
        public LocalDateTime getStartedAt() { return startedAt; }
        public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
        public LocalDateTime getEndedAt() { return endedAt; }
        public void setEndedAt(LocalDateTime endedAt) { this.endedAt = endedAt; }
        public String getTransferReason() { return transferReason; }
        public void setTransferReason(String transferReason) { this.transferReason = transferReason; }
        public String getMovedBy() { return movedBy; }
        public void setMovedBy(String movedBy) { this.movedBy = movedBy; }
    }

    public Admission() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getAttendingDoctorId() { return attendingDoctorId; }
    public void setAttendingDoctorId(String attendingDoctorId) { this.attendingDoctorId = attendingDoctorId; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getAdmittedAt() { return admittedAt; }
    public void setAdmittedAt(LocalDateTime admittedAt) { this.admittedAt = admittedAt; }
    public String getAdmittedBy() { return admittedBy; }
    public void setAdmittedBy(String admittedBy) { this.admittedBy = admittedBy; }
    public LocalDateTime getDischargedAt() { return dischargedAt; }
    public void setDischargedAt(LocalDateTime dischargedAt) { this.dischargedAt = dischargedAt; }
    public String getDischargedBy() { return dischargedBy; }
    public void setDischargedBy(String dischargedBy) { this.dischargedBy = dischargedBy; }
    public String getDischargeNote() { return dischargeNote; }
    public void setDischargeNote(String dischargeNote) { this.dischargeNote = dischargeNote; }
    public String getBillId() { return billId; }
    public void setBillId(String billId) { this.billId = billId; }
    public List<Stay> getStays() { return stays; }
    public void setStays(List<Stay> stays) { this.stays = stays; }
}