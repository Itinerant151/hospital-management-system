package hospitalmgt.project;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        User user = userRepository.findByUsername(username);

        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid username or password");
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());
        return Map.of("token", token, "role", user.getRole());
    }

    @PostMapping("/signup")
    public String signup(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        String role = body.get("role"); // "DOCTOR" or "PATIENT" only

        if (!role.equals("DOCTOR") && !role.equals("PATIENT")) {
            throw new RuntimeException("Invalid role for signup");
        }

        if (userRepository.findByUsername(username) != null) {
            throw new RuntimeException("Username already taken");
        }

        User user = new User(username, passwordEncoder.encode(password), role);
        userRepository.save(user);
        return "Account created successfully";
    }
}