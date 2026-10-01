package hospitalmgt.project;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * DEMO MODE: prints the reset link in the backend console instead of emailing it.
 * Swap the body of send() for a real mail sender later; the rest of the flow stays the same.
 */
@Component
public class ResetLinkSender {

    private final String frontendUrl;

    public ResetLinkSender(@Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.frontendUrl = frontendUrl;
    }

    public void send(User user, String rawToken, long validForMinutes) {
        String link = frontendUrl + "/?reset=" + rawToken;
        System.out.println();
        System.out.println("=========== PASSWORD RESET (demo mode) ===========");
        System.out.println("Account : " + user.getUsername()
                + (user.getEmail() != null ? " <" + user.getEmail() + ">" : ""));
        System.out.println("Link    : " + link);
        System.out.println("Expires : in " + validForMinutes + " minutes, single use");
        System.out.println("==================================================");
        System.out.println();
    }
}