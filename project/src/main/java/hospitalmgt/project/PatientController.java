package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/patients")
public class PatientController {

    @Autowired
    private PatientRepository patientRepository;

    @GetMapping
    public List<Patient> getAllPatients() {
        return patientRepository.findAll();
    }

    @PostMapping
    public Patient addPatient(@RequestBody Patient patient) {
        return patientRepository.save(patient);
    }

    @GetMapping("/{id}")
    public Patient getPatientById(@PathVariable String id) {
        return patientRepository.findById(id).orElse(null);
    }

    @DeleteMapping("/{id}")
    public String deletePatient(@PathVariable String id) {
        patientRepository.deleteById(id);
        return "Patient deleted successfully";
    }

    @PutMapping("/{id}")
    public Patient updatePatient(@PathVariable String id, @RequestBody Patient patient) {
        patient.setId(id);
        return patientRepository.save(patient);
    }

    @PutMapping("/{id}/assign-doctor")
    public Patient assignDoctor(@PathVariable String id, @RequestBody Map<String, String> body) {
        Patient patient = patientRepository.findById(id).orElseThrow();
        patient.setDoctorId(body.get("doctorId"));
        return patientRepository.save(patient);
    }

    // Doctor: view patients assigned to a given doctor (own or another's, read-only for others)
    @GetMapping("/by-doctor/{doctorId}")
    public List<Patient> getPatientsByDoctor(@PathVariable String doctorId) {
        return patientRepository.findByDoctorId(doctorId);
    }

    // Doctor: update ONLY the diagnosis of a patient — only if that patient is assigned to them
    @PutMapping("/{id}/diagnosis")
    public Patient updateDiagnosis(@PathVariable String id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        String role = (String) request.getAttribute("role");
        Patient patient = patientRepository.findById(id).orElseThrow();

        if ("DOCTOR".equals(role)) {
            String ownDoctorId = (String) request.getAttribute("doctorId");
            if (patient.getDoctorId() == null || !patient.getDoctorId().equals(ownDoctorId)) {
                throw new RuntimeException("You can only edit diagnosis for your own patients");
            }
        }

        patient.setDiagnosis(body.get("diagnosis"));
        return patientRepository.save(patient);
    }

    @GetMapping("/me")
    public Patient getMyProfile(HttpServletRequest request) {
        String patientId = (String) request.getAttribute("patientId");
        return patientRepository.findById(patientId).orElseThrow();
    }

    @PutMapping("/me")
    public Patient updateMyProfile(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String patientId = (String) request.getAttribute("patientId");
        Patient patient = patientRepository.findById(patientId).orElseThrow();

        if (body.get("name") != null) patient.setName(body.get("name"));
        if (body.get("age") != null) patient.setAge(Integer.parseInt(body.get("age")));
        if (body.get("gender") != null) patient.setGender(body.get("gender"));

        return patientRepository.save(patient);
    }
}