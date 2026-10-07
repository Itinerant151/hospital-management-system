package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/wards")
public class WardController {

    public static final List<String> TYPES = List.of(
            "General", "Private", "Semi-private", "Maternity", "Pediatric", "Surgical", "Intensive care", "Emergency");

    private static final int MAX_BEDS_PER_WARD = 100;
    private static final int MAX_BEDS_PER_CALL = 50;

    private final WardRepository wardRepository;
    private final BedRepository bedRepository;
    private final AdmissionRepository admissionRepository;
    private final PatientRepository patientRepository;

    public WardController(WardRepository wardRepository, BedRepository bedRepository,
                          AdmissionRepository admissionRepository, PatientRepository patientRepository) {
        this.wardRepository = wardRepository;
        this.bedRepository = bedRepository;
        this.admissionRepository = admissionRepository;
        this.patientRepository = patientRepository;
    }

    // ---------- reading (admin, receptionist, doctor) ----------

    // Every ward with its bed counts
    @GetMapping
    public List<Map<String, Object>> list() {
        Map<String, List<Bed>> bedsByWard = new HashMap<>();
        for (Bed bed : bedRepository.findAll()) {
            bedsByWard.computeIfAbsent(bed.getWardId(), k -> new ArrayList<>()).add(bed);
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Ward ward : wardRepository.findAll()) {
            result.add(wardView(ward, bedsByWard.getOrDefault(ward.getId(), List.of())));
        }
        result.sort((a, b) -> String.valueOf(a.get("name")).compareToIgnoreCase(String.valueOf(b.get("name"))));
        return result;
    }

    // Every bed, with the patient in it when occupied
    @GetMapping("/beds")
    public List<Map<String, Object>> beds() {
        Map<String, Ward> wards = new HashMap<>();
        for (Ward ward : wardRepository.findAll()) wards.put(ward.getId(), ward);

        Map<String, Admission> active = new HashMap<>();
        for (Admission admission : admissionRepository.findByStatus("ADMITTED")) active.put(admission.getId(), admission);

        Map<String, String> patientNames = new HashMap<>();
        for (Patient patient : patientRepository.findAll()) patientNames.put(patient.getId(), patient.getName());

        List<Map<String, Object>> result = new ArrayList<>();
        for (Bed bed : bedRepository.findAll()) {
            Ward ward = wards.get(bed.getWardId());
            if (ward == null) continue;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", bed.getId());
            row.put("wardId", bed.getWardId());
            row.put("wardName", ward.getName());
            row.put("label", bed.getLabel());
            row.put("status", bed.getStatus());
            row.put("admissionId", bed.getAdmissionId());

            Admission admission = bed.getAdmissionId() == null ? null : active.get(bed.getAdmissionId());
            if (admission != null) {
                row.put("patientId", admission.getPatientId());
                row.put("patientName", patientNames.getOrDefault(admission.getPatientId(), "Unknown patient"));
                admission.getStays().stream()
                        .filter(s -> s.getEndedAt() == null)
                        .findFirst()
                        .ifPresent(s -> row.put("since", s.getStartedAt()));
            }
            result.add(row);
        }

        result.sort(Comparator
                .comparing((Map<String, Object> r) -> String.valueOf(r.get("wardName")), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(r -> String.valueOf(r.get("label")).length())
                .thenComparing(r -> String.valueOf(r.get("label"))));
        return result;
    }

    // ---------- wards (admin) ----------

    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String name = cleanName(text(body, "name"), null);
        String type = cleanType(text(body, "type"));
        double rate = cleanRate(number(body, "dailyRate"));

        double bedCountRaw = number(body, "bedCount");
        int bedCount = Double.isNaN(bedCountRaw) ? 0 : (int) bedCountRaw;
        if (bedCount < 0 || bedCount > MAX_BEDS_PER_CALL) {
            throw new ApiException(400, "You can add between 0 and " + MAX_BEDS_PER_CALL + " beds at a time.");
        }

        Ward ward = new Ward();
        ward.setName(name);
        ward.setType(type);
        ward.setFloor(text(body, "floor"));
        ward.setDailyRate(rate);
        Ward saved = wardRepository.save(ward);

        if (bedCount > 0) createBeds(saved, text(body, "bedPrefix"), bedCount);

        request.setAttribute("auditDetail", "Ward " + name + " (" + type + ") created at NGN "
                + String.format(Locale.US, "%,.2f", rate) + " a day with " + bedCount + " beds");
        return wardView(saved, bedRepository.findByWardId(saved.getId()));
    }

