package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String username = body.get("username");
        String password = body.get("password");

        User user = username == null ? null : userRepository.findByUsername(username.trim());

        if (user == null || password == null || !passwordEncoder.matches(password, user.getPassword())) {
            request.setAttribute("auditActor", username == null || username.isBlank() ? "unknown" : username.trim());
            request.setAttribute("auditDetail", "Failed login attempt");
            request.setAttribute("auditAlways", true);
            throw new ApiException(401, "Invalid username or password");
        }
        if (!user.isApproved()) {
            String applied = "LAB_STAFF".equals(user.getRequestedRole()) ? "laboratory staff" : "receptionist";
            request.setAttribute("auditActor", user.getUsername());
            request.setAttribute("auditDetail", "Login blocked: " + applied + " application not approved yet");
            request.setAttribute("auditAlways", true);
            throw new ApiException(403, "Your " + applied + " application is awaiting admin approval.");
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole(), user.getPatientId(), user.getDoctorId());

        request.setAttribute("auditActor", user.getUsername());
        request.setAttribute("auditRole", user.getRole());
        request.setAttribute("auditDetail", "Logged in");

        Map<String, String> result = new HashMap<>();
        result.put("token", token);
        result.put("role", user.getRole());
        if (user.getPatientId() != null) result.put("patientId", user.getPatientId());
        if (user.getDoctorId() != null) result.put("doctorId", user.getDoctorId());
        return result;
    }

    @PostMapping("/signup")
    public String signup(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String role = body.get("role");
        if (role == null || (!role.equals("DOCTOR") && !role.equals("PATIENT") && !role.equals("RECEPTIONIST") && !role.equals("LAB_STAFF"))) {
            throw new ApiException(400, "Invalid role for signup");
        }

        String username = AccountRules.cleanUsername(body.get("username"));
        String password = body.get("password");
        AccountRules.checkPassword(password);
        String email = AccountRules.cleanEmail(body.get("email"));

        if (userRepository.findByUsername(username) != null) {
            throw new ApiException(409, "That username is already taken.");
        }
        if (userRepository.findByEmail(email) != null) {
            throw new ApiException(409, "An account with that email already exists.");
        }

        User user = new User(username, passwordEncoder.encode(password), role);
        user.setEmail(email);

        if (role.equals("PATIENT")) {
            String name = body.get("name");
            String ageStr = body.get("age");
            String gender = body.get("gender");

            if (name == null || ageStr == null || gender == null) {
                throw new ApiException(400, "Name, age, and gender are required for patient signup");
            }

            if (!gender.equals("Male") && !gender.equals("Female") && !gender.equals("Rather Not Say")) {
                throw new ApiException(400, "Gender must be Male, Female or Rather Not Say.");
            }

            int age;
            try {
                age = Integer.parseInt(ageStr.trim());
            } catch (NumberFormatException e) {
                throw new ApiException(400, "Age must be a number.");
            }
            if (age < 0 || age > 130) {
                throw new ApiException(400, "Age must be between 0 and 130.");
            }

            Patient patient = new Patient(name, age, gender, "", null);
            patient.setEmail(email);
            patient.setDateOfBirth(body.get("dateOfBirth"));
            patient.setBloodGroup(body.get("bloodGroup"));
            patient.setRhFactor(body.get("rhFactor"));
            patient.setMedicalHistory(body.get("medicalHistory"));
            patient.setAllergies(body.get("allergies"));
            patient.setDisabilities(body.get("disabilities"));
            patient.setPhoneNumber(body.get("phoneNumber"));
            patient.setAddress(body.get("address"));
            patient.setEmergencyContactName(body.get("emergencyContactName"));
            patient.setEmergencyContactPhone(body.get("emergencyContactPhone"));
            patient.setEmergencyContactRelationship(body.get("emergencyContactRelationship"));
            Patient savedPatient = patientRepository.save(patient);
            user.setPatientId(savedPatient.getId());
        }

        if (role.equals("DOCTOR")) {
            String name = body.get("name");
            String specialization = body.get("specialization");
            String phoneNumber = body.get("phoneNumber");

            if (name == null || specialization == null || phoneNumber == null) {
                throw new ApiException(400, "Name, specialization, and phone number are required for doctor signup");
            }

            Doctor doctor = new Doctor(name, specialization, phoneNumber);
            Doctor savedDoctor = doctorRepository.save(doctor);
            user.setDoctorId(savedDoctor.getId());
        }

        // Receptionists and laboratory staff must be approved by an administrator
        boolean needsApproval = role.equals("RECEPTIONIST") || role.equals("LAB_STAFF");

        if (needsApproval) {
            String name = body.get("name");
            String phoneNumber = body.get("phoneNumber");
            if (name == null || name.isBlank() || phoneNumber == null || phoneNumber.isBlank()) {
                throw new ApiException(400, "Name and phone number are required for staff signup");
            }
            user.setApproved(false);
            user.setRequestedRole(role);
            user.setFullName(name);
            user.setPhoneNumber(phoneNumber);
        }

        userRepository.save(user);

        request.setAttribute("auditActor", username);
        request.setAttribute("auditRole", role);
        request.setAttribute("auditDetail", needsApproval
                ? (role.equals("LAB_STAFF") ? "Laboratory staff" : "Receptionist") + " application submitted"
                : "Account created (" + role.toLowerCase() + ")");

        return needsApproval
                ? "Application submitted. An administrator must approve it before you can log in."
                : "Account created successfully";
    }
}