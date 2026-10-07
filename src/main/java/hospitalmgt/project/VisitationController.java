package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/visitation")
public class VisitationController {

    private static final List<String> STATUSES = List.of("Scheduled", "Checked In", "Checked Out", "Cancelled");

    private final VisitorRepository repository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;

    public VisitationController(VisitorRepository repository, PatientRepository patientRepository,
                                UserRepository userRepository) {
        this.repository = repository;
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
    }

    // Every visit, newest first (staff)
    @GetMapping
    public List<Visitor> getAll() {
        return newestFirst(repository.findAll());
    }

    // Visits to the logged-in patient
    @GetMapping("/mine")
    public List<Visitor> getMine(HttpServletRequest request) {
        return newestFirst(repository.findByPatientId(ownPatientId(request)));
    }

    // Visits the logged-in patient is making to other patients
    @GetMapping("/mine-visiting")
    public List<Visitor> getMineVisiting(HttpServletRequest request) {
        return newestFirst(repository.findByVisitorPatientId(ownPatientId(request)));
    }

    // Patients who have a login account, so the logbook can say a visitor is one of them
    @GetMapping("/account-patients")
    public List<Map<String, String>> accountPatients() {
        Set<String> ids = userRepository.findAll().stream()
                .map(User::getPatientId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<Map<String, String>> result = new ArrayList<>();
        for (Patient patient : patientRepository.findAllById(ids)) {
            Map<String, String> entry = new LinkedHashMap<>();
            entry.put("id", patient.getId());
            entry.put("name", patient.getName() == null ? "" : patient.getName());
            result.add(entry);
        }
        result.sort(Comparator.comparing(m -> m.get("name").toLowerCase()));
        return result;
    }

    // A patient books a visitor to see them
    @PostMapping
    public Visitor create(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String patientId = ownPatientId(request);

        String visitorName = clean(body.get("visitorName"));
        String visitDate = clean(body.get("visitDate"));
        String timeSlot = clean(body.get("timeSlot"));
        if (visitorName.isEmpty() || visitDate.isEmpty() || timeSlot.isEmpty()) {
            throw new ApiException(400, "Visitor name, visit date and time slot are required.");
        }

        Visitor visitor = new Visitor(
                patientId, visitorName, clean(body.get("phoneNumber")),
                clean(body.get("relation")), visitDate, timeSlot, "Scheduled"
        );
        visitor.setPatientName(patientRepository.findById(patientId).map(Patient::getName).orElse(null));
        visitor.setSource("BOOKED");
        return repository.save(visitor);
    }

    // Front desk logbook: someone arrives without a booking. They are checked in straight away.
    @PostMapping("/walk-in")
    public Visitor walkIn(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String patientId = clean(body.get("patientId"));
        Patient visited = patientId.isEmpty() ? null : patientRepository.findById(patientId).orElse(null);
        if (visited == null) throw new ApiException(404, "Choose the patient being visited.");

        String visitorName = clean(body.get("visitorName"));
        String phone = clean(body.get("phoneNumber"));
        String visitorPatientId = clean(body.get("visitorPatientId"));
        String visitorPatientName = null;

        // The visitor may themselves be a patient with an account at the hospital
        if (!visitorPatientId.isEmpty()) {
            if (visitorPatientId.equals(patientId)) {
                throw new ApiException(400, "A patient cannot be logged as visiting themselves.");
            }
            Patient visitorPatient = patientRepository.findById(visitorPatientId)
                    .orElseThrow(() -> new ApiException(404, "The visitor's patient record was not found."));
            if (userRepository.findByPatientId(visitorPatientId) == null) {
                throw new ApiException(400, "That patient does not have an account with the hospital.");
            }
            visitorName = visitorPatient.getName();
            visitorPatientName = visitorPatient.getName();
            if (phone.isEmpty() && visitorPatient.getPhoneNumber() != null) phone = visitorPatient.getPhoneNumber();
        }
        if (visitorName.isEmpty()) throw new ApiException(400, "Enter the visitor's name.");

        LocalDateTime now = LocalDateTime.now().withNano(0);
        String time = now.toString().substring(11, 16);

        Visitor visitor = new Visitor(patientId, visitorName, phone, clean(body.get("relation")),
                LocalDate.now().toString(), time, "Checked In");
        visitor.setPatientName(visited.getName());
        visitor.setVisitorPatientId(visitorPatientId.isEmpty() ? null : visitorPatientId);
        visitor.setVisitorPatientName(visitorPatientName);
        visitor.setPurpose(clean(body.get("purpose")));
        visitor.setSource("WALK_IN");
        visitor.setCheckInTime(now.toString());
        visitor.setLoggedBy((String) request.getAttribute("username"));

        Visitor saved = repository.save(visitor);
        request.setAttribute("auditDetail", "Visitor " + visitorName + " logged in to visit " + visited.getName());
        return saved;
    }

    @PutMapping("/{id}/status")
    public Visitor updateStatus(@PathVariable String id, @RequestBody Map<String, String> body,
                                HttpServletRequest request) {
        Visitor visitor = repository.findById(id).orElseThrow(() -> new ApiException(404, "Visit not found"));

        String status = clean(body.get("status"));
        if (!STATUSES.contains(status)) {
            throw new ApiException(400, "Status must be Scheduled, Checked In, Checked Out or Cancelled.");
        }

        String now = LocalDateTime.now().withNano(0).toString();
        if (status.equals("Checked In")) {
            if (visitor.getCheckInTime() == null) visitor.setCheckInTime(now);
            visitor.setCheckOutTime(null);
        } else if (status.equals("Checked Out")) {
            if (visitor.getCheckInTime() == null) visitor.setCheckInTime(now);
            visitor.setCheckOutTime(now);
        }

        visitor.setStatus(status);
        visitor.setLoggedBy((String) request.getAttribute("username"));
        request.setAttribute("auditDetail", "Visitor " + visitor.getVisitorName() + " marked " + status);
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

    private String ownPatientId(HttpServletRequest request) {
        String patientId = (String) request.getAttribute("patientId");
        if (patientId == null) throw new ApiException(400, "No patient record is linked to this account.");
        return patientId;
    }

    private List<Visitor> newestFirst(List<Visitor> list) {
        return list.stream()
                .sorted(Comparator.comparing(this::sortKey).reversed())
                .toList();
    }

    private String sortKey(Visitor v) {
        if (v.getCheckInTime() != null) return v.getCheckInTime();
        return (v.getVisitDate() == null ? "" : v.getVisitDate()) + "T" + (v.getTimeSlot() == null ? "" : v.getTimeSlot());
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}