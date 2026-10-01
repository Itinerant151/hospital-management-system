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

    public AccountController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            AccountEmailService accountEmailService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.accountEmailService = accountEmailService;
    }

    @GetMapping("/me")
    public Map<String, String> getAccount(HttpServletRequest request) {
        User user = currentUser(request);

        accountEmailService.reconcile(user);

        Map<String, String> result = new HashMap<>();

        result.put("username", user.getUsername());
        result.put("role", user.getRole());
        result.put(
                "email",
                user.getEmail() == null ? "" : user.getEmail()
        );
        result.put(
                "temporaryPassword",
                String.valueOf(user.isTemporaryPassword())
        );

        return result;
    }

    @PutMapping
    public Map<String, String> updateAccount(
            @RequestBody Map<String, String> body,
            HttpServletRequest request
    ) {
        User user = currentUser(request);

        String currentPassword = body.get("currentPassword");

        if (
                currentPassword == null ||
                        !passwordEncoder.matches(
                                currentPassword,
                                user.getPassword()
                        )
        ) {
            throw new ApiException(400, "Current password is incorrect.");
        }

        String newUsername = body.get("username");

        if (
                newUsername != null &&
                        !newUsername.trim().equals(user.getUsername())
        ) {
            String cleaned = AccountRules.cleanUsername(newUsername);

            if (userRepository.findByUsername(cleaned) != null) {
                throw new ApiException(409, "That username is already taken.");
            }

            user.setUsername(cleaned);
        }

        String newEmail = body.get("email");

        if (newEmail != null && !newEmail.isBlank()) {
            accountEmailService.applyEmail(user, newEmail);
        }

        userRepository.save(user);

        String token = jwtUtil.generateToken(
                user.getUsername(),
                user.getRole(),
                user.getPatientId(),
                user.getDoctorId()
        );

        Map<String, String> result = new HashMap<>();

        result.put("token", token);
        result.put("username", user.getUsername());
        result.put(
                "email",
                user.getEmail() == null ? "" : user.getEmail()
        );

        return result;
    }

    @PutMapping("/password")
    public Map<String, String> changePassword(
            @RequestBody Map<String, String> body,
            HttpServletRequest request
    ) {
        User user = currentUser(request);

        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        if (
                currentPassword == null ||
                        !passwordEncoder.matches(
                                currentPassword,
                                user.getPassword()
                        )
        ) {
            throw new ApiException(400, "Current password is incorrect.");
        }

        AccountRules.checkPassword(newPassword);

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new ApiException(
                    400,
                    "New password must be different from the current password."
            );
        }

        user.setPassword(passwordEncoder.encode(newPassword));

        // Changing the temporary password makes the account permanent.
        user.setTemporaryPassword(false);

        userRepository.save(user);

        String token = jwtUtil.generateToken(
                user.getUsername(),
                user.getRole(),
                user.getPatientId(),
                user.getDoctorId()
        );

        Map<String, String> result = new HashMap<>();

        result.put("token", token);
        result.put("message", "Password changed successfully.");

        return result;
    }

    private User currentUser(HttpServletRequest request) {
        String username = (String) request.getAttribute("username");

        User user = username == null
                ? null
                : userRepository.findByUsername(username);

        if (user == null) {
            throw new ApiException(401, "Please log in again.");
        }

        return user;
    }
}