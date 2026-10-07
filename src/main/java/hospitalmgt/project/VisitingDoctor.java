package hospitalmgt.project;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Extra details for a doctor who only visits the hospital on certain days.
 * Linked to the normal Doctor record by doctorId.
 */
@Document(collection = "visiting_doctors")
public class VisitingDoctor {

    @Id
    private String id;
    private String doctorId;
    private double consultationFee;
    private double hospitalSharePercent; // the part of each fee the hospital keeps (0 to 100)
    private boolean active = true;       // false = paused, no new bookings
    private List<ScheduleSlot> schedule = new ArrayList<>();
    private LocalDateTime createdAt = LocalDateTime.now();

    /** One weekly visiting window, for example MONDAY 09:00 to 13:00. */
    public static class ScheduleSlot {
        private String day;       // MONDAY ... SUNDAY
        private String startTime; // HH:mm
        private String endTime;   // HH:mm (the last bookable hour ends here)

        public ScheduleSlot() {}
        public ScheduleSlot(String day, String startTime, String endTime) {
            this.day = day;
            this.startTime = startTime;
            this.endTime = endTime;
        }
        public String getDay() { return day; }
        public void setDay(String day) { this.day = day; }
        public String getStartTime() { return startTime; }
        public void setStartTime(String startTime) { this.startTime = startTime; }
        public String getEndTime() { return endTime; }
        public void setEndTime(String endTime) { this.endTime = endTime; }
    }

    public VisitingDoctor() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }
    public double getConsultationFee() { return consultationFee; }
    public void setConsultationFee(double consultationFee) { this.consultationFee = consultationFee; }
    public double getHospitalSharePercent() { return hospitalSharePercent; }
    public void setHospitalSharePercent(double hospitalSharePercent) { this.hospitalSharePercent = hospitalSharePercent; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public List<ScheduleSlot> getSchedule() { return schedule; }
    public void setSchedule(List<ScheduleSlot> schedule) { this.schedule = schedule; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}