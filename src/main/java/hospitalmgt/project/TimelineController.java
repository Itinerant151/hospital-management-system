package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * A patient's history in one list: appointments, diagnoses and treatment,
 * prescriptions and hospital visits, ordered by date.
 */
@RestController
@RequestMapping("/api/timeline")
public class TimelineController {

    public static class TimelineEvent {
        private final String date;   // ISO date-time, e.g. 2026-10-02T09:30:00
        private final String type;   // APPOINTMENT, DIAGNOSIS, PRESCRIPTION or VISIT
        private final String title;
        private final String detail;
        private final String by;

        public TimelineEvent(String date, String type, String title, String detail, String by) {
            this.date = date;
            this.type = type;
            this.title = title;
            this.detail = detail;
            this.by = by;
        }

        public String getDate() { return date; }
        public String getType() { return type; }
        public String getTitle() { return title; }
        public String getDetail() { return detail; }
        public String getBy() { return by; }
    }

    @Autowired private PatientRepository patientRepository;
    @Autowired private AppointmentRepository appointmentRepository;
    @Autowired private DiagnosisRecordRepository diagnosisRecordRepository;
    @Autowired private PrescriptionRepository prescriptionRepository;
    @Autowired private CheckInRepository checkInRepository;
    @Autowired private DoctorRepository doctorRepository;

    @GetMapping("/mine")
    public Map<String, Object> mine(HttpServletRequest request) {
        String patientId = (String) request.getAttribute("patientId");
        if (patientId == null) throw new ApiException(400, "No patient record is linked to this account.");
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ApiException(404, "Patient not found."));
        return build(patient);
    }

    @GetMapping("/patient/{patientId}")
    public Map<String, Object> forPatient(@PathVariable String patientId, HttpServletRequest request) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ApiException(404, "Patient not found."));
        PatientAccess.checkDoctorAccess(request, patient);
        return build(patient);
    }

    private Map<String, Object> build(Patient patient) {
        String patientId = patient.getId();

        Map<String, String> doctorNames = new HashMap<>();
        for (Doctor doctor : doctorRepository.findAll()) {
            if (doctor.getId() != null && doctor.getName() != null) doctorNames.put(doctor.getId(), doctor.getName());
        }

        List<TimelineEvent> events = new ArrayList<>();

        for (Appointment a : appointmentRepository.findByPatientId(patientId)) {
            String doctor = doctorNames.getOrDefault(a.getDoctorId(), "a doctor");
            events.add(new TimelineEvent(
                    norm(a.getAppointmentDate()),
                    "APPOINTMENT",
                    "Appointment: " + (a.getReason() == null || a.getReason().isBlank() ? "General visit" : a.getReason()),
                    "Status: " + (a.getStatus() == null ? "Scheduled" : a.getStatus()),
                    doctor));
        }

        for (DiagnosisRecord d : diagnosisRecordRepository.findByPatientId(patientId)) {
            events.add(new TimelineEvent(
                    norm(d.getRecordedAt()),
                    "DIAGNOSIS",
                    "Diagnosis: " + d.getDiagnosis(),
                    d.getTreatment() == null || d.getTreatment().isBlank() ? "" : "Treatment: " + d.getTreatment(),
                    d.getDoctorName()));
        }

        for (Prescription p : prescriptionRepository.findByPatientId(patientId)) {
            List<Prescription.PrescribedItem> items = p.getItems() == null ? List.of() : p.getItems();
            String names = items.stream()
                    .map(Prescription.PrescribedItem::getMedicationName)
                    .filter(Objects::nonNull)
                    .collect(Collectors.joining(", "));
            String detail = items.stream()
                    .map(i -> (i.getMedicationName() == null ? "Medicine" : i.getMedicationName())
                            + ": " + (i.getDosage() == null ? "" : i.getDosage())
                            + (i.getDuration() == null || i.getDuration().isBlank() ? "" : " for " + i.getDuration())
                            + (i.getInstructions() == null || i.getInstructions().isBlank() ? "" : " (" + i.getInstructions() + ")"))
                    .collect(Collectors.joining("; "));
            LocalDateTime when = p.getCreatedAt() != null ? p.getCreatedAt()
                    : (p.getDateIssued() != null ? p.getDateIssued().atStartOfDay() : null);
            events.add(new TimelineEvent(
                    norm(when),
                    "PRESCRIPTION",
                    "Prescription: " + (names.isEmpty() ? "medication" : names),
                    detail + (p.isDispensed() ? " · Dispensed by pharmacy" : ""),
                    p.getDoctorName()));
        }

        for (CheckIn c : checkInRepository.findAll()) {
            if (!"PATIENT".equals(c.getType()) || !patientId.equals(c.getPersonId())) continue;
            String detail = (c.getPurpose() == null || c.getPurpose().isBlank() ? "" : c.getPurpose() + ". ")
                    + (c.getCheckOutTime() == null ? "Still in the hospital." : "Checked out " + norm(c.getCheckOutTime()).replace('T', ' ').substring(0, 16) + ".");
            events.add(new TimelineEvent(norm(c.getCheckInTime()), "VISIT", "Hospital visit: checked in", detail, c.getHandledBy()));
        }

        events.sort(Comparator.comparing(TimelineEvent::getDate).reversed());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("patientName", patient.getName());
        result.put("currentDiagnosis", patient.getDiagnosis());
        result.put("events", events);
        return result;
    }

    // Brings every date format used in the app to yyyy-MM-ddTHH:mm:ss so they sort correctly as text
    private String norm(String value) {
        if (value == null || value.isBlank()) return "1970-01-01T00:00:00";
        if (value.length() == 10) return value + "T00:00:00";
        if (value.length() == 16) return value + ":00";
        return value.length() > 19 ? value.substring(0, 19) : value;
    }

    private String norm(LocalDateTime value) {
        return value == null ? norm((String) null) : norm(value.toString());
    }
}