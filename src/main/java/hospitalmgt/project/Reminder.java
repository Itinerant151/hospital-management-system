package hospitalmgt.project;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "reminders")
public class Reminder {

    @Id
    private String id;

    private String recipientEmail; // in-app only — logged, not actually emailed
    private String recipientRole;  // "PATIENT" or "DOCTOR"
    private String message;
    private String relatedAppointmentId;
    private LocalDateTime sentAt = LocalDateTime.now();
    private boolean read = false;

    public Reminder() {}

    public Reminder(String recipientEmail, String recipientRole, String message, String relatedAppointmentId) {
        this.recipientEmail = recipientEmail;
        this.recipientRole = recipientRole;
        this.message = message;
        this.relatedAppointmentId = relatedAppointmentId;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; }
    public String getRecipientRole() { return recipientRole; }
    public void setRecipientRole(String recipientRole) { this.recipientRole = recipientRole; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getRelatedAppointmentId() { return relatedAppointmentId; }
    public void setRelatedAppointmentId(String relatedAppointmentId) { this.relatedAppointmentId = relatedAppointmentId; }
    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }
    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
}
