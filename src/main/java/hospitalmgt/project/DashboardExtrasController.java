package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardExtrasController {

    // Lab orders in these states are finished or dropped, so they are not "in progress"
    private static final List<String> LAB_DONE = List.of("COMPLETED", "CANCELLED", "CANCELED");

    private final MongoTemplate mongo;
    private final UserRepository userRepository;

    public DashboardExtrasController(MongoTemplate mongo, UserRepository userRepository) {
        this.mongo = mongo;
        this.userRepository = userRepository;
    }

    private Map<String, Object> card(String label, long value) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("label", label);
        c.put("value", value);
        c.put("kind", "count");
        return c;
    }

    private long labInProgress(String ownerField, String ownerId) {
        Criteria c = Criteria.where("status").nin(LAB_DONE);
        if (ownerField != null) c = c.and(ownerField).is(ownerId);
        return mongo.count(new Query(c), "laboratory_orders");
    }

    private long labCompleted(String ownerField, String ownerId) {
        Criteria c = Criteria.where("status").is("COMPLETED");
        if (ownerField != null) c = c.and(ownerField).is(ownerId);
        return mongo.count(new Query(c), "laboratory_orders");
    }

    private long activeVisitingDoctors() {
        return mongo.count(new Query(Criteria.where("active").is(true)), "visiting_doctors");
    }

    // Returns {number of wards, beds available}. Beds whose ward no longer exists are ignored.
    private long[] bedFigures() {
        Set<String> wardIds = new HashSet<>();
        for (Document w : mongo.findAll(Document.class, "wards")) {
            wardIds.add(String.valueOf(w.get("_id")));
        }
        long available = 0;
        for (Document b : mongo.findAll(Document.class, "beds")) {
            if (!wardIds.contains(String.valueOf(b.get("wardId")))) continue;
            if ("AVAILABLE".equalsIgnoreCase(String.valueOf(b.get("status")))) available++;
        }
        return new long[]{wardIds.size(), available};
    }

    // Extra dashboard cards for the logged-in role (any logged-in user may ask)
    @GetMapping("/extras")
    public List<Map<String, Object>> extras(HttpServletRequest request) {
        String role = (String) request.getAttribute("role");
        List<Map<String, Object>> cards = new ArrayList<>();
        if (role == null) return cards;

        switch (role) {
            case "ADMIN": {
                long[] beds = bedFigures();
                cards.add(card("Wards", beds[0]));
                cards.add(card("Beds available", beds[1]));
                cards.add(card("Lab orders in progress", labInProgress(null, null)));
                cards.add(card("Active visiting doctors", activeVisitingDoctors()));
                break;
            }
            case "RECEPTIONIST": {
                long[] beds = bedFigures();
                cards.add(card("Beds available", beds[1]));
                cards.add(card("Active visiting doctors", activeVisitingDoctors()));
                break;
            }
            case "DOCTOR": {
                String username = (String) request.getAttribute("username");
                User user = username == null ? null : userRepository.findByUsername(username);
                String doctorId = user == null ? null : user.getDoctorId();
                if (doctorId != null) {
                    cards.add(card("Lab orders awaiting results", labInProgress("doctorId", doctorId)));
                    cards.add(card("Lab results ready", labCompleted("doctorId", doctorId)));
                }
                break;
            }
            case "LAB_STAFF": {
                cards.add(card("Lab orders to process", labInProgress(null, null)));
                cards.add(card("Lab orders completed", labCompleted(null, null)));
                long tests = mongo.count(new Query(Criteria.where("active").is(true)), "laboratory_tests");
                cards.add(card("Lab tests offered", tests));
                break;
            }
            case "PATIENT": {
                String patientId = (String) request.getAttribute("patientId");
                if (patientId != null) {
                    cards.add(card("My lab tests in progress", labInProgress("patientId", patientId)));
                    cards.add(card("My lab results", labCompleted("patientId", patientId)));
                }
                break;
            }
            default:
                break;
        }
        return cards;
    }
}