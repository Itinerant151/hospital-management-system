package hospitalmgt.project;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/id-cards")
public class IdCardController {

    private final MongoTemplate mongo;

    public IdCardController(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    // ---------- helpers ----------

    private User currentUser(Authentication auth) {
        if (auth == null) return null;
        String name = auth.getName();
        User u = mongo.findOne(Query.query(Criteria.where("username").is(name)), User.class);
        if (u == null) {
            u = mongo.findOne(Query.query(Criteria.where("email").is(name)), User.class);
        }
        return u;
    }

    private boolean hasRole(User u, String... roles) {
        if (u == null || u.getRole() == null) return false;
        for (String r : roles) {
            if (r.equals(u.getRole())) return true;
        }
        return false;
    }

    private String shortCode(String id) {
        if (id == null) return "000000";
        String code = id.length() > 6 ? id.substring(id.length() - 6) : id;
        return code.toUpperCase();
    }

    private String roleLabel(String role) {
        if (role == null) return "Staff";
        switch (role) {
            case "ADMIN": return "Administrator";
            case "DOCTOR": return "Doctor";
            case "RECEPTIONIST": return "Receptionist";
            case "LAB_STAFF": return "Laboratory Staff";
            case "PATIENT": return "Patient";
            default: return role;
        }
    }

    private Map<String, Object> patientCard(Patient p) {
        Map<String, Object> card = new LinkedHashMap<>();
        card.put("type", "PATIENT");
        card.put("cardNumber", "MC-P-" + shortCode(p.getId()));
        card.put("name", p.getName());
        card.put("gender", p.getGender());
        card.put("dateOfBirth", p.getDateOfBirth());
        card.put("bloodGroup", p.getBloodGroup());
        card.put("rhFactor", p.getRhFactor());
        card.put("allergies", p.getAllergies());
        card.put("phoneNumber", p.getPhoneNumber());
        card.put("emergencyContactName", p.getEmergencyContactName());
        card.put("emergencyContactPhone", p.getEmergencyContactPhone());
        card.put("insuranceProvider", p.getInsuranceProvider());
        card.put("insuranceNumber", p.getInsuranceNumber());
        card.put("emergencyPatient", p.isEmergencyPatient());
        card.put("issuedOn", LocalDate.now().toString());
        return card;
    }

    private Map<String, Object> staffCard(User u) {
        Map<String, Object> card = new LinkedHashMap<>();
        String name = (u.getFullName() != null && !u.getFullName().isBlank())
                ? u.getFullName() : u.getUsername();
        card.put("type", "STAFF");
        card.put("cardNumber", "MC-S-" + shortCode(u.getId()));
        card.put("name", name);
        card.put("role", u.getRole());
        card.put("roleLabel", roleLabel(u.getRole()));
        card.put("username", u.getUsername());
        card.put("email", u.getEmail());
        card.put("phoneNumber", u.getPhoneNumber());
        card.put("issuedOn", LocalDate.now().toString());
        return card;
    }

    // ---------- endpoints ----------

    // The logged-in user's own card
    @GetMapping("/me")
    public ResponseEntity<?> myCard(Authentication auth) {
        User me = currentUser(auth);
        if (me == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Not logged in"));
        }
        if ("PATIENT".equals(me.getRole()) && me.getPatientId() != null) {
            Patient p = mongo.findById(me.getPatientId(), Patient.class);
            if (p != null) return ResponseEntity.ok(patientCard(p));
        }
        return ResponseEntity.ok(staffCard(me));
    }

    // List of patients to pick from (admin, receptionist)
    @GetMapping("/patients")
    public ResponseEntity<?> patientList(Authentication auth) {
        User me = currentUser(auth);
        if (!hasRole(me, "ADMIN", "RECEPTIONIST")) {
            return ResponseEntity.status(403).body(Map.of("message", "Not allowed"));
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (Patient p : mongo.findAll(Patient.class)) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", p.getId());
            row.put("name", p.getName());
            out.add(row);
        }
        return ResponseEntity.ok(out);
    }

    // One patient's card (admin, receptionist, doctor)
    @GetMapping("/patient/{id}")
    public ResponseEntity<?> patientCardById(@PathVariable String id, Authentication auth) {
        User me = currentUser(auth);
        if (!hasRole(me, "ADMIN", "RECEPTIONIST", "DOCTOR")) {
            return ResponseEntity.status(403).body(Map.of("message", "Not allowed"));
        }
        Patient p = mongo.findById(id, Patient.class);
        if (p == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Patient not found"));
        }
        return ResponseEntity.ok(patientCard(p));
    }

    // List of staff to pick from (admin only)
    @GetMapping("/staff")
    public ResponseEntity<?> staffList(Authentication auth) {
        User me = currentUser(auth);
        if (!hasRole(me, "ADMIN")) {
            return ResponseEntity.status(403).body(Map.of("message", "Not allowed"));
        }
        List<Map<String, Object>> out = new ArrayList<>();
        List<User> users = mongo.find(Query.query(Criteria.where("role").ne("PATIENT")), User.class);
        for (User u : users) {
            if (!u.isApproved()) continue;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", u.getId());
            row.put("name", (u.getFullName() != null && !u.getFullName().isBlank())
                    ? u.getFullName() : u.getUsername());
            row.put("role", roleLabel(u.getRole()));
            out.add(row);
        }
        return ResponseEntity.ok(out);
    }

    // One staff member's card (admin only)
    @GetMapping("/staff/{id}")
    public ResponseEntity<?> staffCardById(@PathVariable String id, Authentication auth) {
        User me = currentUser(auth);
        if (!hasRole(me, "ADMIN")) {
            return ResponseEntity.status(403).body(Map.of("message", "Not allowed"));
        }
        User u = mongo.findById(id, User.class);
        if (u == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
        return ResponseEntity.ok(staffCard(u));
    }
}