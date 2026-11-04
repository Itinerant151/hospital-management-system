package hospitalmgt.project;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Keeps one "running bill" per patient up to date. Everything the patient owes for (bed charges,
 * dispensed drugs, attended consultations) is added to that bill automatically. Each line remembers
 * where it came from, so opening the patient twice never charges the same thing twice.
 */
@Service
public class BillingSyncService {

    public static final String ADMISSION = "ADMISSION";
    public static final String DRUG = "DRUG";
    public static final String CONSULTATION = "CONSULTATION";
    public static final String MANUAL = "MANUAL";

    /** Bed charges worked out for one admission. */
    public record BedCharges(List<Bill.BillItem> items, double total, double days) {}

    /** What a sync did: the running bill (null if the patient has no charges yet) and what changed. */
    public record SyncResult(Bill bill, List<String> added, List<String> updated, List<String> notes) {}

    private final BillRepository billRepository;
    private final AdmissionRepository admissionRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final MedicineRepository medicineRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final VisitingDoctorRepository visitingDoctorRepository;

    public BillingSyncService(BillRepository billRepository, AdmissionRepository admissionRepository,
                              PrescriptionRepository prescriptionRepository, MedicineRepository medicineRepository,
                              AppointmentRepository appointmentRepository, DoctorRepository doctorRepository,
                              VisitingDoctorRepository visitingDoctorRepository) {
        this.billRepository = billRepository;
        this.admissionRepository = admissionRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.medicineRepository = medicineRepository;
        this.appointmentRepository = appointmentRepository;
        this.doctorRepository = doctorRepository;
        this.visitingDoctorRepository = visitingDoctorRepository;
    }

    public synchronized SyncResult sync(String patientId) {
        return sync(patientId, List.of());
    }

    // One sync at a time, so two clicks can never create two running bills.
    // Extra lines typed in by staff are added to the same bill.
    public synchronized SyncResult sync(String patientId, List<Bill.BillItem> manualItems) {
        List<Bill> existing = billRepository.findByPatientIdAndRunningTrue(patientId);
        Bill bill = existing.isEmpty() ? null : existing.get(0);

        List<Bill.BillItem> items = new ArrayList<>();
        if (bill != null && bill.getItems() != null) items.addAll(bill.getItems());

        List<String> added = new ArrayList<>();
        List<String> updated = new ArrayList<>();
        List<String> notes = new ArrayList<>();
        boolean changed = false;

        changed |= syncAdmissions(patientId, items, added, updated, notes);
        changed |= syncDrugs(patientId, items, added, notes);
        changed |= syncConsultations(patientId, items, added, notes);

        for (Bill.BillItem extra : manualItems) {
            items.add(new Bill.BillItem(extra.getDescription(), extra.getAmount(), MANUAL, UUID.randomUUID().toString()));
            added.add(extra.getDescription() + " - " + money(extra.getAmount()));
            changed = true;
        }

        // Nothing to charge, so no bill is created
        if (items.isEmpty()) return new SyncResult(bill, added, updated, notes);

        if (bill == null) {
            bill = new Bill();
            bill.setPatientId(patientId);
            bill.setRunning(true);
            changed = true;
        }

        if (changed) {
            boolean wasPaid = "PAID".equals(bill.getStatus());
            bill.setItems(items);
            bill.setTotal(totalOf(items));

            // While the HMO has not decided, its share follows the growing total
            if (bill.getHmoCoveragePercent() > 0 && "PENDING".equals(bill.getClaimStatus())) {
                bill.setHmoCoveredAmount(Bill.round(bill.getTotal() * bill.getHmoCoveragePercent() / 100.0));
            }

            bill.recalculateStatus();
            // A paid bill that gets new charges is unpaid again, so reminders can resume
            if (wasPaid && !"PAID".equals(bill.getStatus())) bill.setPaymentReminderSent(false);
            bill = billRepository.save(bill);

            String claim = bill.getClaimStatus() == null ? "NONE" : bill.getClaimStatus();
            boolean hmoDecided = bill.getHmoCoveredAmount() > 0 && !claim.equals("NONE") && !claim.equals("PENDING");
            if (hmoDecided && (!added.isEmpty() || !updated.isEmpty())) {
                notes.add("The HMO share was already decided, so new charges are for the patient to pay.");
            }
        }
        return new SyncResult(bill, added, updated, notes);
    }