    // A new daily rate only applies to admissions and transfers from now on; stays already running keep their rate
    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable String id, @RequestBody Map<String, Object> body,
                                      HttpServletRequest request) {
        Ward ward = wardRepository.findById(id).orElseThrow(() -> new ApiException(404, "Ward not found."));

        ward.setName(cleanName(text(body, "name"), id));
        ward.setType(cleanType(text(body, "type")));
        ward.setFloor(text(body, "floor"));
        ward.setDailyRate(cleanRate(number(body, "dailyRate")));
        wardRepository.save(ward);

        request.setAttribute("auditDetail", "Ward " + ward.getName() + " updated (" + ward.getType()
                + ", NGN " + String.format(Locale.US, "%,.2f", ward.getDailyRate()) + " a day)");
        return wardView(ward, bedRepository.findByWardId(id));
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(@PathVariable String id, HttpServletRequest request) {
        Ward ward = wardRepository.findById(id).orElseThrow(() -> new ApiException(404, "Ward not found."));
        List<Bed> beds = bedRepository.findByWardId(id);

        if (beds.stream().anyMatch(b -> "OCCUPIED".equals(b.getStatus()))) {
            throw new ApiException(409, "This ward still has patients in it. Discharge or transfer them first.");
        }

        bedRepository.deleteAll(beds);
        wardRepository.deleteById(id);
        request.setAttribute("auditDetail", "Ward " + ward.getName() + " deleted with its " + beds.size() + " beds");
        return Map.of("message", "Ward deleted.");
    }

    // ---------- beds ----------

    // Adds beds named prefix1, prefix2, ... skipping labels that already exist
    @PostMapping("/{id}/beds")
    public Map<String, Object> addBeds(@PathVariable String id, @RequestBody Map<String, Object> body,
                                       HttpServletRequest request) {
        Ward ward = wardRepository.findById(id).orElseThrow(() -> new ApiException(404, "Ward not found."));

        double countRaw = number(body, "count");
        if (Double.isNaN(countRaw) || countRaw < 1 || countRaw > MAX_BEDS_PER_CALL) {
            throw new ApiException(400, "Enter between 1 and " + MAX_BEDS_PER_CALL + " beds to add.");
        }
        int made = createBeds(ward, text(body, "prefix"), (int) countRaw);

        request.setAttribute("auditDetail", made + " beds added to " + ward.getName());
        return wardView(ward, bedRepository.findByWardId(id));
    }

    // Staff can move an empty bed in and out of maintenance. An occupied bed must be vacated first.
    @PutMapping("/beds/{bedId}/status")
    public Bed bedStatus(@PathVariable String bedId, @RequestBody Map<String, Object> body,
                         HttpServletRequest request) {
        Bed bed = bedRepository.findById(bedId).orElseThrow(() -> new ApiException(404, "Bed not found."));
        String status = text(body, "status").toUpperCase();

        if (!status.equals("AVAILABLE") && !status.equals("MAINTENANCE")) {
            throw new ApiException(400, "A bed can be set to Available or Maintenance.");
        }
        if ("OCCUPIED".equals(bed.getStatus())) {
            throw new ApiException(409, "This bed has a patient in it. Discharge or transfer the patient first.");
        }

        bed.setStatus(status);
        bedRepository.save(bed);
        request.setAttribute("auditDetail", "Bed " + bed.getLabel() + " set to " + status.toLowerCase());
        return bed;
    }

    @DeleteMapping("/beds/{bedId}")
    public Map<String, String> deleteBed(@PathVariable String bedId, HttpServletRequest request) {
        Bed bed = bedRepository.findById(bedId).orElseThrow(() -> new ApiException(404, "Bed not found."));
        if ("OCCUPIED".equals(bed.getStatus())) {
            throw new ApiException(409, "This bed has a patient in it. Discharge or transfer the patient first.");
        }
        bedRepository.deleteById(bedId);
        request.setAttribute("auditDetail", "Bed " + bed.getLabel() + " removed");
        return Map.of("message", "Bed removed.");
    }

    // ---------- helpers ----------

    private int createBeds(Ward ward, String rawPrefix, int count) {
        List<Bed> existing = bedRepository.findByWardId(ward.getId());
        if (existing.size() + count > MAX_BEDS_PER_WARD) {
            throw new ApiException(400, "A ward can hold at most " + MAX_BEDS_PER_WARD + " beds.");
        }

        String prefix = rawPrefix == null ? "" : rawPrefix.trim();
        if (prefix.length() > 8) {
            throw new ApiException(400, "The bed prefix can be at most 8 characters.");
        }
        if (prefix.isEmpty()) {
            prefix = ward.getName().substring(0, 1).toUpperCase();
        }

        Set<String> taken = existing.stream()
                .map(b -> b.getLabel().toLowerCase())
                .collect(Collectors.toSet());

        int made = 0;
        int number = 1;
        while (made < count) {
            String label = prefix + number;
            number++;
            if (taken.contains(label.toLowerCase())) continue;

            Bed bed = new Bed();
            bed.setWardId(ward.getId());
            bed.setLabel(label);
            bedRepository.save(bed);
            made++;
        }
        return made;
    }

    private Map<String, Object> wardView(Ward ward, List<Bed> beds) {
        long available = beds.stream().filter(b -> "AVAILABLE".equals(b.getStatus())).count();
        long occupied = beds.stream().filter(b -> "OCCUPIED".equals(b.getStatus())).count();
        long maintenance = beds.stream().filter(b -> "MAINTENANCE".equals(b.getStatus())).count();

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", ward.getId());
        map.put("name", ward.getName());
        map.put("type", ward.getType());
        map.put("floor", ward.getFloor());
        map.put("dailyRate", ward.getDailyRate());
        map.put("totalBeds", beds.size());
        map.put("available", available);
        map.put("occupied", occupied);
        map.put("maintenance", maintenance);
        return map;
    }

    private String cleanName(String name, String ownId) {
        if (name.isEmpty()) throw new ApiException(400, "Enter a ward name.");
        if (name.length() > 60) throw new ApiException(400, "The ward name can be at most 60 characters.");
        for (Ward other : wardRepository.findAll()) {
            if (other.getName().equalsIgnoreCase(name) && !other.getId().equals(ownId)) {
                throw new ApiException(409, "A ward called \"" + other.getName() + "\" already exists.");
            }
        }
        return name;
    }

    private String cleanType(String type) {
        if (!TYPES.contains(type)) throw new ApiException(400, "Choose a valid ward type.");
        return type;
    }

    private double cleanRate(double rate) {
        if (Double.isNaN(rate) || rate <= 0) {
            throw new ApiException(400, "Enter a daily bed rate greater than zero.");
        }
        return Bill.round(rate);
    }

    private String text(Map<String, Object> body, String key) {
        Object value = body.get(key);
        return value == null ? "" : value.toString().trim();
    }

    private double number(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (value == null || value.toString().isBlank()) return Double.NaN;
        if (value instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(value.toString().trim());
        } catch (NumberFormatException e) {
            return Double.NaN;
        }
    }
}