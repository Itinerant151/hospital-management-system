package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/visitation")
public class VisitationController {

    private final VisitorRepository repository;

    public VisitationController(VisitorRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Visitor> getAll() {
        return repository.findAll();
    }

    @GetMapping("/mine")
    public List<Visitor> getMine(HttpServletRequest request) {
        String patientId = (String) request.getAttribute("patientId");
        if (patientId == null) throw new ApiException(400, "No patient record is linked to this account.");
        return repository.findByPatientId(patientId);
    }

    @PostMapping
    public Visitor create(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String patientId = (String) request.getAttribute("patientId");
        if (patientId == null) throw new ApiException(400, "No patient record is linked to this account.");

        String visitorName = body.get("visitorName");
        String visitDate = body.get("visitDate");
        String timeSlot = body.get("timeSlot");
        if (visitorName == null || visitorName.isBlank() || visitDate == null || visitDate.isBlank()
                || timeSlot == null || timeSlot.isBlank()) {
            throw new ApiException(400, "Visitor name, visit date and time slot are required.");
        }

        Visitor visitor = new Visitor(
                patientId, visitorName, body.getOrDefault("phoneNumber", ""),
                body.getOrDefault("relation", ""), visitDate, timeSlot, "Scheduled"
        );
        return repository.save(visitor);
    }

    @PutMapping("/{id}/status")
    public Visitor updateStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        Visitor visitor = repository.findById(id).orElseThrow(() -> new ApiException(404, "Visit not found"));
        visitor.setStatus(body.get("status"));
        return repository.save(visitor);
    }

    @DeleteMapping("/{id}")
    public String delete(@PathVariable String id, HttpServletRequest request) {
        Visitor visitor = repository.findById(id).orElseThrow(() -> new ApiException(404, "Visit not found"));

        String role = (String) request.getAttribute("role");
        if ("PATIENT".equals(role)) {
            String ownPatientId = (String) request.getAttribute("patientId");
            if (!visitor.getPatientId().equals(ownPatientId)) {
                throw new ApiException(403, "You can only cancel your own visits.");
            }
        }

        repository.deleteById(id);
        return "Visit cancelled";
    }
}