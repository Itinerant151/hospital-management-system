package hospitalmgt.project;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

@RestController
public class PasswordResetController {

    private static final long TOKEN_MINUTES = 30;

    private final SecureRandom random = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final ResetLinkSender resetLinkSender;

    public PasswordResetController(UserRepository userRepository,
                                   PasswordResetTokenRepository tokenRepository,
                                   PasswordEncoder passwordEncoder,
                                   ResetLinkSender resetLinkSender) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.resetLinkSender = resetLinkSender;
    }

    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@RequestBody Map<String, String> body) {
        String identifier = body.get("identifier");
        if (identifier == null || identifier.isBlank()) {
            throw new ApiException(400, "Enter your username or email.");
        }
        identifier = identifier.trim();

        User user = userRepository.findByUsername(identifier);
        if (user == null) {
            user = userRepository.findByEmail(identifier.toLowerCase());
        }

        if (user != null) {
            tokenRepository.deleteByUserId(user.getId());

            byte[] bytes = new byte[32];
            random.nextBytes(bytes);
            String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

            Instant expiresAt = Instant.now().plus(TOKEN_MINUTES, ChronoUnit.MINUTES);
            tokenRepository.save(new PasswordResetToken(user.getId(), sha256(rawToken), expiresAt));

            resetLinkSender.send(user, rawToken, TOKEN_MINUTES);
        }

        return Map.of("message", "If an account matches, a reset link has been sent.");
    }

    @PostMapping("/reset-password")
    public Map<String, String> resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("newPassword");

        if (token == null || token.isBlank()) {
            throw new ApiException(400, "This reset link is invalid or has expired. Request a new one.");
        }
        AccountRules.checkPassword(newPassword);

        PasswordResetToken record = tokenRepository.findByTokenHash(sha256(token));
        if (record == null || record.getExpiresAt().isBefore(Instant.now())) {
            if (record != null) tokenRepository.delete(record);
            throw new ApiException(400, "This reset link is invalid or has expired. Request a new one.");
        }

        User user = userRepository.findById(record.getUserId()).orElse(null);
        if (user == null) {
            tokenRepository.delete(record);
            throw new ApiException(400, "This reset link is invalid or has expired. Request a new one.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        tokenRepository.deleteByUserId(user.getId());

        return Map.of("message", "Password updated. You can now log in.");
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}