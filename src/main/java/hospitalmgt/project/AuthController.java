package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
public class AuthController {

    // Letters (any language) with single spaces, hyphens or apostrophes between names
    private static final Pattern NAME_PATTERN = Pattern.compile("^\\p{L}+(?:[ '-]\\p{L}+)*$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\+?\\d{7,15}$");

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

    @Autowired
    private EmailVerificationController emailVerification;

    private String cleanPersonName(String raw) {
        String n = raw == null ? "" : raw.trim().replaceAll("\\s+", " ");
        if (n.length() < 2) {
            throw new ApiException(400, "Enter your full name (at least 2 letters).");
        }
        if (n.length() > 60) {
            throw new ApiException(400, "That name is too long (60 characters at most).");
        }
        if (!NAME_PATTERN.matcher(n).matches()) {
            throw new ApiException(400, "Names can only contain letters, spaces, hyphens and apostrophes.");
        }
        return n;
    }

    private String cleanPhone(String raw) {
        String p = raw == null ? "" : raw.replaceAll("[\\s-]", "");
        if (!PHONE_PATTERN.matcher(p).matches()) {
            throw new ApiException(400, "Enter a valid phone number (digits only, optional + at the start).");
        }
        return p;
    }

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
        if (!user.isEmailVerified()) {
            request.setAttribute("auditActor", user.getUsername());
            request.setAttribute("auditDetail", "Login blocked: email not verified yet");
            request.setAttribute("auditAlways", true);
            throw new ApiException(403, "Please verify your email first. Enter the code we sent you, "
                    + "or get a new one at " + emailVerification.resendPageUrl());
        }
        if (!user.isApproved()) {
            String applied = "LAB_STAFF".equals(user.getRequestedRole()) ? "laboratory staff" : "receptionist";
            request.setAttribute("auditActor", user.getUsername());
            request.setAttribute("auditDetail", "Login blocked: " + applied + " application not approved yet");
            request.setAttribute("auditAlways", true);
            throw new ApiException(403, "Your " + applied + " application is awaiting admin approval.");
        }

        String licenceProblem = LicenceRules.blockReason(user);
        if (licenceProblem != null) {
            request.setAttribute("auditActor", user.getUsername());
            request.setAttribute("auditDetail", "Login blocked: licence not valid");
            request.setAttribute("auditAlways", true);
            throw new ApiException(403, licenceProblem);
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
        String name = cleanPersonName(body.get("name"));
        // Phone is required for doctors and staff; optional for patients
        String phoneNumber = role.equals("PATIENT") ? body.get("phoneNumber") : cleanPhone(body.get("phoneNumber"));

        if (userRepository.findByUsername(username) != null) {
            throw new ApiException(409, "That username is already taken.");
        }
        if (userRepository.findByEmail(email) != null) {
            throw new ApiException(409, "An account with that email already exists.");
        }

        User user = new User(username, passwordEncoder.encode(password), role);
        user.setEmail(email);
        // Stays false until the person enters the code we send them
        user.setEmailVerified(false);

        // Doctors and laboratory staff must give their licence details
        if (LicenceRules.required(role)) {
            String licenceBody = body.get("licenceBody");
            String licenceNumber = LicenceRules.cleanNumber(body.get("licenceNumber"));
            String licenceExpiry = body.get("licenceExpiry");
            LicenceRules.validate(licenceBody, licenceNumber, licenceExpiry);
            user.setLicenceBody(licenceBody);
            user.setLicenceNumber(licenceNumber);
            user.setLicenceExpiry(licenceExpiry);
            user.setLicenceStatus("PENDING");
        }

        if (role.equals("PATIENT")) {
            String ageStr = body.get("age");
            String gender = body.get("gender");

            if (ageStr == null || gender == null) {
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
            patient.setPhoneNumber(phoneNumber);
            patient.setAddress(body.get("address"));
            patient.setEmergencyContactName(body.get("emergencyContactName"));
            patient.setEmergencyContactPhone(body.get("emergencyContactPhone"));
            patient.setEmergencyContactRelationship(body.get("emergencyContactRelationship"));
            Patient savedPatient = patientRepository.save(patient);
            user.setPatientId(savedPatient.getId());
        }

        if (role.equals("DOCTOR")) {
            String specialization = body.get("specialization");

            if (specialization == null || specialization.isBlank()) {
                throw new ApiException(400, "Name, specialization, and phone number are required for doctor signup");
            }

            Doctor doctor = new Doctor(name, specialization.trim(), phoneNumber);
            Doctor savedDoctor = doctorRepository.save(doctor);
            user.setDoctorId(savedDoctor.getId());
        }

        // Receptionists and laboratory staff must be approved by an administrator
        boolean needsApproval = role.equals("RECEPTIONIST") || role.equals("LAB_STAFF");

        if (needsApproval) {
            user.setApproved(false);
            user.setRequestedRole(role);
            user.setFullName(name);
            user.setPhoneNumber(phoneNumber);
        }

        User savedUser = userRepository.save(user);
        emailVerification.sendCode(savedUser);

        request.setAttribute("auditActor", username);
        request.setAttribute("auditRole", role);
        request.setAttribute("auditDetail", needsApproval
                ? (role.equals("LAB_STAFF") ? "Laboratory staff" : "Receptionist") + " application submitted"
                : "Account created (" + role.toLowerCase() + ")");

        String sent = "A 6-digit verification code was sent to " + email + " and works for "
                + emailVerification.lifetimeText() + "." + emailVerification.deliveryNote();

        return needsApproval
                ? "Application submitted. " + sent + " After you verify, an administrator must approve it before you can log in."
                : "Account created. " + sent + " Enter the code to verify your email, then log in.";
    }
}