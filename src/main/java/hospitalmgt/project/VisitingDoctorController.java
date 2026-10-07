package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;

@RestController
@RequestMapping("/api/visiting-doctors")
public class VisitingDoctorController {

    private final VisitingDoctorRepository visitingRepository;
    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final BillRepository billRepository;
    private final ConsultationRepository consultationRepository;
    private final PasswordEncoder passwordEncoder;
    private final VisitingScheduleService scheduleService;

    public VisitingDoctorController(VisitingDoctorRepository visitingRepository,
                                    DoctorRepository doctorRepository,
                                    UserRepository userRepository,
                                    PatientRepository patientRepository,
                                    BillRepository billRepository,
                                    ConsultationRepository consultationRepository,
                                    PasswordEncoder passwordEncoder,
                                    VisitingScheduleService scheduleService) {
        this.visitingRepository = visitingRepository;
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.billRepository = billRepository;
        this.consultationRepository = consultationRepository;
        this.passwordEncoder = passwordEncoder;
        this.scheduleService = scheduleService;
    }

    // ---------- directory ----------

    // Everyone logged in can see who visits and when. Only the admin sees the hospital's share.
    @GetMapping
    public List<Map<String, Object>> list(HttpServletRequest request) {
        boolean admin = "ADMIN".equals(request.getAttribute("role"));
        List<Map<String, Object>> result = new ArrayList<>();
        for (VisitingDoctor visiting : visitingRepository.findAll()) {
            Doctor doctor = doctorRepository.findById(visiting.getDoctorId()).orElse(null);
            if (doctor == null) continue; // the doctor record was deleted
            result.add(view(visiting, doctor, admin));
        }
        result.sort((a, b) -> String.valueOf(a.get("name")).compareToIgnoreCase(String.valueOf(b.get("name"))));
        return result;
    }

    // The logged-in doctor's own visiting profile (visiting=false for regular doctors)
    @GetMapping("/mine")
    public Map<String, Object> mine(HttpServletRequest request) {
        String doctorId = (String) request.getAttribute("doctorId");
        VisitingDoctor visiting = doctorId == null ? null : visitingRepository.findByDoctorId(doctorId);
        Doctor doctor = visiting == null ? null : doctorRepository.findById(doctorId).orElse(null);

        Map<String, Object> result = new LinkedHashMap<>();
        if (visiting == null || doctor == null) {
            result.put("visiting", false);
            return result;
        }
        result.putAll(view(visiting, doctor, true));
        result.put("visiting", true);
        return result;
    }

    // ---------- onboarding (admin) ----------

    // Creates the doctor, their login (with a temporary password) and the visiting profile in one step
    @PostMapping("/onboard")
    public Map<String, Object> onboard(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String name = text(body, "name");
        String specialization = text(body, "specialization");
        String phoneNumber = text(body, "phoneNumber");
        if (name.isEmpty() || specialization.isEmpty() || phoneNumber.isEmpty()) {
            throw new ApiException(400, "Name, specialization and phone number are required.");
        }

        String username = AccountRules.cleanUsername(text(body, "username"));
        String email = AccountRules.cleanEmail(text(body, "email"));
        String password = text(body, "password");
        AccountRules.checkPassword(password);

        double fee = number(body, "consultationFee");
        if (Double.isNaN(fee) || fee <= 0) {
            throw new ApiException(400, "Enter a consultation fee greater than zero.");
        }
        double share = number(body, "hospitalSharePercent");
        if (Double.isNaN(share) || share < 0 || share > 100) {
            throw new ApiException(400, "The hospital share must be between 0% and 100%.");
        }
        List<VisitingDoctor.ScheduleSlot> schedule = scheduleService.cleanSchedule(body.get("schedule"));

        if (userRepository.findByUsername(username) != null) {
            throw new ApiException(409, "That username is already taken.");
        }
        if (userRepository.findByEmail(email) != null) {
            throw new ApiException(409, "An account with that email already exists.");
        }

        Doctor doctor = doctorRepository.save(new Doctor(name, specialization, phoneNumber));

        User user = new User(username, passwordEncoder.encode(password), "DOCTOR");
        user.setEmail(email);
        user.setDoctorId(doctor.getId());
        user.setFullName(name);
        user.setPhoneNumber(phoneNumber);
        user.setTemporaryPassword(true);
        userRepository.save(user);

        VisitingDoctor visiting = new VisitingDoctor();
        visiting.setDoctorId(doctor.getId());
        visiting.setConsultationFee(Bill.round(fee));
        visiting.setHospitalSharePercent(Bill.round(share));
        visiting.setSchedule(schedule);
        visitingRepository.save(visiting);

        request.setAttribute("auditDetail", "Visiting doctor " + name + " onboarded with login " + username
                + " (fee " + money(fee) + ", hospital share " + pct(share) + "%, " + scheduleService.describe(schedule) + ")");

        Map<String, Object> result = view(visiting, doctor, true);
        result.put("username", username);
        return result;
    }

