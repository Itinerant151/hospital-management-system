package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/appointments")
public class AppointmentController {

    private static final List<String> STATUSES = List.of("Scheduled", "Completed", "Missed", "Cancelled");

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private VisitingScheduleService visitingScheduleService;

    @GetMapping
    public List<Appointment> getAllAppointments() {
        return appointmentRepository.findAll();
    }

    @GetMapping("/mine")
    public List<Appointment> getMyAppointments(HttpServletRequest request) {
        String patientId = (String) request.getAttribute("patientId");
        return appointmentRepository.findByPatientId(patientId);
    }

    // Returns the list of already-booked time slots ("HH:mm") for a doctor on a given date ("yyyy-MM-dd")
    @GetMapping("/availability")
    public List<String> getAvailability(@RequestParam String doctorId, @RequestParam String date) {
        return appointmentRepository.findByDoctorId(doctorId).stream()
                .filter(a -> !"Cancelled".equals(a.getStatus()))
                .filter(a -> a.getAppointmentDate() != null && a.getAppointmentDate().startsWith(date))
                .map(a -> a.getAppointmentDate().length() >= 16 ? a.getAppointmentDate().substring(11, 16) : "")
                .filter(t -> !t.isEmpty())
                .toList();
    }

    // Patients book for themselves; receptionists book for a patient. Administrators cannot book.
    @PostMapping
    public Appointment addAppointment(@RequestBody Appointment appointment, HttpServletRequest request) {
        String role = (String) request.getAttribute("role");

        if ("ADMIN".equals(role)) {
            throw new ApiException(403, "Administrators cannot book appointments.");
        }

        if ("PATIENT".equals(role)) {
            String ownPatientId = (String) request.getAttribute("patientId");
            appointment.setPatientId(ownPatientId);
        }

        if (isBlank(appointment.getPatientId()) || isBlank(appointment.getDoctorId())
                || isBlank(appointment.getAppointmentDate())) {
            throw new ApiException(400, "Patient, doctor, date and time are required.");
        }

        if (!patientRepository.existsById(appointment.getPatientId())) {
            throw new ApiException(404, "Patient not found.");
        }

        // Visiting doctors can only be booked inside their weekly schedule
        visitingScheduleService.checkBooking(appointment.getDoctorId(), appointment.getAppointmentDate());

        boolean clash = appointmentRepository.findByDoctorId(appointment.getDoctorId()).stream()
                .anyMatch(a -> !"Cancelled".equals(a.getStatus())
                        && appointment.getAppointmentDate().equals(a.getAppointmentDate()));

        if (clash) {
            throw new ApiException(409, "This time slot is already booked for the selected doctor.");
        }

        // A new booking always starts as Scheduled and unconfirmed, whatever the browser sent
        appointment.setId(null);
        appointment.setStatus("Scheduled");
        appointment.setAttendanceConfirmed(false);
        appointment.setCheckedInAt(null);
        appointment.setCheckedInBy(null);
        appointment.setReminderSent(false);

        return appointmentRepository.save(appointment);
    }

    @GetMapping("/{id}")
    public Appointment getAppointmentById(@PathVariable String id) {
        return appointmentRepository.findById(id).orElse(null);
    }

    @DeleteMapping("/{id}")
    public String deleteAppointment(@PathVariable String id, HttpServletRequest request) {
        String role = (String) request.getAttribute("role");

        if ("PATIENT".equals(role)) {
            String ownPatientId = (String) request.getAttribute("patientId");
            Appointment appointment = appointmentRepository.findById(id).orElseThrow();
            if (!appointment.getPatientId().equals(ownPatientId)) {
                throw new ApiException(403, "You can only cancel your own appointments");
            }
        }

        appointmentRepository.deleteById(id);
        return "Appointment deleted successfully";
    }

    // Reception confirms the patient came for the appointment. Only attended visits are charged.
    @PutMapping("/{id}/check-in")
    public Appointment checkIn(@PathVariable String id, HttpServletRequest request) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ApiException(404, "Appointment not found."));

        if ("Cancelled".equals(appointment.getStatus())) {
            throw new ApiException(409, "This appointment was cancelled.");
        }
        if (appointment.isAttendanceConfirmed()) {
            throw new ApiException(409, "This patient has already been checked in.");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime when = parseDate(appointment.getAppointmentDate());
        if (when != null && when.toLocalDate().isAfter(LocalDate.now())) {
            throw new ApiException(409, "This appointment is on a later day. Check the patient in on the day of the appointment.");
        }

        appointment.setAttendanceConfirmed(true);
        appointment.setCheckedInAt(now.withNano(0));
        appointment.setCheckedInBy((String) request.getAttribute("username"));

        // If the time has already passed (even if it was marked Missed), the visit is now complete
        if (!"Scheduled".equals(appointment.getStatus()) || (when != null && when.isBefore(now))) {
            appointment.setStatus("Completed");
        }

        String name = patientRepository.findById(appointment.getPatientId()).map(Patient::getName).orElse("Patient");
        request.setAttribute("auditDetail", name + " checked in for the appointment on " + appointment.getAppointmentDate());
        return appointmentRepository.save(appointment);
    }

    @PutMapping("/{id}/status")
    public Appointment updateStatus(@PathVariable String id, @RequestBody Map<String, String> body,
                                    HttpServletRequest request) {
        String status = body.get("status");
        if (status == null || !STATUSES.contains(status)) {
            throw new ApiException(400, "Status must be Scheduled, Completed, Missed or Cancelled.");
        }
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ApiException(404, "Appointment not found."));

        // A checked-in patient has been (or is about to be) charged, so the visit stays Completed
        if (appointment.isAttendanceConfirmed() && !"Completed".equals(status)) {
            throw new ApiException(409, "This patient has been checked in, so the appointment can only stay Completed.");
        }

        // Marking a visit Completed by hand means the patient attended
        if ("Completed".equals(status) && !appointment.isAttendanceConfirmed()) {
            appointment.setAttendanceConfirmed(true);
            appointment.setCheckedInAt(LocalDateTime.now().withNano(0));
            appointment.setCheckedInBy((String) request.getAttribute("username"));
        }

        appointment.setStatus(status);
        return appointmentRepository.save(appointment);
    }

    private LocalDateTime parseDate(String value) {
        if (value == null || value.length() < 16) return null;
        try {
            return LocalDateTime.parse(value.substring(0, 16));
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}