    // ---------- bed charges ----------

    private boolean syncAdmissions(String patientId, List<Bill.BillItem> items,
                                   List<String> added, List<String> updated, List<String> notes) {
        boolean changed = false;
        for (Admission admission : admissionRepository.findByPatientId(patientId)) {
            if (billedSeparately(admission)) continue;
            if (admission.getStays() == null || admission.getStays().isEmpty()) continue;

            BedCharges charges = bedCharges(admission, endOf(admission));
            List<Bill.BillItem> fresh = new ArrayList<>();
            for (Bill.BillItem line : charges.items()) {
                fresh.add(new Bill.BillItem(line.getDescription(), line.getAmount(), ADMISSION, admission.getId()));
            }
            if (fresh.isEmpty()) continue;

            List<Bill.BillItem> old = linesOf(items, ADMISSION, admission.getId());
            if (!sameLines(old, fresh)) {
                replaceLines(items, old, fresh);
                changed = true;
                if (old.isEmpty()) {
                    for (Bill.BillItem line : fresh) added.add(line.getDescription() + " - " + money(line.getAmount()));
                } else {
                    updated.add("Bed charges brought up to date (" + money(charges.total()) + " so far)");
                }
            }

            if ("ADMITTED".equals(admission.getStatus())) {
                String note = "The patient is still admitted, so bed charges are counted up to now and keep growing until discharge.";
                if (!notes.contains(note)) notes.add(note);
            }
        }
        return changed;
    }

    // Admissions discharged before running bills existed already have their own separate bill
    private boolean billedSeparately(Admission admission) {
        String billId = admission.getBillId();
        if (billId == null || billId.isBlank()) return false;
        Bill linked = billRepository.findById(billId).orElse(null);
        return linked != null && !linked.isRunning();
    }

    /**
     * Bed charges, worked out per stay: daily rate x days spent (to the minute).
     * If the whole admission lasted under one day, a top-up line makes it one full day.
     */
    public BedCharges bedCharges(Admission admission, LocalDateTime end) {
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

        return new BedCharges(items, Bill.round(total), Bill.round(totalDays));
    }

    private LocalDateTime endOf(Admission admission) {
        return admission.getDischargedAt() != null ? admission.getDischargedAt() : LocalDateTime.now();
    }

    // ---------- drugs ----------

    // A drug is charged once, after the pharmacist has dispensed the prescription
    private boolean syncDrugs(String patientId, List<Bill.BillItem> items, List<String> added, List<String> notes) {
        Set<String> billed = new HashSet<>();
        for (Bill.BillItem item : items) {
            if (DRUG.equals(item.getSourceType()) && item.getSourceId() != null) billed.add(item.getSourceId());
        }

        boolean changed = false;
        for (Prescription prescription : prescriptionRepository.findByPatientId(patientId)) {
            if (!prescription.isDispensed() || prescription.getItems() == null) continue;

            for (int i = 0; i < prescription.getItems().size(); i++) {
                Prescription.PrescribedItem item = prescription.getItems().get(i);
                String key = prescription.getId() + "#" + i;
                if (billed.contains(key) || item.getQuantity() <= 0) continue;

                String medicineId = item.getMedicineId();
                Medicine medicine = (medicineId == null || medicineId.isBlank())
                        ? null : medicineRepository.findById(medicineId).orElse(null);

                String name = item.getMedicationName();
                if ((name == null || name.isBlank()) && medicine != null) name = medicine.getName();
                if (name == null || name.isBlank()) name = "A medication";

                if (medicine == null || medicine.getPrice() <= 0) {
                    String note = name + " was dispensed but has no price in the pharmacy list, so it was not billed.";
                    if (!notes.contains(note)) notes.add(note);
                    continue;
                }

                double amount = Bill.round(medicine.getPrice() * item.getQuantity());
                String description = "Drug - " + name + " (" + item.getQuantity() + " x " + money(medicine.getPrice()) + ")";
                items.add(new Bill.BillItem(description, amount, DRUG, key));
                added.add(description + " - " + money(amount));
                changed = true;
            }
        }
        return changed;
    }