    // ---------- changes (admin) ----------

    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable String id, @RequestBody Map<String, Object> body,
                                      HttpServletRequest request) {
        VisitingDoctor visiting = visitingRepository.findById(id)
                .orElseThrow(() -> new ApiException(404, "Visiting doctor not found."));
        Doctor doctor = doctorRepository.findById(visiting.getDoctorId())
                .orElseThrow(() -> new ApiException(404, "The doctor record no longer exists."));

        List<String> changes = new ArrayList<>();

        if (body.containsKey("consultationFee")) {
            double fee = number(body, "consultationFee");
            if (Double.isNaN(fee) || fee <= 0) {
                throw new ApiException(400, "Enter a consultation fee greater than zero.");
            }
            visiting.setConsultationFee(Bill.round(fee));
            changes.add("fee " + money(fee));
        }
        if (body.containsKey("hospitalSharePercent")) {
            double share = number(body, "hospitalSharePercent");
            if (Double.isNaN(share) || share < 0 || share > 100) {
                throw new ApiException(400, "The hospital share must be between 0% and 100%.");
            }
            visiting.setHospitalSharePercent(Bill.round(share));
            changes.add("hospital share " + pct(share) + "%");
        }
        if (body.containsKey("schedule")) {
            List<VisitingDoctor.ScheduleSlot> schedule = scheduleService.cleanSchedule(body.get("schedule"));
            visiting.setSchedule(schedule);
            changes.add("schedule " + scheduleService.describe(schedule));
        }
        if (body.containsKey("active")) {
            boolean active = Boolean.parseBoolean(String.valueOf(body.get("active")));
            visiting.setActive(active);
            changes.add(active ? "bookings resumed" : "bookings paused");
        }

        visitingRepository.save(visiting);
        request.setAttribute("auditDetail", "Visiting doctor " + doctor.getName() + " updated: "
                + (changes.isEmpty() ? "no changes" : String.join(", ", changes)));
        return view(visiting, doctor, true);
    }

    // ---------- earnings ----------

    // Admin: every visiting doctor, with optional date range (yyyy-MM-dd)
    @GetMapping("/earnings")
    public Map<String, Object> allEarnings(@RequestParam(required = false) String from,
                                           @RequestParam(required = false) String to) {
        return earnings(inRange(consultationRepository.findAll(), from, to), true);
    }

    // A visiting doctor: only their own consultations
    @GetMapping("/earnings/mine")
    public Map<String, Object> myEarnings(@RequestParam(required = false) String from,
                                          @RequestParam(required = false) String to,
                                          HttpServletRequest request) {
        String doctorId = (String) request.getAttribute("doctorId");
        if (doctorId == null || visitingRepository.findByDoctorId(doctorId) == null) {
            throw new ApiException(404, "You are not set up as a visiting doctor.");
        }
        return earnings(inRange(consultationRepository.findByDoctorId(doctorId), from, to), false);
    }

    /**
     * The aggregation: every figure is a count or a sum over many consultations.
     * Money counts as earned once the consultation bill is fully PAID, otherwise it is pending.
     */
    private Map<String, Object> earnings(List<Consultation> consultations, boolean withDoctors) {
        Map<String, Bill> bills = new HashMap<>();
        for (Bill bill : billRepository.findAll()) bills.put(bill.getId(), bill);
        Map<String, String> patientNames = new HashMap<>();
        for (Patient patient : patientRepository.findAll()) patientNames.put(patient.getId(), patient.getName());
        Map<String, Doctor> doctors = new HashMap<>();
        for (Doctor doctor : doctorRepository.findAll()) doctors.put(doctor.getId(), doctor);

        List<Consultation> sorted = new ArrayList<>(consultations);
        sorted.sort((a, b) -> {
            if (a.getCreatedAt() == null && b.getCreatedAt() == null) return 0;
            if (a.getCreatedAt() == null) return 1;
            if (b.getCreatedAt() == null) return -1;
            return b.getCreatedAt().compareTo(a.getCreatedAt());
        });

        // totals array: [count, billed, collected, doctorEarned, hospitalEarned, doctorPending, hospitalPending]
        double[] all = new double[7];
        Map<String, double[]> perDoctor = new LinkedHashMap<>();
        List<Map<String, Object>> rows = new ArrayList<>();

        for (Consultation c : sorted) {
            Bill bill = bills.get(c.getBillId());
            String billStatus = bill == null ? "REMOVED" : bill.getStatus();
            double hospital = Bill.round(c.getFee() * c.getHospitalSharePercent() / 100.0);
            double doctorPart = Bill.round(c.getFee() - hospital);
            boolean settled = "PAID".equals(billStatus);

            if (bill != null) {
                addTo(all, c.getFee(), doctorPart, hospital, settled);
                addTo(perDoctor.computeIfAbsent(c.getDoctorId(), k -> new double[7]), c.getFee(), doctorPart, hospital, settled);
            }

            Doctor doctor = doctors.get(c.getDoctorId());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", c.getId());
            row.put("createdAt", c.getCreatedAt());
            row.put("doctorId", c.getDoctorId());
            row.put("doctorName", doctor == null ? "Unknown doctor" : doctor.getName());
            row.put("patientName", patientNames.getOrDefault(c.getPatientId(), "Unknown patient"));
            row.put("fee", c.getFee());
            row.put("hospitalSharePercent", c.getHospitalSharePercent());
            row.put("hospitalAmount", hospital);
            row.put("doctorAmount", doctorPart);
            row.put("billStatus", billStatus);
            row.put("settled", settled);
            rows.add(row);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totals", totalsMap(all));
        result.put("rows", rows);

        if (withDoctors) {
            List<Map<String, Object>> summary = new ArrayList<>();
            for (VisitingDoctor visiting : visitingRepository.findAll()) {
                Doctor doctor = doctors.get(visiting.getDoctorId());
                if (doctor == null) continue;
                Map<String, Object> item = new LinkedHashMap<>(
                        totalsMap(perDoctor.getOrDefault(visiting.getDoctorId(), new double[7])));
                item.put("doctorId", visiting.getDoctorId());
                item.put("name", doctor.getName());
                item.put("specialization", doctor.getSpecialization());
                item.put("hospitalSharePercent", visiting.getHospitalSharePercent());
                summary.add(item);
            }
            summary.sort((a, b) -> String.valueOf(a.get("name")).compareToIgnoreCase(String.valueOf(b.get("name"))));
            result.put("doctors", summary);
        }
        return result;
    }

    private void addTo(double[] t, double fee, double doctorPart, double hospital, boolean settled) {
        t[0] += 1;
        t[1] += fee;
        if (settled) {
            t[2] += fee;
            t[3] += doctorPart;
            t[4] += hospital;
        } else {
            t[5] += doctorPart;
            t[6] += hospital;
        }
    }

    private Map<String, Object> totalsMap(double[] t) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("consultations", (long) t[0]);
        map.put("billed", Bill.round(t[1]));
        map.put("collected", Bill.round(t[2]));
        map.put("outstanding", Bill.round(t[1] - t[2]));
        map.put("doctorEarned", Bill.round(t[3]));
        map.put("hospitalEarned", Bill.round(t[4]));
        map.put("doctorPending", Bill.round(t[5]));
        map.put("hospitalPending", Bill.round(t[6]));
        return map;
    }

    private List<Consultation> inRange(List<Consultation> list, String from, String to) {
        LocalDate start = parseDate(from);
        LocalDate end = parseDate(to);
        return list.stream().filter(c -> {
            if (c.getCreatedAt() == null) return false;
            LocalDate day = c.getCreatedAt().toLocalDate();
            return (start == null || !day.isBefore(start)) && (end == null || !day.isAfter(end));
        }).toList();
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException e) {
            throw new ApiException(400, "Dates must look like 2026-10-05.");
        }
    }

    // ---------- helpers ----------

    private Map<String, Object> view(VisitingDoctor visiting, Doctor doctor, boolean showShare) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", visiting.getId());
        map.put("doctorId", visiting.getDoctorId());
        map.put("name", doctor.getName());
        map.put("specialization", doctor.getSpecialization());
        map.put("phoneNumber", doctor.getPhoneNumber());
        map.put("consultationFee", visiting.getConsultationFee());
        map.put("active", visiting.isActive());
        map.put("schedule", visiting.getSchedule());
        if (showShare) map.put("hospitalSharePercent", visiting.getHospitalSharePercent());
        return map;
    }

    private String text(Map<String, Object> body, String key) {
        Object value = body.get(key);
        return value == null ? "" : value.toString().trim();
    }

    private double number(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (value == null) return Double.NaN;
        if (value instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(value.toString().trim());
        } catch (NumberFormatException e) {
            return Double.NaN;
        }
    }

    private String pct(double value) {
        return value == Math.rint(value) ? String.valueOf((long) value) : String.valueOf(value);
    }

    private String money(double value) {
        return "NGN " + String.format(Locale.US, "%,.2f", value);
    }
}