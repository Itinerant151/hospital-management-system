package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/appointments")
public class AppointmentController {

    private static final List<String> STATUSES = List.of("Scheduled", "Completed", "Cancelled");

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private PatientRepository patientRepository;

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

        boolean clash = appointmentRepository.findByDoctorId(appointment.getDoctorId()).stream()
                .anyMatch(a -> !"Cancelled".equals(a.getStatus())
                        && appointment.getAppointmentDate().equals(a.getAppointmentDate()));

        if (clash) {
            throw new ApiException(409, "This time slot is already booked for the selected doctor.");
        }

        appointment.setId(null);
        if (isBlank(appointment.getStatus())) {
            appointment.setStatus("Scheduled");
        }

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

    @PutMapping("/{id}/status")
    public Appointment updateStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || !STATUSES.contains(status)) {
            throw new ApiException(400, "Status must be Scheduled, Completed or Cancelled.");
        }
        Appointment appointment = appointmentRepository.findById(id).orElseThrow();
        appointment.setStatus(status);
        return appointmentRepository.save(appointment);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}