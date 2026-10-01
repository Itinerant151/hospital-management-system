package hospitalmgt.project;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * One front-desk check-in / check-out record for a patient or a member of staff.
 * (Visitors have their own records under Visitation.)
 */
@Document(collection = "checkins")
public class CheckIn {

    @Id
    private String id;
    private String type;          // PATIENT or STAFF
    private String personId;      // patient id or doctor id, when known
    private String personName;
    private String purpose;       // reason for visit, or shift / department
    private String appointmentId; // set when checking in from an appointment
    private String checkInTime;   // e.g. 2026-09-30T09:15:00
    private String checkOutTime;
    private String status;        // "Checked In" or "Checked Out"
    private String handledBy;     // username of the receptionist

    public CheckIn() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getPersonId() { return personId; }
    public void setPersonId(String personId) { this.personId = personId; }
    public String getPersonName() { return personName; }
    public void setPersonName(String personName) { this.personName = personName; }
    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }
    public String getAppointmentId() { return appointmentId; }
    public void setAppointmentId(String appointmentId) { this.appointmentId = appointmentId; }
    public String getCheckInTime() { return checkInTime; }
    public void setCheckInTime(String checkInTime) { this.checkInTime = checkInTime; }
    public String getCheckOutTime() { return checkOutTime; }
    public void setCheckOutTime(String checkOutTime) { this.checkOutTime = checkOutTime; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getHandledBy() { return handledBy; }
    public void setHandledBy(String handledBy) { this.handledBy = handledBy; }
}