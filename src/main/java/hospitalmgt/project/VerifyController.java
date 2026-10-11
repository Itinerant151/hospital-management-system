package hospitalmgt.project;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/verify")
public class VerifyController {

    private final MongoTemplate mongo;

    public VerifyController(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    private String roleLabel(String role) {
        if (role == null) return "Staff";
        switch (role) {
            case "ADMIN": return "Administrator";
            case "DOCTOR": return "Doctor";
            case "RECEPTIONIST": return "Receptionist";
            case "LAB_STAFF": return "Laboratory Staff";
            default: return role;
        }
    }

    // Public: only returns name, role and card number, nothing private
    @GetMapping("/staff/{code}")
    public ResponseEntity<?> verifyStaff(@PathVariable String code) {
        String wanted = code == null ? "" : code.trim().toUpperCase();
        List<User> matches = new ArrayList<>();

        if (wanted.startsWith("MC-S-")) {
            List<User> staff = mongo.find(Query.query(Criteria.where("role").ne("PATIENT")), User.class);
            for (User u : staff) {
                if (!u.isApproved() || u.getId() == null) continue;
                String id = u.getId();
                String tail = (id.length() > 6 ? id.substring(id.length() - 6) : id).toUpperCase();
                if (("MC-S-" + tail).equals(wanted)) matches.add(u);
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        if (matches.size() != 1) {
            out.put("valid", false);
            return ResponseEntity.ok(out);
        }

        User u = matches.get(0);
        out.put("valid", true);
        out.put("cardNumber", wanted);
        out.put("name", (u.getFullName() != null && !u.getFullName().isBlank()) ? u.getFullName() : u.getUsername());
        out.put("roleLabel", roleLabel(u.getRole()));
        return ResponseEntity.ok(out);
    }
}