    // ---------- consultations ----------

    // One charge per appointment the patient really attended (completed and checked in)
    private boolean syncConsultations(String patientId, List<Bill.BillItem> items, List<String> added, List<String> notes) {
        Set<String> billed = new HashSet<>();
        for (Bill.BillItem item : items) {
            if (CONSULTATION.equals(item.getSourceType()) && item.getSourceId() != null) billed.add(item.getSourceId());
        }

        // A visit that already has its own bill (for example one made at the front desk) is not charged again
        Set<String> billedOnOwnBill = new HashSet<>();
        for (Bill other : billRepository.findByPatientId(patientId)) {
            String linked = other.getAppointmentId();
            if (!other.isRunning() && linked != null && !linked.isBlank()) billedOnOwnBill.add(linked);
        }

        Set<String> unpriced = new LinkedHashSet<>();
        boolean changed = false;

        for (Appointment appointment : appointmentRepository.findByPatientId(patientId)) {
            if (!"Completed".equals(appointment.getStatus()) || !appointment.isAttendanceConfirmed()) continue;
            if (billed.contains(appointment.getId())) continue;
            if (billedOnOwnBill.contains(appointment.getId())) continue;

            String doctorId = appointment.getDoctorId();
            boolean hasDoctor = doctorId != null && !doctorId.isBlank();
            Doctor doctor = hasDoctor ? doctorRepository.findById(doctorId).orElse(null) : null;
            VisitingDoctor visiting = hasDoctor ? visitingDoctorRepository.findByDoctorId(doctorId) : null;
            String doctorName = doctor == null ? "the doctor" : doctor.getName();

            // A visiting doctor has their own fee; a regular doctor's fee is on the doctor record
            double fee = visiting != null ? visiting.getConsultationFee() : (doctor == null ? 0 : doctor.getConsultationFee());
            if (fee <= 0) {
                unpriced.add(doctorName);
                continue;
            }

            double amount = Bill.round(fee);
            String description = "Consultation - " + doctorName + " (" + dateText(appointment.getAppointmentDate()) + ")";
            items.add(new Bill.BillItem(description, amount, CONSULTATION, appointment.getId()));
            added.add(description + " - " + money(amount));
            changed = true;
        }

        for (String name : unpriced) {
            notes.add("No consultation fee is set for " + name + ", so attended visits with them were not billed.");
        }
        return changed;
    }

    // ---------- helpers ----------

    private List<Bill.BillItem> linesOf(List<Bill.BillItem> items, String type, String sourceId) {
        List<Bill.BillItem> result = new ArrayList<>();
        for (Bill.BillItem item : items) {
            if (type.equals(item.getSourceType()) && sourceId.equals(item.getSourceId())) result.add(item);
        }
        return result;
    }

    private boolean sameLines(List<Bill.BillItem> a, List<Bill.BillItem> b) {
        if (a.size() != b.size()) return false;
        for (int i = 0; i < a.size(); i++) {
            if (!Objects.equals(a.get(i).getDescription(), b.get(i).getDescription())) return false;
            if (Math.abs(a.get(i).getAmount() - b.get(i).getAmount()) > 0.004) return false;
        }
        return true;
    }

    // The new lines take the place of the old ones, so the order of the bill stays steady
    private void replaceLines(List<Bill.BillItem> items, List<Bill.BillItem> old, List<Bill.BillItem> fresh) {
        int at = old.isEmpty() ? items.size() : items.indexOf(old.get(0));
        items.removeAll(old);
        items.addAll(Math.min(Math.max(at, 0), items.size()), fresh);
    }

    private double totalOf(List<Bill.BillItem> items) {
        double sum = 0;
        for (Bill.BillItem item : items) sum += item.getAmount();
        return Bill.round(sum);
    }

    private String dateText(String raw) {
        if (raw == null || raw.isBlank()) return "date not recorded";
        String text = raw.replace('T', ' ');
        return text.length() > 16 ? text.substring(0, 16) : text;
    }

    private String dayText(double days) {
        return String.format(Locale.US, "%.2f %s", days, Math.abs(days - 1) < 0.005 ? "day" : "days");
    }

    private String money(double value) {
        return "NGN " + String.format(Locale.US, "%,.2f", value);
    }
}