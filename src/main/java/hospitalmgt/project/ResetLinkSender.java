package hospitalmgt.project;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Sends the password reset link to the person's email. If email is not set up, the account has no
 * email address, or the send fails, the link is printed in the console instead, so the reset flow never breaks.
 */
@Component
public class ResetLinkSender {

    private final String frontendUrl;
    private final MailService mailService;

    public ResetLinkSender(@Value("${app.frontend-url:http://localhost:5173}") String frontendUrl,
                           MailService mailService) {
        this.frontendUrl = frontendUrl;
        this.mailService = mailService;
    }

    public void send(User user, String rawToken, long validForMinutes) {
        String link = frontendUrl + "/?reset=" + rawToken;

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            String text = "Hello,\n\n"
                    + "We received a request to reset the password for your MediCore account ("
                    + user.getUsername() + ").\n\n"
                    + "Open this link to choose a new password:\n" + link + "\n\n"
                    + "The link works for " + validForMinutes + " minutes and can be used once. "
                    + "If you did not ask for this, you can ignore this email.";
            if (mailService.send(user.getEmail(), "Reset your MediCore password", text)) {
                System.out.println("Password reset link emailed to " + user.getEmail());
                return;
            }
        }

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