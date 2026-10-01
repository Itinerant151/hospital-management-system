package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/frontdesk")
public class CheckInController {

    private final CheckInRepository repository;
    private final PatientRepository patientRepository;

    public CheckInController(CheckInRepository repository, PatientRepository patientRepository) {
        this.repository = repository;
        this.patientRepository = patientRepository;
    }

    // Newest check-ins first
    @GetMapping
    public List<CheckIn> getAll() {
        return repository.findAll().stream()
                .sorted(Comparator.comparing(
                        (CheckIn c) -> c.getCheckInTime() == null ? "" : c.getCheckInTime()).reversed())
                .toList();
    }

    @PostMapping("/check-in")
    public CheckIn checkIn(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String type = body.get("type") == null ? "" : body.get("type").trim().toUpperCase();
        if (!type.equals("PATIENT") && !type.equals("STAFF")) {
            throw new ApiException(400, "Type must be PATIENT or STAFF.");
        }

        String personId = blankToNull(body.get("personId"));
        String personName = blankToNull(body.get("personName"));

        if (type.equals("PATIENT")) {
            if (personId == null) {
                throw new ApiException(400, "Select the patient who is checking in.");
            }
            Patient patient = patientRepository.findById(personId)
                    .orElseThrow(() -> new ApiException(404, "Patient not found."));
            personName = patient.getName();
        }

        if (personName == null) {
            throw new ApiException(400, "Enter the name of the person checking in.");
        }

        if (isAlreadyIn(type, personId, personName)) {
            throw new ApiException(409, personName + " is already checked in.");
        }

        CheckIn entry = new CheckIn();
        entry.setType(type);
        entry.setPersonId(personId);
        entry.setPersonName(personName);
        entry.setPurpose(blankToNull(body.get("purpose")));
        entry.setAppointmentId(blankToNull(body.get("appointmentId")));
        entry.setCheckInTime(now());
        entry.setStatus("Checked In");
        entry.setHandledBy((String) request.getAttribute("username"));
        return repository.save(entry);
    }

    @PutMapping("/{id}/check-out")
    public CheckIn checkOut(@PathVariable String id) {
        CheckIn entry = repository.findById(id)
                .orElseThrow(() -> new ApiException(404, "Check-in record not found."));
        if ("Checked Out".equals(entry.getStatus())) {
            throw new ApiException(409, entry.getPersonName() + " is already checked out.");
        }
        entry.setCheckOutTime(now());
        entry.setStatus("Checked Out");
        return repository.save(entry);
    }

    private boolean isAlreadyIn(String type, String personId, String personName) {
        return repository.findByStatus("Checked In").stream().anyMatch(c ->
                Objects.equals(c.getType(), type)
                        && (personId != null
                        ? personId.equals(c.getPersonId())
                        : personName.equalsIgnoreCase(c.getPersonName())));
    }

    private String now() {
        return LocalDateTime.now().withNano(0).toString();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}