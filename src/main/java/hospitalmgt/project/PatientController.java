package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/patients")
public class PatientController {
    @Autowired private PatientRepository patientRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private AccountEmailService accountEmailService;

    @GetMapping public List<Patient> getAllPatients() { return patientRepository.findAll(); }

    @GetMapping("/emergency")
    public List<Patient> getEmergencyPatients() { return patientRepository.findByEmergencyPatientTrue(); }

    @PostMapping
    public Patient addPatient(@RequestBody Patient patient) { return patientRepository.save(patient); }

    @PostMapping("/emergency")
    public Patient createEmergencyPatient(@RequestBody Patient patient) {
        patient.setId(null);
        patient.setEmergencyPatient(true);
        return patientRepository.save(patient);
    }

    @GetMapping("/{id}") public Patient getPatientById(@PathVariable String id) { return patientRepository.findById(id).orElse(null); }

    @DeleteMapping("/{id}")
    public String deletePatient(@PathVariable String id) { patientRepository.deleteById(id); return "Patient deleted successfully"; }

    @PutMapping("/{id}")
    public Patient updatePatient(@PathVariable String id, @RequestBody Patient incoming) {
        Patient existing = patientRepository.findById(id).orElseThrow();
        incoming.setId(id);
        incoming.setEmergencyPatient(existing.isEmergencyPatient());
        return patientRepository.save(incoming);
    }

    @PutMapping("/{id}/medical-profile")
    public Patient updateMedicalProfile(@PathVariable String id, @RequestBody Patient incoming, HttpServletRequest request) {
        Patient patient = patientRepository.findById(id).orElseThrow();

        // Reception staff may update contact and registration details, but not clinical information
        boolean receptionist = "RECEPTIONIST".equals(request.getAttribute("role"));

        if (incoming.getName() != null) patient.setName(incoming.getName());
        if (incoming.getAge() >= 0) patient.setAge(incoming.getAge());
        if (incoming.getGender() != null) patient.setGender(incoming.getGender());
        if (incoming.getDateOfBirth() != null) patient.setDateOfBirth(incoming.getDateOfBirth());
        if (incoming.getBloodGroup() != null) patient.setBloodGroup(incoming.getBloodGroup());
        if (incoming.getRhFactor() != null) patient.setRhFactor(incoming.getRhFactor());
        if (!receptionist && incoming.getMedicalHistory() != null) patient.setMedicalHistory(incoming.getMedicalHistory());
        if (incoming.getAllergies() != null) patient.setAllergies(incoming.getAllergies());
        if (incoming.getDisabilities() != null) patient.setDisabilities(incoming.getDisabilities());
        if (incoming.getPhoneNumber() != null) patient.setPhoneNumber(incoming.getPhoneNumber());
        if (incoming.getAddress() != null) patient.setAddress(incoming.getAddress());
        if (incoming.getMaritalStatus() != null) patient.setMaritalStatus(incoming.getMaritalStatus());
        if (incoming.getOccupation() != null) patient.setOccupation(incoming.getOccupation());
        if (incoming.getInsuranceProvider() != null) patient.setInsuranceProvider(incoming.getInsuranceProvider());
        if (incoming.getInsuranceNumber() != null) patient.setInsuranceNumber(incoming.getInsuranceNumber());
        if (incoming.getEmergencyContactName() != null) patient.setEmergencyContactName(incoming.getEmergencyContactName());
        if (incoming.getEmergencyContactPhone() != null) patient.setEmergencyContactPhone(incoming.getEmergencyContactPhone());
        if (incoming.getEmergencyContactRelationship() != null) patient.setEmergencyContactRelationship(incoming.getEmergencyContactRelationship());
        if (incoming.getNextOfKin() != null) patient.setNextOfKin(incoming.getNextOfKin());
        if (incoming.getNextOfKinPhone() != null) patient.setNextOfKinPhone(incoming.getNextOfKinPhone());
        if (!receptionist && incoming.getNotes() != null) patient.setNotes(incoming.getNotes());

        // If the patient has an account, the account email is the email. Staff cannot change it from here.
        User linked = userRepository.findByPatientId(id);
        if (linked != null && linked.getEmail() != null && !linked.getEmail().isBlank()) {
            patient.setEmail(linked.getEmail());
        } else if (incoming.getEmail() != null) {
            patient.setEmail(incoming.getEmail());
        }

        return patientRepository.save(patient);
    }

