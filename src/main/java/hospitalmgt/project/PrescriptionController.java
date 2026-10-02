package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/prescriptions")
public class PrescriptionController {

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private MedicineRepository medicineRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    // Everything, newest first (pharmacy / admin)
    @GetMapping
    public List<Prescription> getAll() {
        return newestFirst(prescriptionRepository.findAll());
    }

    // A patient sees their own prescriptions; a doctor sees the ones they issued
    @GetMapping("/mine")
    public List<Prescription> mine(HttpServletRequest request) {
        String role = (String) request.getAttribute("role");
        if ("DOCTOR".equals(role)) {
            String doctorId = (String) request.getAttribute("doctorId");
            if (doctorId == null) throw new ApiException(400, "No doctor record is linked to this account.");
            return newestFirst(prescriptionRepository.findByDoctorId(doctorId));
        }
        String patientId = (String) request.getAttribute("patientId");
        if (patientId == null) throw new ApiException(400, "No patient record is linked to this account.");
        return newestFirst(prescriptionRepository.findByPatientId(patientId));
    }

    @GetMapping("/patient/{patientId}")
    public List<Prescription> getByPatient(@PathVariable String patientId, HttpServletRequest request) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ApiException(404, "Patient not found."));
        PatientAccess.checkDoctorAccess(request, patient);
        return newestFirst(prescriptionRepository.findByPatientId(patientId));
    }

    @PostMapping
    public Prescription create(@RequestBody Prescription incoming, HttpServletRequest request) {
        String doctorId = (String) request.getAttribute("doctorId");
        if (doctorId == null) throw new ApiException(403, "Only doctors can write prescriptions.");

        Patient patient = incoming.getPatientId() == null ? null
                : patientRepository.findById(incoming.getPatientId()).orElse(null);
        if (patient == null) throw new ApiException(404, "Choose a patient for this prescription.");
        PatientAccess.checkDoctorAccess(request, patient);

        if (incoming.getItems() == null || incoming.getItems().isEmpty()) {
            throw new ApiException(400, "Add at least one medication.");
        }
        if (incoming.getItems().size() > 20) {
            throw new ApiException(400, "A prescription can have at most 20 medications.");
        }

        List<Prescription.PrescribedItem> cleaned = new ArrayList<>();
        for (Prescription.PrescribedItem item : incoming.getItems()) {
            String name = trim(item.getMedicationName());
            String medicineId = trim(item.getMedicineId());

            Medicine medicine = medicineId.isEmpty() ? null : medicineRepository.findById(medicineId).orElse(null);
            if (medicine == null) medicineId = "";
            if (name.isEmpty() && medicine != null) name = medicine.getName();

            if (name.isEmpty()) throw new ApiException(400, "Every medication needs a name.");
            if (trim(item.getDosage()).isEmpty()) {
                throw new ApiException(400, "Enter the dosage for " + name + ".");
            }
            if (item.getQuantity() < 0) throw new ApiException(400, "Quantity cannot be negative.");

            Prescription.PrescribedItem clean = new Prescription.PrescribedItem();
            clean.setMedicineId(medicineId.isEmpty() ? null : medicineId);
            clean.setMedicationName(limit(name));
            clean.setDosage(limit(trim(item.getDosage())));
            clean.setDuration(limit(trim(item.getDuration())));
            clean.setInstructions(limit(trim(item.getInstructions())));
            clean.setQuantity(item.getQuantity());
            cleaned.add(clean);
        }

        Prescription prescription = new Prescription();
        prescription.setPatientId(patient.getId());
        prescription.setPatientName(patient.getName());
        prescription.setDoctorId(doctorId);
        prescription.setDoctorName(doctorRepository.findById(doctorId).map(Doctor::getName).orElse("Doctor"));
        prescription.setItems(cleaned);
        prescription.setNotes(limit(trim(incoming.getNotes())));
        prescription.setDateIssued(LocalDate.now());
        prescription.setCreatedAt(LocalDateTime.now());
        prescription.setDispensed(false);

        Prescription saved = prescriptionRepository.save(prescription);
        request.setAttribute("auditDetail", "Prescription issued to " + patient.getName() + " ("
                + cleaned.size() + (cleaned.size() == 1 ? " medication)" : " medications)"));
        return saved;
    }

    // Marks a prescription dispensed and takes the quantities out of the pharmacy stock
    @PostMapping("/{id}/dispense")
    public Prescription dispense(@PathVariable String id, HttpServletRequest request) {
        Prescription prescription = prescriptionRepository.findById(id)
                .orElseThrow(() -> new ApiException(404, "Prescription not found."));
        if (prescription.isDispensed()) {
            throw new ApiException(409, "This prescription has already been dispensed.");
        }

        if (prescription.getItems() != null) {
            for (Prescription.PrescribedItem item : prescription.getItems()) {
                if (item.getMedicineId() == null || item.getMedicineId().isBlank()) continue;
                Medicine medicine = medicineRepository.findById(item.getMedicineId()).orElse(null);
                if (medicine != null) {
                    medicine.setStockQuantity(Math.max(0, medicine.getStockQuantity() - item.getQuantity()));
                    medicineRepository.save(medicine);
                }
            }
        }

        prescription.setDispensed(true);
        prescription.setDispensedAt(LocalDateTime.now());
        request.setAttribute("auditDetail", "Prescription for " + prescription.getPatientName() + " dispensed");
        return prescriptionRepository.save(prescription);
    }

    private List<Prescription> newestFirst(List<Prescription> list) {
        return list.stream().sorted(Comparator.comparing(this::sortKey).reversed()).toList();
    }

    private LocalDateTime sortKey(Prescription p) {
        if (p.getCreatedAt() != null) return p.getCreatedAt();
        if (p.getDateIssued() != null) return p.getDateIssued().atStartOfDay();
        return LocalDateTime.MIN;
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private String limit(String value) {
        return value.length() > 400 ? value.substring(0, 400) : value;
    }
}