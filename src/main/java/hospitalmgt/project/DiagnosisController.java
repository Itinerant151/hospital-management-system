package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/diagnoses")
public class DiagnosisController {

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private DiagnosisRecordRepository diagnosisRecordRepository;

    // Earlier diagnosis entries for a patient, newest first
    @GetMapping("/{patientId}")
    public List<DiagnosisRecord> history(@PathVariable String patientId) {
        return diagnosisRecordRepository.findByPatientId(patientId).stream()
                .sorted(Comparator.comparing(DiagnosisRecord::getRecordedAt).reversed())
                .toList();
    }

    // A doctor records a diagnosis (and optional treatment plan) for one of their own patients
    @PutMapping("/{patientId}")
    public Patient save(@PathVariable String patientId, @RequestBody Map<String, String> body,
                        HttpServletRequest request) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ApiException(404, "Patient not found."));

        String doctorId = (String) request.getAttribute("doctorId");
        if (doctorId == null || !doctorId.equals(patient.getDoctorId())) {
            throw new ApiException(403, "You can only record a diagnosis for your own patients.");
        }

        String diagnosis = body.get("diagnosis") == null ? "" : body.get("diagnosis").trim();
        String treatment = body.get("treatment") == null ? "" : body.get("treatment").trim();
        if (diagnosis.isEmpty()) {
            throw new ApiException(400, "Type the diagnosis before saving.");
        }
        if (diagnosis.length() > 2000 || treatment.length() > 2000) {
            throw new ApiException(400, "Keep the diagnosis and treatment under 2000 characters each.");
        }

        patient.setDiagnosis(diagnosis);
        Patient saved = patientRepository.save(patient);

        DiagnosisRecord record = new DiagnosisRecord();
        record.setPatientId(patientId);
        record.setDoctorId(doctorId);
        record.setDoctorName(doctorRepository.findById(doctorId).map(Doctor::getName).orElse("Doctor"));
        record.setDiagnosis(diagnosis);
        record.setTreatment(treatment.isEmpty() ? null : treatment);
        record.setRecordedAt(LocalDateTime.now());
        diagnosisRecordRepository.save(record);

        request.setAttribute("auditDetail", "Diagnosis recorded for patient " + patient.getName());
        return saved;
    }
}