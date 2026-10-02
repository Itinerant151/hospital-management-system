package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/account")
public class AccountController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AccountEmailService accountEmailService;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    public AccountController(UserRepository userRepository, PasswordEncoder passwordEncoder,
                             JwtUtil jwtUtil, AccountEmailService accountEmailService,
                             PatientRepository patientRepository, DoctorRepository doctorRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.accountEmailService = accountEmailService;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
    }

    @GetMapping("/me")
    public Map<String, Object> getAccount(HttpServletRequest request) {
        User user = currentUser(request);

        // Makes sure the account email and the patient profile email agree before we show it
        accountEmailService.reconcile(user);

        Map<String, Object> result = new HashMap<>();
        result.put("username", user.getUsername());
        result.put("role", user.getRole());
        result.put("email", user.getEmail() == null ? "" : user.getEmail());
        result.put("temporaryPassword", user.isTemporaryPassword());
        result.put("staffId", user.getId());

        // Name, phone and specialization are used for ID cards
        String displayName = user.getFullName() == null ? user.getUsername() : user.getFullName();
        String phone = user.getPhoneNumber() == null ? "" : user.getPhoneNumber();
        String specialization = "";

        if (user.getDoctorId() != null) {
            Doctor doctor = doctorRepository.findById(user.getDoctorId()).orElse(null);
            if (doctor != null) {
                displayName = doctor.getName();
                phone = doctor.getPhoneNumber() == null ? "" : doctor.getPhoneNumber();
                specialization = doctor.getSpecialization() == null ? "" : doctor.getSpecialization();
            }
        } else if (user.getPatientId() != null) {
            Patient patient = patientRepository.findById(user.getPatientId()).orElse(null);
            if (patient != null) displayName = patient.getName();
        } else if ("ADMIN".equals(user.getRole())) {
            displayName = "Administrator";
        }

        result.put("displayName", displayName);
        result.put("phoneNumber", phone);
        result.put("specialization", specialization);
        return result;
    }

    @PutMapping
    public Map<String, String> updateAccount(@RequestBody Map<String, String> body, HttpServletRequest request) {
        User user = currentUser(request);

        String currentPassword = body.get("currentPassword");
        if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new ApiException(400, "Current password is incorrect.");
        }

        StringBuilder changes = new StringBuilder();

        String newUsername = body.get("username");
        if (newUsername != null && !newUsername.trim().equals(user.getUsername())) {
            String cleaned = AccountRules.cleanUsername(newUsername);
            if (userRepository.findByUsername(cleaned) != null) {
                throw new ApiException(409, "That username is already taken.");
            }
            changes.append("username changed from ").append(user.getUsername()).append(" to ").append(cleaned);
            user.setUsername(cleaned);
        }

        // Also updates the email on the linked patient profile
        String newEmail = body.get("email");
        if (newEmail != null && !newEmail.isBlank()) {
            String cleanedEmail = AccountRules.cleanEmail(newEmail);
            if (!cleanedEmail.equalsIgnoreCase(user.getEmail() == null ? "" : user.getEmail())) {
                if (changes.length() > 0) changes.append("; ");
                changes.append("email changed");
            }
            accountEmailService.applyEmail(user, newEmail);
        }

        userRepository.save(user);
        request.setAttribute("auditDetail", changes.length() == 0 ? "Account saved with no changes" : "Account updated: " + changes);

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole(), user.getPatientId(), user.getDoctorId());

        Map<String, String> result = new HashMap<>();
        result.put("token", token);
        result.put("username", user.getUsername());
        result.put("email", user.getEmail() == null ? "" : user.getEmail());
        return result;
    }

    // Lets anyone replace their password. This is how a patient replaces the temporary one given by staff.
    @PutMapping("/password")
    public Map<String, Object> changePassword(@RequestBody Map<String, String> body, HttpServletRequest request) {
        User user = currentUser(request);

        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new ApiException(400, "Current password is incorrect.");
        }
        AccountRules.checkPassword(newPassword);
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new ApiException(400, "Choose a password that is different from your current one.");
        }

        boolean wasTemporary = user.isTemporaryPassword();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setTemporaryPassword(false);
        userRepository.save(user);

        request.setAttribute("auditDetail", wasTemporary ? "Temporary password replaced" : "Password changed");

        Map<String, Object> result = new HashMap<>();
        result.put("message", "Password changed.");
        result.put("temporaryPassword", false);
        return result;
    }

    private User currentUser(HttpServletRequest request) {
        String username = (String) request.getAttribute("username");
        User user = username == null ? null : userRepository.findByUsername(username);
        if (user == null) {
            throw new ApiException(401, "Please log in again.");
        }
        return user;
    }
}