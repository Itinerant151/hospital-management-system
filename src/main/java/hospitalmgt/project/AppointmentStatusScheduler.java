package hospitalmgt.project;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Runs every minute on "Scheduled" appointments whose time has passed:
 * - if reception confirmed the patient came, the appointment becomes "Completed";
 * - if nobody confirmed it, it becomes "Missed" once an hour has passed (a late patient can still be checked in).
 * Cancelled appointments are left alone.
 */
@Service
public class AppointmentStatusScheduler {

    private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
    private static final int MISSED_AFTER_HOURS = 1;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Scheduled(fixedRate = 60 * 1000)
    public void completePastAppointments() {
        LocalDateTime now = LocalDateTime.now();
        List<Appointment> scheduled = appointmentRepository.findAll().stream()
                .filter(a -> "Scheduled".equalsIgnoreCase(a.getStatus()))
                .toList();

        for (Appointment appt : scheduled) {
            LocalDateTime when = parse(appt.getAppointmentDate());
            if (when == null) continue;

            if (appt.isAttendanceConfirmed()) {
                if (when.isBefore(now)) {
                    appt.setStatus("Completed");
                    appointmentRepository.save(appt);
                }
            } else if (when.plusHours(MISSED_AFTER_HOURS).isBefore(now)) {
                appt.setStatus("Missed");
                appointmentRepository.save(appt);
            }
        }
    }

    private LocalDateTime parse(String value) {
        if (value == null || value.length() < 16) return null;
        try {
            return LocalDateTime.parse(value.length() == 16 ? value : value.substring(0, 16), FORMAT);
        } catch (Exception e) {
            return null;
        }
    }
}