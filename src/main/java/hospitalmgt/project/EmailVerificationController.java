package hospitalmgt.project;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@RestController
public class EmailVerificationController {

    // How long a code works, in minutes
    public static final long CODE_MINUTES = 5;
    // Wrong guesses allowed before the code is thrown away
    private static final int MAX_ATTEMPTS = 5;
    // Minimum wait before another code can be requested for the same account
    private static final long RESEND_COOLDOWN_SECONDS = 15;
    private static final SecureRandom RANDOM = new SecureRandom();

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    private final MongoTemplate mongo;
    private final UserRepository userRepository;
    private final MailService mailService;

    public EmailVerificationController(MongoTemplate mongo, UserRepository userRepository, MailService mailService) {
        this.mongo = mongo;
        this.userRepository = userRepository;
        this.mailService = mailService;
    }

    public String lifetimeText() {
        return CODE_MINUTES == 1 ? "1 minute" : CODE_MINUTES + " minutes";
    }

    // Shown to the person only while email sending is not set up
    public String deliveryNote() {
        return mailService.isConfigured()
                ? ""
                : " Email delivery is not available right now. Please contact the hospital administrator.";
    }

    public String resendPageUrl() {
        return frontendUrl + "/?verifyEmail";
    }

    // Creates a fresh single-use 6-digit code for this user and emails it (replacing any older code)
    public void sendCode(User user) {
        mongo.remove(Query.query(Criteria.where("userId").is(user.getId())), EmailVerificationToken.class);

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        Instant now = Instant.now();

        EmailVerificationToken t = new EmailVerificationToken();
        t.setUserId(user.getId());
        t.setTokenCode(code);
        t.setAttempts(0);
        t.setCreatedAt(now);
        t.setExpiresAt(now.plus(CODE_MINUTES, ChronoUnit.MINUTES));
        mongo.save(t);

        String text = "Your MediCore verification code is " + code + ".\n\n"
                + "It works for " + lifetimeText() + ". "
                + "If you did not create a MediCore account, you can ignore this email.";
        if (mailService.send(user.getEmail(), "Your MediCore verification code", text)) {
            System.out.println("Verification code emailed to " + user.getEmail());
            return;
        }

        // Email is not set up or failed: print the code where the owner can read it
        System.out.println();
        System.out.println("=== EMAIL VERIFICATION CODE for " + user.getEmail()
                + ": " + code + " (valid for " + lifetimeText() + ") ===");
        System.out.println();
    }

    @PostMapping("/verify-email")
    public Map<String, String> verify(@RequestBody Map<String, String> body) {
        String email = AccountRules.cleanEmail(body.get("email"));
        String code = body.get("code") == null ? "" : body.get("code").trim();
        if (!code.matches("\\d{6}")) {
            throw new ApiException(400, "Enter the 6-digit code.");
        }

        User user = userRepository.findByEmail(email);
        EmailVerificationToken t = user == null ? null : mongo.findOne(
                Query.query(Criteria.where("userId").is(user.getId())), EmailVerificationToken.class);

        // Same reply for "no such email" and "no code", so nobody can probe for accounts
        if (t == null || t.getTokenCode() == null) {
            if (t != null) mongo.remove(t);
            throw new ApiException(400, "There is no active code for that email. Request a new one.");
        }
        if (Instant.now().isAfter(t.getExpiresAt())) {
            mongo.remove(t);
            throw new ApiException(400, "This code has expired. Request a new one.");
        }
        if (t.getAttempts() >= MAX_ATTEMPTS) {
            mongo.remove(t);
            throw new ApiException(400, "Too many wrong attempts. Request a new code.");
        }

        boolean match = MessageDigest.isEqual(
                code.getBytes(StandardCharsets.UTF_8),
                t.getTokenCode().getBytes(StandardCharsets.UTF_8));
        if (!match) {
            t.setAttempts(t.getAttempts() + 1);
            int left = MAX_ATTEMPTS - t.getAttempts();
            if (left <= 0) {
                mongo.remove(t);
                throw new ApiException(400, "Too many wrong attempts. Request a new code.");
            }
            mongo.save(t);
            throw new ApiException(400, "That code is not correct. " + left
                    + (left == 1 ? " attempt" : " attempts") + " left.");
        }

        user.setEmailVerified(true);
        userRepository.save(user);
        mongo.remove(t);

        if (!user.isApproved()) {
            return Map.of("message",
                    "Email verified. An administrator still has to approve your application before you can log in.");
        }
        String licenceProblem = LicenceRules.blockReason(user);
        if (licenceProblem != null) {
            return Map.of("message", "Email verified. " + licenceProblem);
        }
        return Map.of("message", "Email verified. You can now log in.");
    }

    @PostMapping("/resend-verification")
    public Map<String, String> resend(@RequestBody Map<String, String> body) {
        String email = AccountRules.cleanEmail(body.get("email"));
        User user = userRepository.findByEmail(email);

        // Same reply whether or not the email exists, so nobody can probe for accounts
        if (user != null && !user.isEmailVerified()) {
            EmailVerificationToken last = mongo.findOne(
                    Query.query(Criteria.where("userId").is(user.getId())), EmailVerificationToken.class);
            boolean tooSoon = last != null && last.getCreatedAt() != null
                    && Instant.now().isBefore(last.getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS));
            if (!tooSoon) {
                sendCode(user);
            }
        }
        return Map.of("message",
                "If that email belongs to an account that still needs verifying, a new code was sent. It works for "
                        + lifetimeText() + "." + deliveryNote());
    }
}