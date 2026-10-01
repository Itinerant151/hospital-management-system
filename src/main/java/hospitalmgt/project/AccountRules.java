package hospitalmgt.project;

import java.util.regex.Pattern;

public final class AccountRules {

    public static final int MIN_PASSWORD_LENGTH = 8;

    private static final Pattern USERNAME = Pattern.compile("^[A-Za-z0-9._-]{3,30}$");
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private AccountRules() {
    }

    public static String cleanUsername(String raw) {
        String username = raw == null ? "" : raw.trim();
        if (!USERNAME.matcher(username).matches()) {
            throw new ApiException(400,
                    "Username must be 3 to 30 characters: letters, numbers, dots, dashes or underscores.");
        }
        return username;
    }

    public static String cleanEmail(String raw) {
        String email = raw == null ? "" : raw.trim().toLowerCase();
        if (email.length() > 254 || !EMAIL.matcher(email).matches()) {
            throw new ApiException(400, "Enter a valid email address.");
        }
        return email;
    }

    public static void checkPassword(String password) {
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw new ApiException(400, "Password must be at least " + MIN_PASSWORD_LENGTH + " characters.");
        }
    }
}