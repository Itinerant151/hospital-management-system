package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/licences")
public class LicenceController {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;

    public LicenceController(UserRepository userRepository, DoctorRepository doctorRepository) {
        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
    }

    private Map<String, Object> view(User u) {
        String name = u.getFullName();
        if ((name == null || name.isBlank()) && u.getDoctorId() != null) {
            Doctor d = doctorRepository.findById(u.getDoctorId()).orElse(null);
            if (d != null) name = d.getName();
        }
        if (name == null || name.isBlank()) name = u.getUsername();

        LocalDate expiry = LicenceRules.parseDate(u.getLicenceExpiry());

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("name", name);
        m.put("username", u.getUsername());
        m.put("role", u.getRole());
        m.put("email", u.getEmail());
        m.put("licenceBody", u.getLicenceBody());
        m.put("licenceBodyName", LicenceRules.bodyName(u.getLicenceBody()));
        m.put("licenceNumber", u.getLicenceNumber());
        m.put("licenceExpiry", u.getLicenceExpiry());
        m.put("status", LicenceRules.effectiveStatus(u));
        m.put("checkedBy", u.getLicenceCheckedBy());
        m.put("checkedAt", u.getLicenceCheckedAt());
        m.put("note", u.getLicenceNote());
        m.put("registerUrl", LicenceRules.registerUrl(u.getLicenceBody()));
        m.put("daysLeft", expiry == null ? null : ChronoUnit.DAYS.between(LocalDate.now(), expiry));
        return m;
    }

    private int rank(String status) {
        if ("PENDING".equals(status)) return 0;
        if ("EXPIRED".equals(status)) return 1;
        if (status == null) return 2;
        if ("REJECTED".equals(status)) return 3;
        return 4;
    }

    private User find(String id) {
        User u = userRepository.findById(id).orElseThrow(() -> new ApiException(404, "Person not found."));
        if (!LicenceRules.required(u.getRole())) {
            throw new ApiException(400, "Licences are only recorded for doctors and laboratory staff.");
        }
        return u;
    }

    private String text(Map<String, Object> body, String key) {
        if (body == null) return "";
        Object value = body.get(key);
        return value == null ? "" : value.toString().trim();
    }

    private void stampCheck(User u, HttpServletRequest request) {
        u.setLicenceCheckedBy((String) request.getAttribute("username"));
        u.setLicenceCheckedAt(LocalDateTime.now().toString());
    }

    // Everyone who needs a licence: pending first, then expired, then no licence on file, then the rest
    @GetMapping
    public List<Map<String, Object>> list() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (User u : userRepository.findAll()) {
            if (LicenceRules.required(u.getRole())) out.add(view(u));
        }
        out.sort(Comparator.comparingInt((Map<String, Object> m) -> rank((String) m.get("status")))
                .thenComparing(m -> String.valueOf(m.get("name")).toLowerCase()));
        return out;
    }

    // The admin checked the number on the council's register and it is genuine
    @PutMapping("/{id}/verify")
    public Map<String, Object> verify(@PathVariable String id,
                                      @RequestBody(required = false) Map<String, Object> body,
                                      HttpServletRequest request) {
        User u = find(id);
        if (u.getLicenceNumber() == null || u.getLicenceNumber().isBlank()) {
            throw new ApiException(409, "No licence details are recorded for this person yet. Add them first.");
        }
        LocalDate expiry = LicenceRules.parseDate(u.getLicenceExpiry());
        if (expiry == null || expiry.isBefore(LocalDate.now())) {
            throw new ApiException(409, "This licence has expired. Update the expiry date once it has been renewed.");
        }
        u.setLicenceStatus("VERIFIED");
        stampCheck(u, request);
        String note = text(body, "note");
        u.setLicenceNote(note.isEmpty() ? null : note);
        userRepository.save(u);

        request.setAttribute("auditDetail", "Licence verified for " + u.getUsername()
                + " (" + u.getLicenceBody() + " " + u.getLicenceNumber() + ")");
        return view(u);
    }

    // The licence was not found on the register, or the details do not match
    @PutMapping("/{id}/reject")
    public Map<String, Object> reject(@PathVariable String id,
                                      @RequestBody Map<String, Object> body,
                                      HttpServletRequest request) {
        User u = find(id);
        String note = text(body, "note");
        if (note.length() < 3) {
            throw new ApiException(400, "Say briefly why the licence is being rejected.");
        }
        u.setLicenceStatus("REJECTED");
        stampCheck(u, request);
        u.setLicenceNote(note);
        userRepository.save(u);

        request.setAttribute("auditDetail", "Licence rejected for " + u.getUsername() + ": " + note);
        return view(u);
    }

    // Add or correct the details (for older accounts, renewals and typing mistakes).
    // With checked = true the admin confirms they checked it on the official register.
    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable String id,
                                      @RequestBody Map<String, Object> body,
                                      HttpServletRequest request) {
        User u = find(id);
        String licenceBody = text(body, "licenceBody");
        String number = LicenceRules.cleanNumber(text(body, "licenceNumber"));
        String expiry = text(body, "licenceExpiry");
        LicenceRules.validate(licenceBody, number, expiry);

        u.setLicenceBody(licenceBody);
        u.setLicenceNumber(number);
        u.setLicenceExpiry(expiry);
        if (Boolean.parseBoolean(text(body, "checked"))) {
            u.setLicenceStatus("VERIFIED");
            stampCheck(u, request);
        } else {
            u.setLicenceStatus("PENDING");
            u.setLicenceCheckedBy(null);
            u.setLicenceCheckedAt(null);
        }
        u.setLicenceNote(null);
        userRepository.save(u);

        request.setAttribute("auditDetail", "Licence details saved for " + u.getUsername()
                + " (" + licenceBody + " " + number + ", status " + u.getLicenceStatus() + ")");
        return view(u);
    }
}