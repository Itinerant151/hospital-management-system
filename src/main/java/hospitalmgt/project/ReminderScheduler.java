package hospitalmgt.project;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Runs every hour and generates demo reminders for any "Scheduled" appointment
 * that hasn't had a reminder sent yet. This is demo-only: reminders are just
 * saved to the reminders collection (shown in Notifications.jsx) rather than
 * actually emailed anywhere.
 *
 * Also exposed via a manual "run now" endpoint (POST /api/reminders/generate)
 * for demoing without waiting on the schedule.
 */
@Service
public class ReminderScheduler {

    @Autowired
    private ReminderRepository reminderRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BillRepository billRepository;

    @Scheduled(fixedRate = 60 * 60 * 1000)
    public void generateUpcomingReminders() {
        runNow();
    }

    public int runNow() {
        List<Appointment> pending = appointmentRepository.findByReminderSentFalse();
        int created = 0;

        for (Appointment appt : pending) {
            if (!"Scheduled".equalsIgnoreCase(appt.getStatus())) {
                continue;
            }

            patientRepository.findById(appt.getPatientId()).ifPresent(patient -> {
                User patientUser = userRepository.findByPatientId(patient.getId());
                String recipient = patientUser != null ? patientUser.getUsername() : patient.getName();
                reminderRepository.save(new Reminder(
                        recipient, "PATIENT",
                        "Reminder: you have an appointment on " + appt.getAppointmentDate()
                                + (appt.getReason() != null ? " (" + appt.getReason() + ")" : ""),
                        appt.getId()));
            });

            doctorRepository.findById(appt.getDoctorId()).ifPresent(doctor -> {
                User doctorUser = userRepository.findByDoctorId(doctor.getId());
                String recipient = doctorUser != null ? doctorUser.getUsername() : doctor.getName();
                reminderRepository.save(new Reminder(
                        recipient, "DOCTOR",
                        "Reminder: you have an appointment on " + appt.getAppointmentDate(),
                        appt.getId()));
            });

            appt.setReminderSent(true);
            appointmentRepository.save(appt);
            created++;
        }

        List<Bill> pendingBills = billRepository.findByStatus("PENDING");
        for (Bill bill : pendingBills) {
            if (bill.isPaymentReminderSent()) continue;
            patientRepository.findById(bill.getPatientId()).ifPresent(patient -> {
                User patientUser = userRepository.findByPatientId(patient.getId());
                String recipient = patientUser != null ? patientUser.getUsername() : patient.getName();
                String recipientRole = patientUser != null ? "PATIENT" : "EMERGENCY_PATIENT";
                reminderRepository.save(new Reminder(
                        recipient, recipientRole,
                        "Payment reminder: outstanding hospital bill of ₦"
                                + String.format("%.2f", bill.getTotal())
                                + ".",
                        null));
                bill.setPaymentReminderSent(true);
                billRepository.save(bill);
            });
        }

        return created;
    }
}
