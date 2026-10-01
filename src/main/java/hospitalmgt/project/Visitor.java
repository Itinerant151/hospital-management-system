package hospitalmgt.project;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "visitors")
public class Visitor {

    @Id
    private String id;
    private String patientId;
    private String visitorName;
    private String phoneNumber;
    private String relation;
    private String visitDate;
    private String timeSlot;
    private String status; // Scheduled, Checked In, Checked Out, Cancelled

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
}