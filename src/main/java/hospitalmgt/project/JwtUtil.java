package hospitalmgt.project;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtil {

    private final SecretKey key = Keys.hmacShaKeyFor(
            "this-is-a-very-long-secret-key-for-jwt-signing-change-me".getBytes()
    );
    private final long EXPIRATION_MS = 1000 * 60 * 60 * 10;

    public String generateToken(String username, String role, String patientId, String doctorId) {
        var builder = Jwts.builder()
                .subject(username)
                .claim("role", role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRATION_MS));

        if (patientId != null) builder.claim("patientId", patientId);
        if (doctorId != null) builder.claim("doctorId", doctorId);

        return builder.signWith(key).compact();
    }

    public String extractUsername(String token) {
        return Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload().getSubject();
    }

    public String extractRole(String token) {
        return (String) Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload().get("role");
    }

    public String extractPatientId(String token) {
        return (String) Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload().get("patientId");
    }

    public String extractDoctorId(String token) {
        return (String) Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload().get("doctorId");
    }

    public boolean isTokenValid(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}