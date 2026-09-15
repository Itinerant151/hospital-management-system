package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/appointments")
public class AppointmentController {

    @Autowired
    private AppointmentRepository appointmentRepository;

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

    @PostMapping
    public Appointment addAppointment(@RequestBody Appointment appointment, HttpServletRequest request) {
        String role = (String) request.getAttribute("role");
        if ("PATIENT".equals(role)) {
            String ownPatientId = (String) request.getAttribute("patientId");
            appointment.setPatientId(ownPatientId);
        }

        boolean clash = appointmentRepository.findByDoctorId(appointment.getDoctorId()).stream()
                .anyMatch(a -> !"Cancelled".equals(a.getStatus())
                        && a.getAppointmentDate().equals(appointment.getAppointmentDate()));

        if (clash) {
            throw new RuntimeException("This time slot is already booked for the selected doctor.");
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
                throw new RuntimeException("You can only cancel your own appointments");
            }
        }

        appointmentRepository.deleteById(id);
        return "Appointment deleted successfully";
    }

    @PutMapping("/{id}/status")
    public Appointment updateStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        Appointment appointment = appointmentRepository.findById(id).orElseThrow();
        appointment.setStatus(body.get("status"));
        return appointmentRepository.save(appointment);
    }
}