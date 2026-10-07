package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/admissions")
public class AdmissionController {

    private final AdmissionRepository admissionRepository;
    private final BedRepository bedRepository;
    private final WardRepository wardRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final BillRepository billRepository;

    public AdmissionController(AdmissionRepository admissionRepository, BedRepository bedRepository,
                               WardRepository wardRepository, PatientRepository patientRepository,
                               DoctorRepository doctorRepository, BillRepository billRepository) {
        this.admissionRepository = admissionRepository;
        this.bedRepository = bedRepository;
        this.wardRepository = wardRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.billRepository = billRepository;
    }

    // ---------- reading ----------

    // Staff: all admissions, or only ADMITTED / DISCHARGED ones
    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(required = false) String status) {
        List<Admission> admissions = (status == null || status.isBlank())
                ? admissionRepository.findAll()
                : admissionRepository.findByStatus(status.trim().toUpperCase());
        return views(admissions);
    }

    // A patient: their own admissions only
    @GetMapping("/mine")
    public List<Map<String, Object>> mine(HttpServletRequest request) {
        String patientId = (String) request.getAttribute("patientId");
        if (patientId == null) throw new ApiException(400, "No patient record is linked to this account.");
        return views(admissionRepository.findByPatientId(patientId));
    }

    // What the bed charges would be if the patient were discharged right now
    @GetMapping("/{id}/charges")
    public Map<String, Object> chargesNow(@PathVariable String id) {
        Admission admission = find(id);
        Charges charges = charges(admission, endOf(admission));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", charges.items());
        result.put("total", charges.total());
        result.put("days", charges.days());
        return result;
    }

    // ---------- admit ----------

    @PostMapping("/admit")
    public Map<String, Object> admit(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String patientId = text(body, "patientId");
        String bedId = text(body, "bedId");
        String doctorId = text(body, "attendingDoctorId");
        String reason = text(body, "reason");

        if (patientId.isEmpty()) throw new ApiException(400, "Select the patient to admit.");
        if (bedId.isEmpty()) throw new ApiException(400, "Select a bed.");
        if (reason.isEmpty()) throw new ApiException(400, "Enter the reason for admission.");
        if (reason.length() > 300) throw new ApiException(400, "The reason can be at most 300 characters.");

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ApiException(404, "Patient not found."));
        if (admissionRepository.existsByPatientIdAndStatus(patientId, "ADMITTED")) {
            throw new ApiException(409, patient.getName() + " is already admitted.");
        }

        if (!doctorId.isEmpty() && !doctorRepository.existsById(doctorId)) {
            throw new ApiException(404, "Doctor not found.");
        }

        Bed bed = bedRepository.findById(bedId).orElseThrow(() -> new ApiException(404, "Bed not found."));
        requireAvailable(bed);
        Ward ward = wardRepository.findById(bed.getWardId())
                .orElseThrow(() -> new ApiException(404, "Ward not found."));

        String username = (String) request.getAttribute("username");
        LocalDateTime now = LocalDateTime.now().withNano(0);

        Admission admission = new Admission();
        admission.setPatientId(patientId);
        admission.setAttendingDoctorId(doctorId.isEmpty() ? null : doctorId);
        admission.setReason(reason);
        admission.setStatus("ADMITTED");
        admission.setAdmittedAt(now);
        admission.setAdmittedBy(username);
        admission.getStays().add(newStay(ward, bed, now, null, username));
        Admission saved = admissionRepository.save(admission);

        bed.setStatus("OCCUPIED");
        bed.setAdmissionId(saved.getId());
        bedRepository.save(bed);

        request.setAttribute("auditDetail", patient.getName() + " admitted to " + ward.getName()
                + ", bed " + bed.getLabel() + " (" + reason + ")");
        return views(List.of(saved)).get(0);
    }

    // ---------- transfer ----------

    @PutMapping("/{id}/transfer")
    public Map<String, Object> transfer(@PathVariable String id, @RequestBody Map<String, Object> body,
                                        HttpServletRequest request) {
        Admission admission = find(id);
        requireAdmitted(admission);

        String bedId = text(body, "bedId");
        String reason = text(body, "reason");
        if (bedId.isEmpty()) throw new ApiException(400, "Select the bed to move the patient to.");
        if (reason.isEmpty()) throw new ApiException(400, "Enter the reason for the transfer.");
        if (reason.length() > 300) throw new ApiException(400, "The reason can be at most 300 characters.");

        Admission.Stay current = currentStay(admission);
        if (current == null) throw new ApiException(409, "This admission has no current bed.");
        if (current.getBedId().equals(bedId)) {
            throw new ApiException(400, "The patient is already in that bed.");
        }

        Bed target = bedRepository.findById(bedId).orElseThrow(() -> new ApiException(404, "Bed not found."));
        requireAvailable(target);
        Ward targetWard = wardRepository.findById(target.getWardId())
                .orElseThrow(() -> new ApiException(404, "Ward not found."));

        String username = (String) request.getAttribute("username");
        LocalDateTime now = LocalDateTime.now().withNano(0);

        current.setEndedAt(now);
        admission.getStays().add(newStay(targetWard, target, now, reason, username));
        admissionRepository.save(admission);

        target.setStatus("OCCUPIED");
        target.setAdmissionId(admission.getId());
        bedRepository.save(target);

        bedRepository.findById(current.getBedId()).ifPresent(old -> {
            old.setStatus("AVAILABLE");
            old.setAdmissionId(null);
            bedRepository.save(old);
        });

        String name = patientRepository.findById(admission.getPatientId()).map(Patient::getName).orElse("Patient");
        request.setAttribute("auditDetail", name + " transferred from " + current.getWardName() + " bed "
                + current.getBedLabel() + " to " + targetWard.getName() + " bed " + target.getLabel()
                + " (" + reason + ")");
        return views(List.of(admission)).get(0);
    }

    // ---------- discharge ----------

    @PostMapping("/{id}/discharge")
    public Map<String, Object> discharge(@PathVariable String id,
                                         @RequestBody(required = false) Map<String, Object> body,
                                         HttpServletRequest request) {
        Admission admission = find(id);
        requireAdmitted(admission);

        String note = body == null ? "" : text(body, "note");
        if (note.length() > 500) throw new ApiException(400, "The discharge note can be at most 500 characters.");

        String username = (String) request.getAttribute("username");
        LocalDateTime now = LocalDateTime.now().withNano(0);

        Admission.Stay current = currentStay(admission);
        if (current != null) current.setEndedAt(now);

        // Bed charges become an ordinary bill, so payment and HMO cover work as for any other bill
        Charges charges = charges(admission, now);
        Bill bill = new Bill();
        bill.setPatientId(admission.getPatientId());
        bill.setItems(charges.items());
        bill.setTotal(charges.total());
        bill.recalculateStatus();
        Bill savedBill = billRepository.save(bill);

        admission.setStatus("DISCHARGED");
        admission.setDischargedAt(now);
        admission.setDischargedBy(username);
        admission.setDischargeNote(note.isEmpty() ? null : note);
        admission.setBillId(savedBill.getId());
        admissionRepository.save(admission);

        if (current != null) {
            bedRepository.findById(current.getBedId()).ifPresent(bed -> {
                bed.setStatus("AVAILABLE");
                bed.setAdmissionId(null);
                bedRepository.save(bed);
            });
        }

        String name = patientRepository.findById(admission.getPatientId()).map(Patient::getName).orElse("Patient");
        request.setAttribute("auditDetail", name + " discharged; bed charges of NGN "
                + String.format(Locale.US, "%,.2f", charges.total()) + " billed");
        return views(List.of(admission)).get(0);
    }

    // ---------- charges ----------

    private record Charges(List<Bill.BillItem> items, double total, double days) {}

    /**
     * Bed charges, worked out per stay: daily rate x days spent (to the minute).
     * If the whole admission lasted under one day, a top-up line makes it one full day.
     */
    private Charges charges(Admission admission, LocalDateTime end) {
        List<Bill.BillItem> items = new ArrayList<>();
        double totalDays = 0;
        double total = 0;
        double lastRate = 0;

        for (Admission.Stay stay : admission.getStays()) {
            LocalDateTime to = stay.getEndedAt() != null ? stay.getEndedAt() : end;
            long minutes = Math.max(0, Duration.between(stay.getStartedAt(), to).toMinutes());
            double days = minutes / 1440.0;
            double amount = Bill.round(stay.getDailyRate() * days);

            totalDays += days;
            total += amount;
            lastRate = stay.getDailyRate();

            if (amount > 0.005) {
                items.add(new Bill.BillItem("Bed charge - " + stay.getWardName() + ", bed " + stay.getBedLabel()
                        + " (" + dayText(days) + " at " + money(stay.getDailyRate()) + " a day)", amount));
            }
        }

        if (totalDays < 1 && lastRate > 0) {
            double topUp = Bill.round(lastRate * (1 - totalDays));
            items.add(new Bill.BillItem("Minimum charge of one day (top-up)", topUp));
            total += topUp;
            totalDays = 1;
        }

        return new Charges(items, Bill.round(total), Bill.round(totalDays));
    }

    // ---------- views ----------

    private List<Map<String, Object>> views(List<Admission> admissions) {
        Map<String, String> patientNames = new HashMap<>();
        for (Patient patient : patientRepository.findAll()) patientNames.put(patient.getId(), patient.getName());
        Map<String, String> doctorNames = new HashMap<>();
        for (Doctor doctor : doctorRepository.findAll()) doctorNames.put(doctor.getId(), doctor.getName());

        List<Admission> sorted = new ArrayList<>(admissions);
        sorted.sort((a, b) -> {
            if (a.getAdmittedAt() == null && b.getAdmittedAt() == null) return 0;
            if (a.getAdmittedAt() == null) return 1;
            if (b.getAdmittedAt() == null) return -1;
            return b.getAdmittedAt().compareTo(a.getAdmittedAt());
        });

        List<Map<String, Object>> result = new ArrayList<>();
        for (Admission admission : sorted) {
            result.add(view(admission, patientNames, doctorNames));
        }
        return result;
    }

    private Map<String, Object> view(Admission admission, Map<String, String> patientNames,
                                     Map<String, String> doctorNames) {
        Admission.Stay shown = currentStay(admission);
        if (shown == null && !admission.getStays().isEmpty()) {
            shown = admission.getStays().get(admission.getStays().size() - 1);
        }
        Charges charges = charges(admission, endOf(admission));

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", admission.getId());
        map.put("patientId", admission.getPatientId());
        map.put("patientName", patientNames.getOrDefault(admission.getPatientId(), "Unknown patient"));
        map.put("attendingDoctorId", admission.getAttendingDoctorId());
        map.put("doctorName", admission.getAttendingDoctorId() == null ? null
                : doctorNames.getOrDefault(admission.getAttendingDoctorId(), "Unknown doctor"));
        map.put("reason", admission.getReason());
        map.put("status", admission.getStatus());
        map.put("admittedAt", admission.getAdmittedAt());
        map.put("admittedBy", admission.getAdmittedBy());
        map.put("dischargedAt", admission.getDischargedAt());
        map.put("dischargedBy", admission.getDischargedBy());
        map.put("dischargeNote", admission.getDischargeNote());
        map.put("wardName", shown == null ? null : shown.getWardName());
        map.put("bedLabel", shown == null ? null : shown.getBedLabel());
        map.put("dailyRate", shown == null ? 0 : shown.getDailyRate());
        map.put("stays", admission.getStays());
        map.put("days", charges.days());
        map.put("charges", charges.total());
        map.put("billId", admission.getBillId());

        String billStatus = null;
        if (admission.getBillId() != null) {
            billStatus = billRepository.findById(admission.getBillId()).map(Bill::getStatus).orElse("REMOVED");
        }
        map.put("billStatus", billStatus);
        return map;
    }

    // ---------- helpers ----------

    private Admission find(String id) {
        return admissionRepository.findById(id).orElseThrow(() -> new ApiException(404, "Admission not found."));
    }

    private void requireAdmitted(Admission admission) {
        if (!"ADMITTED".equals(admission.getStatus())) {
            throw new ApiException(409, "This patient has already been discharged.");
        }
    }

    private void requireAvailable(Bed bed) {
        if ("OCCUPIED".equals(bed.getStatus())) throw new ApiException(409, "That bed is already occupied.");
        if ("MAINTENANCE".equals(bed.getStatus())) throw new ApiException(409, "That bed is under maintenance.");
    }

    private Admission.Stay currentStay(Admission admission) {
        return admission.getStays().stream().filter(s -> s.getEndedAt() == null).findFirst().orElse(null);
    }

    private LocalDateTime endOf(Admission admission) {
        return admission.getDischargedAt() != null ? admission.getDischargedAt() : LocalDateTime.now();
    }

    private Admission.Stay newStay(Ward ward, Bed bed, LocalDateTime start, String transferReason, String movedBy) {
        Admission.Stay stay = new Admission.Stay();
        stay.setWardId(ward.getId());
        stay.setWardName(ward.getName());
        stay.setBedId(bed.getId());
        stay.setBedLabel(bed.getLabel());
        stay.setDailyRate(ward.getDailyRate());
        stay.setStartedAt(start);
        stay.setTransferReason(transferReason);
        stay.setMovedBy(movedBy);
        return stay;
    }

    private String dayText(double days) {
        return String.format(Locale.US, "%.2f %s", days, Math.abs(days - 1) < 0.005 ? "day" : "days");
    }

    private String money(double value) {
        return "NGN " + String.format(Locale.US, "%,.2f", value);
    }

    private String text(Map<String, Object> body, String key) {
        Object value = body.get(key);
        return value == null ? "" : value.toString().trim();
    }
}