package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Role-specific dashboard numbers. Every figure is an aggregation: a count or a sum
 * worked out from many records (patients, appointments, bills, ...).
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired private PatientRepository patientRepository;
    @Autowired private DoctorRepository doctorRepository;
    @Autowired private AppointmentRepository appointmentRepository;
    @Autowired private BillRepository billRepository;
    @Autowired private PrescriptionRepository prescriptionRepository;
    @Autowired private MedicineRepository medicineRepository;
    @Autowired private VisitorRepository visitorRepository;
    @Autowired private CheckInRepository checkInRepository;
    @Autowired private DiagnosisRecordRepository diagnosisRecordRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private LaboratoryOrderRepository laboratoryOrderRepository;
    @Autowired private LaboratoryTestRepository laboratoryTestRepository;

    @GetMapping("/me")
    public Map<String, Object> me(HttpServletRequest request) {
        String role = (String) request.getAttribute("role");
        if (role == null) throw new ApiException(401, "Please log in again.");

        List<Map<String, Object>> cards = new ArrayList<>();
        List<Map<String, Object>> upcoming = new ArrayList<>();
        String title;
        String upcomingTitle = "Upcoming appointments";

        String today = LocalDate.now().toString();
        String nowText = LocalDateTime.now().toString().substring(0, 16);

        Map<String, String> patientNames = new HashMap<>();
        for (Patient p : patientRepository.findAll()) patientNames.put(p.getId(), p.getName());
        Map<String, String> doctorNames = new HashMap<>();
        for (Doctor d : doctorRepository.findAll()) doctorNames.put(d.getId(), d.getName());

        switch (role) {
            case "ADMIN": {
                title = "Hospital overview";
                upcomingTitle = "Today's appointments";
                List<Appointment> appointments = appointmentRepository.findAll();
                List<Bill> bills = billRepository.findAll();
                List<Medicine> medicines = medicineRepository.findAll();

                card(cards, "Patients", patientRepository.count(), "number");
                card(cards, "Doctors", doctorRepository.count(), "number");
                card(cards, "Appointments today", countToday(appointments, today), "number");
                card(cards, "Total appointments", appointments.size(), "number");
                card(cards, "Payments collected", collected(bills), "money");
                card(cards, "Patient balances owed", patientBalances(bills), "money");
                card(cards, "HMO payments owed", hmoOwed(bills), "money");
                card(cards, "Pending HMO claims", pendingClaims(bills), "number");
                card(cards, "Prescriptions waiting", prescriptionRepository.findAll().stream().filter(p -> !p.isDispensed()).count(), "number");
                card(cards, "Low stock medicines", medicines.stream().filter(m -> m.getStockQuantity() < 10).count(), "number");
                card(cards, "Visitors in building", visitorsIn(), "number");
                card(cards, "Staff applications", userRepository.findByRequestedRoleInAndApprovedFalse(List.of("RECEPTIONIST", "LAB_STAFF")).size(), "number");
                card(cards, "Emergency patients", patientRepository.findByEmergencyPatientTrue().size(), "number");
                card(cards, "Audit events today", auditToday(today), "number");

                addUpcoming(upcoming, appointments.stream()
                        .filter(a -> isToday(a, today)).toList(), patientNames, doctorNames, true);
                break;
            }
            case "RECEPTIONIST": {
                title = "Front desk overview";
                upcomingTitle = "Today's appointments";
                List<Appointment> appointments = appointmentRepository.findAll();
                List<Bill> bills = billRepository.findAll();
                List<CheckIn> inside = checkInRepository.findByStatus("Checked In");

                card(cards, "Appointments today", countToday(appointments, today), "number");
                card(cards, "Patients checked in", inside.stream().filter(c -> "PATIENT".equals(c.getType())).count(), "number");
                card(cards, "Staff checked in", inside.stream().filter(c -> "STAFF".equals(c.getType())).count(), "number");
                card(cards, "Visitors in building", visitorsIn(), "number");
                card(cards, "Unpaid bills", bills.stream().filter(b -> !"PAID".equals(b.getStatus())).count(), "number");
                card(cards, "Patient balances owed", patientBalances(bills), "money");
                card(cards, "Pending HMO claims", pendingClaims(bills), "number");
                card(cards, "Emergency patients", patientRepository.findByEmergencyPatientTrue().size(), "number");
                card(cards, "Total patients", patientRepository.count(), "number");

                addUpcoming(upcoming, appointments.stream()
                        .filter(a -> isToday(a, today)).toList(), patientNames, doctorNames, true);
                break;
            }
            case "LAB_STAFF": {
                title = "Laboratory overview";
                upcomingTitle = "Orders waiting for the lab";
                List<LaboratoryOrder> labOrders = laboratoryOrderRepository.findAll();
                List<LaboratoryOrder> open = labOrders.stream()
                        .filter(o -> !LaboratoryOrder.COMPLETED.equals(o.getStatus()))
                        .toList();

                card(cards, "Waiting for specimen", countStatus(open, LaboratoryOrder.PENDING), "number");
                card(cards, "Specimens collected", countStatus(open, LaboratoryOrder.COLLECTED), "number");
                card(cards, "Results in progress", countStatus(open, LaboratoryOrder.IN_PROGRESS), "number");
                card(cards, "Urgent open orders", open.stream().filter(o -> "URGENT".equals(o.getPriority())).count(), "number");
                card(cards, "Completed today", labOrders.stream()
                        .filter(o -> LaboratoryOrder.COMPLETED.equals(o.getStatus())
                                && o.getCompletedAt() != null
                                && o.getCompletedAt().toLocalDate().toString().equals(today))
                        .count(), "number");
                card(cards, "Orders completed (all time)", countStatus(labOrders, LaboratoryOrder.COMPLETED), "number");
                card(cards, "Active tests in catalogue", laboratoryTestRepository.findByActiveTrue().size(), "number");

                List<LaboratoryOrder> waiting = open.stream()
                        .sorted(Comparator
                                .comparing((LaboratoryOrder o) -> "URGENT".equals(o.getPriority()) ? 0 : 1)
                                .thenComparing(o -> o.getOrderedAt() == null ? LocalDateTime.MAX : o.getOrderedAt()))
                        .limit(8)
                        .toList();

                for (LaboratoryOrder o : waiting) {
                    int tests = o.getItems() == null ? 0 : o.getItems().size();
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("when", o.getOrderedAt() == null ? null : o.getOrderedAt().toString());
                    row.put("title", o.getPatientName());
                    row.put("detail", tests + (tests == 1 ? " test" : " tests")
                            + ("URGENT".equals(o.getPriority()) ? " · Urgent" : "")
                            + " · " + labStatusLabel(o.getStatus()));
                    upcoming.add(row);
                }
                break;
            }
            case "DOCTOR": {
                title = "My practice";
                String doctorId = (String) request.getAttribute("doctorId");
                if (doctorId == null) throw new ApiException(400, "No doctor record is linked to this account.");
                List<Appointment> mine = appointmentRepository.findByDoctorId(doctorId);
                List<Patient> patients = patientRepository.findByDoctorId(doctorId);

                card(cards, "My patients", patients.size(), "number");
                card(cards, "Appointments today", countToday(mine, today), "number");
                card(cards, "Scheduled appointments", mine.stream().filter(a -> "Scheduled".equals(a.getStatus())).count(), "number");
                card(cards, "Completed appointments", mine.stream().filter(a -> "Completed".equals(a.getStatus())).count(), "number");
                card(cards, "Diagnoses recorded", diagnosisRecordRepository.findByDoctorId(doctorId).size(), "number");
                card(cards, "Prescriptions issued", prescriptionRepository.findByDoctorId(doctorId).size(), "number");
                card(cards, "Patients without a diagnosis", patients.stream().filter(p -> p.getDiagnosis() == null || p.getDiagnosis().isBlank()).count(), "number");
                card(cards, "Emergency patients", patientRepository.findByEmergencyPatientTrue().size(), "number");

                addUpcoming(upcoming, mine.stream()
                        .filter(a -> "Scheduled".equals(a.getStatus()) && a.getAppointmentDate() != null && a.getAppointmentDate().compareTo(nowText) >= 0)
                        .sorted(Comparator.comparing(Appointment::getAppointmentDate))
                        .limit(6).toList(), patientNames, doctorNames, true);
                break;
            }
            case "PATIENT": {
                title = "My health summary";
                String patientId = (String) request.getAttribute("patientId");
                if (patientId == null) throw new ApiException(400, "No patient record is linked to this account.");
                List<Appointment> mine = appointmentRepository.findByPatientId(patientId);
                List<Bill> bills = billRepository.findByPatientId(patientId);
                List<Prescription> prescriptions = prescriptionRepository.findByPatientId(patientId);

                card(cards, "Upcoming appointments", mine.stream().filter(a -> "Scheduled".equals(a.getStatus()) && a.getAppointmentDate() != null && a.getAppointmentDate().compareTo(nowText) >= 0).count(), "number");
                card(cards, "Completed appointments", mine.stream().filter(a -> "Completed".equals(a.getStatus())).count(), "number");
                card(cards, "Balance I owe", patientBalances(bills), "money");
                card(cards, "Total I have paid", bills.stream().mapToDouble(Bill::getAmountPaid).sum(), "money");
                card(cards, "HMO claims pending", pendingClaims(bills), "number");
                card(cards, "Prescriptions", prescriptions.size(), "number");
                card(cards, "Waiting for the pharmacy", prescriptions.stream().filter(p -> !p.isDispensed()).count(), "number");
                card(cards, "Diagnoses on record", diagnosisRecordRepository.findByPatientId(patientId).size(), "number");

                addUpcoming(upcoming, mine.stream()
                        .filter(a -> "Scheduled".equals(a.getStatus()) && a.getAppointmentDate() != null && a.getAppointmentDate().compareTo(nowText) >= 0)
                        .sorted(Comparator.comparing(Appointment::getAppointmentDate))
                        .limit(6).toList(), patientNames, doctorNames, false);
                break;
            }
            default:
                throw new ApiException(403, "No dashboard for this role.");
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("role", role);
        result.put("title", title);
        result.put("cards", cards);
        result.put("upcomingTitle", upcomingTitle);
        result.put("upcoming", upcoming);
        return result;
    }

    // ---------- aggregations ----------

    private double collected(List<Bill> bills) {
        return Bill.round(bills.stream().mapToDouble(b -> b.getAmountPaid() + (b.isHmoPaid() ? b.getHmoPaidAmount() : 0)).sum());
    }

    private double patientBalances(List<Bill> bills) {
        return Bill.round(bills.stream().mapToDouble(Bill::getBalance).sum());
    }

    private double hmoOwed(List<Bill> bills) {
        return Bill.round(bills.stream().mapToDouble(Bill::getHmoBalance).sum());
    }

    private long pendingClaims(List<Bill> bills) {
        return bills.stream().filter(b -> b.getHmoCoveredAmount() > 0 && "PENDING".equals(b.getClaimStatus())).count();
    }

    private long visitorsIn() {
        return visitorRepository.findAll().stream().filter(v -> "Checked In".equals(v.getStatus())).count();
    }

    private long auditToday(String today) {
        return auditLogRepository.findAll(PageRequest.of(0, 1000, Sort.by(Sort.Direction.DESC, "timestamp")))
                .getContent().stream()
                .filter(e -> e.getTimestamp() != null && e.getTimestamp().toLocalDate().toString().equals(today))
                .count();
    }

    private long countStatus(List<LaboratoryOrder> list, String status) {
        return list.stream().filter(o -> status.equals(o.getStatus())).count();
    }

    private String labStatusLabel(String status) {
        if (LaboratoryOrder.PENDING.equals(status)) return "Waiting for specimen";
        if (LaboratoryOrder.COLLECTED.equals(status)) return "Specimen collected";
        if (LaboratoryOrder.IN_PROGRESS.equals(status)) return "In progress";
        if (LaboratoryOrder.COMPLETED.equals(status)) return "Completed";
        return status == null ? "Unknown" : status;
    }

    private boolean isToday(Appointment a, String today) {
        return a.getAppointmentDate() != null && a.getAppointmentDate().startsWith(today) && !"Cancelled".equals(a.getStatus());
    }

    private long countToday(List<Appointment> list, String today) {
        return list.stream().filter(a -> isToday(a, today)).count();
    }

    // ---------- helpers ----------

    private void card(List<Map<String, Object>> cards, String label, Number value, String kind) {
        Map<String, Object> card = new LinkedHashMap<>();
        card.put("label", label);
        card.put("value", value);
        card.put("kind", kind);
        cards.add(card);
    }

    private void addUpcoming(List<Map<String, Object>> out, List<Appointment> list,
                             Map<String, String> patientNames, Map<String, String> doctorNames, boolean showPatient) {
        List<Appointment> sorted = list.stream()
                .sorted(Comparator.comparing(a -> a.getAppointmentDate() == null ? "" : a.getAppointmentDate()))
                .limit(8)
                .collect(Collectors.toList());
        for (Appointment a : sorted) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("when", a.getAppointmentDate());
            row.put("title", showPatient
                    ? patientNames.getOrDefault(a.getPatientId(), "Unknown patient")
                    : "With " + doctorNames.getOrDefault(a.getDoctorId(), "a doctor"));
            row.put("detail", (a.getReason() == null ? "" : a.getReason()) + " · " + a.getStatus());
            out.add(row);
        }
    }
}