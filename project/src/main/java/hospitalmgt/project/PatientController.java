package hospitalmgt.project;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/patients")
public class PatientController {

    @Autowired
    private PatientRepository patientRepository;

    // Get all patients
    @GetMapping
    public List<Patient> getAllPatients() {
        return patientRepository.findAll();
    }

    // Add a new patient
    @PostMapping
    public Patient addPatient(@RequestBody Patient patient) {
        return patientRepository.save(patient);
    }

    // Get a single patient by ID
    @GetMapping("/{id}")
    public Patient getPatientById(@PathVariable String id) {
        return patientRepository.findById(id).orElse(null);
    }

    // Delete a patient
    @DeleteMapping("/{id}")
    public String deletePatient(@PathVariable String id) {
        patientRepository.deleteById(id);
        return "Patient deleted successfully";
    }
    // Assign or change a patient's doctor
    @PutMapping("/{id}/assign-doctor")
    public Patient assignDoctor(@PathVariable String id, @RequestBody Map<String, String> body) {
        Patient patient = patientRepository.findById(id).orElseThrow();
        patient.setDoctorId(body.get("doctorId"));
        return patientRepository.save(patient);
    }
}