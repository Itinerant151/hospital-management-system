package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;

@RestController
public class GoogleAuthController {

    @Value("${app.google-client-id:}")
    private String clientId;

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    public GoogleAuthController(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    // Asks Google whether the token is genuine. Needs internet access from the backend.
    private Map<String, Object> verifyWithGoogle(String credential) {
        try {
            return RestClient.create()
                    .get()
                    .uri("https://oauth2.googleapis.com/tokeninfo?id_token={token}", credential)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            System.out.println("Google token check failed: " + e);
            return null;
        }
    }

    private ApiException fail(HttpServletRequest request, String actor, String detail, int status, String message) {
        request.setAttribute("auditActor", actor);
        request.setAttribute("auditDetail", detail);
        request.setAttribute("auditAlways", true);
        return new ApiException(status, message);
    }

    @PostMapping("/login/google")
    public Map<String, String> loginWithGoogle(@RequestBody Map<String, String> body, HttpServletRequest request) {
        if (clientId == null || clientId.isBlank()) {
            throw new ApiException(503, "Google sign-in is not set up on this server yet.");
        }
        String credential = body.get("credential");
        if (credential == null || credential.isBlank()) {
            throw new ApiException(400, "No Google sign-in was received. Try again.");
        }

        Map<String, Object> info = verifyWithGoogle(credential);
        if (info == null) {
            throw fail(request, "unknown", "Google sign-in could not be verified", 401,
                    "That Google sign-in could not be verified. Check the internet connection and try again.");
        }

        String aud = String.valueOf(info.get("aud"));
        String iss = String.valueOf(info.get("iss"));
        boolean emailVerified = "true".equalsIgnoreCase(String.valueOf(info.get("email_verified")));
        boolean issuerOk = "accounts.google.com".equals(iss) || "https://accounts.google.com".equals(iss);

        if (!clientId.equals(aud) || !issuerOk) {
            throw fail(request, "unknown", "Google sign-in rejected: wrong audience or issuer", 401,
                    "This Google sign-in was not issued for MediCore.");
        }
        if (!emailVerified || info.get("email") == null) {
            throw fail(request, "unknown", "Google sign-in rejected: email not verified by Google", 401,
                    "Google has not verified this email address.");
        }

        String email = AccountRules.cleanEmail(String.valueOf(info.get("email")));
        User user = userRepository.findByEmail(email);
        if (user == null) {
            throw fail(request, email, "Google sign-in: no account uses this email", 404,
                    "No MediCore account uses " + email + ". Create an account first, then you can sign in with Google.");
        }

        // Google has proven the person owns this address
        if (!user.isEmailVerified()) {
            user.setEmailVerified(true);
            userRepository.save(user);
        }

        if (!user.isApproved()) {
            String applied = "LAB_STAFF".equals(user.getRequestedRole()) ? "laboratory staff" : "receptionist";
            throw fail(request, user.getUsername(),
                    "Login blocked: " + applied + " application not approved yet", 403,
                    "Your " + applied + " application is awaiting admin approval.");
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole(), user.getPatientId(), user.getDoctorId());

        request.setAttribute("auditActor", user.getUsername());
        request.setAttribute("auditRole", user.getRole());
        request.setAttribute("auditDetail", "Logged in with Google");

        Map<String, String> result = new HashMap<>();
        result.put("token", token);
        result.put("role", user.getRole());
        result.put("username", user.getUsername());
        if (user.getPatientId() != null) result.put("patientId", user.getPatientId());
        if (user.getDoctorId() != null) result.put("doctorId", user.getDoctorId());
        return result;
    }
}