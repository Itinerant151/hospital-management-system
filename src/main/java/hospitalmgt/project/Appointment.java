package hospitalmgt.project;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "appointments")
public class Appointment {

    @Id
    private String id;

    private String patientId;
    private String doctorId;
    private String appointmentDate; // stored as a String for simplicity, e.g. "2026-09-20T10:00"
    private String reason;
    private String status; // "Scheduled", "Completed", "Missed", "Cancelled"
    private boolean reminderSent = false;

    // Set when reception confirms the patient actually came. Only attended visits are charged.
    private boolean attendanceConfirmed = false;
    private LocalDateTime checkedInAt;
    private String checkedInBy;

    // Constructors
    public Appointment() {
    }

    public Appointment(String patientId, String doctorId, String appointmentDate, String reason, String status) {
        this.patientId = patientId;
        this.doctorId = doctorId;
        this.appointmentDate = appointmentDate;
        this.reason = reason;
        this.status = status;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getPatientId() {
        return patientId;
    }

    public void setPatientId(String patientId) {
        this.patientId = patientId;
    }

    public String getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(String doctorId) {
        this.doctorId = doctorId;
    }

    public String getAppointmentDate() {
        return appointmentDate;
    }

    public void setAppointmentDate(String appointmentDate) {
        this.appointmentDate = appointmentDate;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public boolean isReminderSent() {
        return reminderSent;
    }

    public void setReminderSent(boolean reminderSent) {
        this.reminderSent = reminderSent;
    }

    public boolean isAttendanceConfirmed() {
        return attendanceConfirmed;
    }

    public void setAttendanceConfirmed(boolean attendanceConfirmed) {
        this.attendanceConfirmed = attendanceConfirmed;
    }

    public LocalDateTime getCheckedInAt() {
        return checkedInAt;
    }

    public void setCheckedInAt(LocalDateTime checkedInAt) {
        this.checkedInAt = checkedInAt;
    }

    public String getCheckedInBy() {
        return checkedInBy;
    }

    public void setCheckedInBy(String checkedInBy) {
        this.checkedInBy = checkedInBy;
    }
}