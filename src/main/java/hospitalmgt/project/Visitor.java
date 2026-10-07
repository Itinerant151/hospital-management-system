package hospitalmgt.project;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "visitors")
public class Visitor {

    @Id
    private String id;
    private String patientId;          // the patient being visited
    private String patientName;        // copied when the visit is created, so it can be shown without a lookup
    private String visitorName;
    private String phoneNumber;
    private String relation;
    private String visitDate;
    private String timeSlot;
    private String status;             // Scheduled, Checked In, Checked Out, Cancelled

    // Visitor logbook
    private String source = "BOOKED";  // BOOKED (a patient booked it online) or WALK_IN (logged at the front desk)
    private String purpose;
    private String visitorPatientId;   // set when the visitor is a patient who has an account with the hospital
    private String visitorPatientName;
    private String checkInTime;
    private String checkOutTime;
    private String loggedBy;           // username of the staff member who logged or updated the visit

    public Visitor() {}

    public Visitor(String patientId, String visitorName, String phoneNumber, String relation,
                   String visitDate, String timeSlot, String status) {
        this.patientId = patientId;
        this.visitorName = visitorName;
        this.phoneNumber = phoneNumber;
        this.relation = relation;
        this.visitDate = visitDate;
        this.timeSlot = timeSlot;
        this.status = status;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public String getVisitorName() { return visitorName; }
    public void setVisitorName(String visitorName) { this.visitorName = visitorName; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public String getRelation() { return relation; }
    public void setRelation(String relation) { this.relation = relation; }
    public String getVisitDate() { return visitDate; }
    public void setVisitDate(String visitDate) { this.visitDate = visitDate; }
    public String getTimeSlot() { return timeSlot; }
    public void setTimeSlot(String timeSlot) { this.timeSlot = timeSlot; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }
    public String getVisitorPatientId() { return visitorPatientId; }
    public void setVisitorPatientId(String visitorPatientId) { this.visitorPatientId = visitorPatientId; }
    public String getVisitorPatientName() { return visitorPatientName; }
    public void setVisitorPatientName(String visitorPatientName) { this.visitorPatientName = visitorPatientName; }
    public String getCheckInTime() { return checkInTime; }
    public void setCheckInTime(String checkInTime) { this.checkInTime = checkInTime; }
    public String getCheckOutTime() { return checkOutTime; }
    public void setCheckOutTime(String checkOutTime) { this.checkOutTime = checkOutTime; }
    public String getLoggedBy() { return loggedBy; }
    public void setLoggedBy(String loggedBy) { this.loggedBy = loggedBy; }
}