    @PutMapping("/{id}/assign-doctor")
    public Patient assignDoctor(@PathVariable String id, @RequestBody Map<String, String> body) {
        Patient patient = patientRepository.findById(id).orElseThrow();
        patient.setDoctorId(body.get("doctorId"));
        return patientRepository.save(patient);
    }

    @GetMapping("/by-doctor/{doctorId}") public List<Patient> getPatientsByDoctor(@PathVariable String doctorId) { return patientRepository.findByDoctorId(doctorId); }

    @PutMapping("/{id}/diagnosis")
    public Patient updateDiagnosis(@PathVariable String id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        Patient patient = patientRepository.findById(id).orElseThrow();
        if ("DOCTOR".equals(request.getAttribute("role"))) {
            String ownDoctorId = (String) request.getAttribute("doctorId");
            if (patient.getDoctorId() == null || !patient.getDoctorId().equals(ownDoctorId))
                throw new ApiException(403, "You can only edit diagnosis for your own patients");
        }
        patient.setDiagnosis(body.get("diagnosis"));
        return patientRepository.save(patient);
    }

    @GetMapping("/me")
    public Patient getMyProfile(HttpServletRequest request) {
        String patientId = (String) request.getAttribute("patientId");
        if (patientId == null) throw new ApiException(400, "No patient record is linked to this account.");

        // Makes sure the profile email matches the account email before it is shown
        User user = currentUser(request);
        if (user != null) accountEmailService.reconcile(user);

        return patientRepository.findById(patientId).orElseThrow();
    }

    @PutMapping("/me")
    public Patient updateMyProfile(@RequestBody Patient incoming, HttpServletRequest request) {
        String patientId = (String) request.getAttribute("patientId");
        if (patientId == null) throw new ApiException(400, "No patient record is linked to this account.");

        Patient patient = patientRepository.findById(patientId).orElseThrow();
        User user = currentUser(request);
        if (user == null) throw new ApiException(401, "Please log in again.");

        // Changing the email here also changes it on the account (My account)
        if (incoming.getEmail() != null && !incoming.getEmail().isBlank()) {
            accountEmailService.applyEmail(user, incoming.getEmail());
        }

        patient.setName(incoming.getName()); patient.setAge(incoming.getAge()); patient.setGender(incoming.getGender());
        patient.setDateOfBirth(incoming.getDateOfBirth()); patient.setBloodGroup(incoming.getBloodGroup()); patient.setRhFactor(incoming.getRhFactor());
        // Medical history and clinical notes are not on the patient's form, so never wipe them here
        if (incoming.getMedicalHistory() != null) patient.setMedicalHistory(incoming.getMedicalHistory());
        patient.setAllergies(incoming.getAllergies()); patient.setDisabilities(incoming.getDisabilities());
        patient.setPhoneNumber(incoming.getPhoneNumber()); patient.setAddress(incoming.getAddress());
        patient.setMaritalStatus(incoming.getMaritalStatus()); patient.setOccupation(incoming.getOccupation());
        patient.setInsuranceProvider(incoming.getInsuranceProvider()); patient.setInsuranceNumber(incoming.getInsuranceNumber());
        patient.setEmergencyContactName(incoming.getEmergencyContactName()); patient.setEmergencyContactPhone(incoming.getEmergencyContactPhone());
        patient.setEmergencyContactRelationship(incoming.getEmergencyContactRelationship()); patient.setNextOfKin(incoming.getNextOfKin());
        patient.setNextOfKinPhone(incoming.getNextOfKinPhone());
        patient.setEmail(user.getEmail() != null ? user.getEmail() : incoming.getEmail());
        return patientRepository.save(patient);
    }

    private User currentUser(HttpServletRequest request) {
        String username = (String) request.getAttribute("username");
        return username == null ? null : userRepository.findByUsername(username);
    }
}