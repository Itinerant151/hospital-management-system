package hospitalmgt.project;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.regex.Pattern;

/** The rules for professional licences: who needs one, what a valid entry looks like, who may log in. */
public final class LicenceRules {

    public static final List<String> BODIES = List.of("MDCN", "MLSCN", "NMCN", "PCN", "OTHER");

    // 4 to 30 characters: letters, digits, spaces, / and -
    private static final Pattern NUMBER = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9/ -]{2,28}[A-Za-z0-9]$");

    private LicenceRules() {}

    // Doctors (including visiting doctors) and laboratory staff need a licence
    public static boolean required(String role) {
        return "DOCTOR".equals(role) || "LAB_STAFF".equals(role);
    }

    public static String bodyName(String body) {
        if (body == null) return "";
        switch (body) {
            case "MDCN": return "Medical and Dental Council of Nigeria";
            case "MLSCN": return "Medical Laboratory Science Council of Nigeria";
            case "NMCN": return "Nursing and Midwifery Council of Nigeria";
            case "PCN": return "Pharmacists Council of Nigeria";
            default: return "Other licensing body";
        }
    }

    // The council's own website, where the admin checks the licence number
    public static String registerUrl(String body) {
        if (body == null) return null;
        switch (body) {
            case "MDCN": return "https://mdcn.gov.ng";
            case "MLSCN": return "https://mlscn.gov.ng";
            case "NMCN": return "https://nmcn.gov.ng";
            case "PCN": return "https://pcn.gov.ng";
            default: return null;
        }
    }

    public static String cleanNumber(String raw) {
        return raw == null ? "" : raw.trim().replaceAll("\\s+", " ");
    }

    public static LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    // Throws a 400 with a plain message when the details are not acceptable
    public static void validate(String body, String number, String expiry) {
        if (body == null || !BODIES.contains(body)) {
            throw new ApiException(400, "Choose the licensing body that issued the licence.");
        }
        if (number == null || !NUMBER.matcher(number).matches()) {
            throw new ApiException(400, "Enter a valid licence number (4 to 30 characters: letters, digits, / and - only).");
        }
        LocalDate date = parseDate(expiry);
        if (date == null) {
            throw new ApiException(400, "Enter the licence expiry date.");
        }
        LocalDate today = LocalDate.now();
        if (date.isBefore(today)) {
            throw new ApiException(400, "That licence has already expired. A current licence is required.");
        }
        if (date.isAfter(today.plusYears(10))) {
            throw new ApiException(400, "Check the expiry date. It is more than 10 years away.");
        }
    }

    // PENDING, VERIFIED, REJECTED or EXPIRED (a verified licence past its date). Null = no licence on file.
    public static String effectiveStatus(User u) {
        String status = u.getLicenceStatus();
        if (status == null) return null;
        if ("VERIFIED".equals(status)) {
            LocalDate expiry = parseDate(u.getLicenceExpiry());
            if (expiry != null && expiry.isBefore(LocalDate.now())) return "EXPIRED";
        }
        return status;
    }

    // A plain message when this person may not log in because of their licence, otherwise null
    public static String blockReason(User u) {
        if (u == null || !required(u.getRole())) return null;
        String status = effectiveStatus(u);
        if (status == null) return null; // account made before licence checks existed
        switch (status) {
            case "PENDING":
                return "Your licence is waiting to be verified by an administrator.";
            case "REJECTED":
                return "Your licence could not be verified. Please contact the hospital administrator.";
            case "EXPIRED":
                return "Your licence has expired. Please contact the hospital administrator.";
            default:
                return null;
        }
    }
}