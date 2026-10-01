package hospitalmgt.project;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Runs every minute and marks any "Scheduled" appointment as "Completed"
 * once its date/time has passed. Cancelled appointments are left alone.
 */
@Service
public class AppointmentStatusScheduler {

    private static final DateTimeFormatter FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");

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
            if (when != null && when.isBefore(now)) {
                appt.setStatus("Completed");
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