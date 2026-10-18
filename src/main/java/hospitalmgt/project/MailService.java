package hospitalmgt.project;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Sends emails. Order of preference:
 * 1. Brevo over HTTPS (works on hosts that block SMTP, such as Render's free plan)
 * 2. Gmail over SMTP (works on your own computer)
 * If neither is set up, send() returns false and the caller prints the message in the console instead.
 */
@Component
public class MailService {

    @Value("${BREVO_API_KEY:}")
    private String brevoApiKey;

    @Value("${MAIL_FROM:}")
    private String mailFrom;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    @Autowired(required = false)
    private JavaMailSender smtpSender;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    @PostConstruct
    public void reportStatus() {
        System.out.println("Email sending check: Brevo set up = " + brevoConfigured()
                + ", Gmail/SMTP set up = " + smtpConfigured());
    }

    private boolean brevoConfigured() {
        return brevoApiKey != null && !brevoApiKey.isBlank() && mailFrom != null && !mailFrom.isBlank();
    }

    private boolean smtpConfigured() {
        return smtpSender != null && smtpUsername != null && !smtpUsername.isBlank();
    }

    public boolean isConfigured() {
        return brevoConfigured() || smtpConfigured();
    }

    public boolean send(String to, String subject, String text) {
        if (to == null || to.isBlank()) return false;
        if (brevoConfigured() && sendWithBrevo(to, subject, text)) return true;
        if (smtpConfigured()) return sendWithSmtp(to, subject, text);
        return false;
    }

    private boolean sendWithBrevo(String to, String subject, String text) {
        try {
            String json = "{\"sender\":{\"name\":\"MediCore\",\"email\":\"" + esc(mailFrom) + "\"},"
                    + "\"to\":[{\"email\":\"" + esc(to) + "\"}],"
                    + "\"subject\":\"" + esc(subject) + "\","
                    + "\"textContent\":\"" + esc(text) + "\"}";
            HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.brevo.com/v3/smtp/email"))
                    .timeout(Duration.ofSeconds(10))
                    .header("api-key", brevoApiKey)
                    .header("accept", "application/json")
                    .header("content-type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return true;
            }
            System.out.println("Brevo refused the email (HTTP " + response.statusCode() + "): " + response.body());
            return false;
        } catch (Exception e) {
            System.out.println("Could not reach Brevo (" + e.getMessage() + ")");
            return false;
        }
    }

    private boolean sendWithSmtp(String to, String subject, String text) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(smtpUsername);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            smtpSender.send(message);
            return true;
        } catch (Exception e) {
            System.out.println("Could not send the email by SMTP (" + e.getMessage() + ")");
            return false;
        }
    }

    // Escapes text so it can sit inside a JSON string
    private static String esc(String s) {
        if (s == null) return "";
        StringBuilder b = new StringBuilder();
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"': b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n"); break;
                case '\r': b.append("\\r"); break;
                case '\t': b.append("\\t"); break;
                default:
                    if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
                    else b.append(c);
            }
        }
        return b.toString();
    }
}