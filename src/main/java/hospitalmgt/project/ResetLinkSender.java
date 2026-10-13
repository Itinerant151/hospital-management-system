package hospitalmgt.project;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Sends the password reset link to the person's email. If email sending is not set up, the account
 * has no email address, or the send fails, the link is printed in the backend console instead,
 * so the reset flow never breaks.
 */
@Component
public class ResetLinkSender {

    private final String frontendUrl;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    // Only exists when the mail library is on the classpath and spring.mail.host is set
    @Autowired(required = false)
    private JavaMailSender mailSender;

    public ResetLinkSender(@Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.frontendUrl = frontendUrl;
    }

    private boolean mailConfigured() {
        return mailSender != null && mailUsername != null && !mailUsername.isBlank();
    }

    public void send(User user, String rawToken, long validForMinutes) {
        String link = frontendUrl + "/?reset=" + rawToken;

        if (mailConfigured() && user.getEmail() != null && !user.getEmail().isBlank()) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(mailUsername);
                message.setTo(user.getEmail());
                message.setSubject("Reset your MediCore password");
                message.setText("Hello,\n\n"
                        + "We received a request to reset the password for your MediCore account ("
                        + user.getUsername() + ").\n\n"
                        + "Open this link to choose a new password:\n" + link + "\n\n"
                        + "The link works for " + validForMinutes + " minutes and can be used once. "
                        + "If you did not ask for this, you can ignore this email.");
                mailSender.send(message);
                System.out.println("Password reset link emailed to " + user.getEmail());
                return;
            } catch (Exception e) {
                System.out.println("Could not send the reset email (" + e.getMessage()
                        + "). Showing the link here instead.");
            }
        }

        // No mail setup, no email address on the account, or sending failed
        System.out.println();
        System.out.println("=========== PASSWORD RESET ===========");
        System.out.println("Account : " + user.getUsername()
                + (user.getEmail() != null ? " <" + user.getEmail() + ">" : ""));
        System.out.println("Link    : " + link);
        System.out.println("Expires : in " + validForMinutes + " minutes, single use");
        System.out.println("======================================");
        System.out.println();
    }
}