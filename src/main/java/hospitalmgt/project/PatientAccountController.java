package hospitalmgt.project;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Lets staff give an existing patient record, for example an emergency patient,
 * a login account.
 */
@RestController
@RequestMapping("/patients")
public class PatientAccountController {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;

    public PatientAccountController(
            UserRepository userRepository,
            PatientRepository patientRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/{id}/account")
    public Map<String, Object> accountStatus(@PathVariable String id) {
        User user = userRepository.findByPatientId(id);

        Map<String, Object> result = new HashMap<>();
        result.put("hasAccount", user != null);

        if (user != null) {
            result.put("username", user.getUsername());
            result.put("temporaryPassword", user.isTemporaryPassword());
        }

        return result;
    }

    @PostMapping("/{id}/account")
    public Map<String, String> createAccount(
            @PathVariable String id,
            @RequestBody Map<String, String> body
    ) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ApiException(404, "Patient not found."));

        if (userRepository.findByPatientId(id) != null) {
            throw new ApiException(409, "This patient already has an account.");
        }

        String username = AccountRules.cleanUsername(body.get("username"));
        String email = AccountRules.cleanEmail(body.get("email"));
        String password = body.get("password");

        AccountRules.checkPassword(password);

        if (userRepository.findByUsername(username) != null) {
            throw new ApiException(409, "That username is already taken.");
        }

        if (userRepository.findByEmail(email) != null) {
            throw new ApiException(409, "An account with that email already exists.");
        }

        User user = new User(
                username,
                passwordEncoder.encode(password),
                "PATIENT"
        );

        user.setEmail(email);
        user.setPatientId(id);

        // Emergency accounts start with a temporary password.
        user.setTemporaryPassword(true);

        userRepository.save(user);

        patient.setEmail(email);
        patientRepository.save(patient);

        Map<String, String> result = new HashMap<>();
        result.put("username", username);
        result.put("email", email);

        return result;
    }
}