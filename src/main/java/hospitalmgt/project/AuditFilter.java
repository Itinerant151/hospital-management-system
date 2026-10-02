package hospitalmgt.project;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;

/**
 * Writes an audit entry after every successful change (POST, PUT, DELETE), plus any request
 * where a controller set the "auditDetail" attribute (for example an export or a failed login).
 *
 * Controllers can set these request attributes to describe what happened:
 *   auditDetail  plain-English description
 *   auditActor   who did it (only needed when nobody is logged in yet, e.g. login)
 *   auditRole    the actor's role (same)
 *   auditAlways  true to record the entry even if the request failed (for example a bad password)
 */
@Component
public class AuditFilter extends OncePerRequestFilter {

    private final AuditLogRepository auditLogRepository;

    public AuditFilter(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            chain.doFilter(request, response);
        } finally {
            record(request, response);
        }
    }

    private void record(HttpServletRequest request, HttpServletResponse response) {
        try {
            String method = request.getMethod();
            String path = request.getRequestURI();
            Object explicit = request.getAttribute("auditDetail");
            String detail = explicit == null ? null : explicit.toString();
            boolean always = Boolean.TRUE.equals(request.getAttribute("auditAlways"));
            int status = response.getStatus();

            if (detail == null) {
                boolean change = method.equals("POST") || method.equals("PUT") || method.equals("DELETE");
                if (!change) return;
                detail = describe(method, path);
                if (detail == null) return;
            }
            if (status >= 400 && !always) return;

            Object actor = request.getAttribute("auditActor");
            if (actor == null) actor = request.getAttribute("username");
            Object role = request.getAttribute("auditRole");
            if (role == null) role = request.getAttribute("role");

            AuditLog entry = new AuditLog();
            entry.setTimestamp(LocalDateTime.now());
            entry.setUsername(actor == null ? "anonymous" : actor.toString());
            entry.setRole(role == null ? "" : role.toString());
            entry.setCategory(categoryOf(path));
            entry.setDetail(detail);
            entry.setMethod(method);
            entry.setPath(path);
            entry.setStatus(status);
            entry.setIpAddress(request.getRemoteAddr());
            auditLogRepository.save(entry);
        } catch (Exception ignored) {
            // Writing the audit trail must never break the real request
        }
    }

    // Plain-English description for changes that do not describe themselves
    private String describe(String method, String path) {
        if (path.equals("/login") || path.equals("/signup")) return null; // described by AuthController
        if (path.equals("/forgot-password")) return "Password reset link requested";
        if (path.equals("/reset-password")) return "Password reset completed";

        if (path.equals("/appointments") && method.equals("POST")) return "Appointment booked";
        if (path.matches("/appointments/[^/]+/status")) return "Appointment status changed";
        if (path.startsWith("/appointments/") && method.equals("DELETE")) return "Appointment deleted";

        if (path.equals("/patients/emergency")) return "Emergency patient registered";
        if (path.equals("/patients/me")) return "Patient updated their own profile";
        if (path.matches("/patients/[^/]+/medical-profile")) return "Patient medical record updated";
        if (path.matches("/patients/[^/]+/assign-doctor")) return "Doctor assigned to a patient";
        if (path.matches("/patients/[^/]+/diagnosis")) return "Diagnosis updated";
        if (path.matches("/patients/[^/]+") && method.equals("DELETE")) return "Patient record deleted";

        if (path.equals("/api/frontdesk/check-in")) return "Front desk check-in";
        if (path.matches("/api/frontdesk/[^/]+/check-out")) return "Front desk check-out";

        if (path.matches("/api/admin/receptionist-requests/[^/]+/approve")) return "Receptionist application approved";
        if (path.startsWith("/api/admin/receptionist-requests/") && method.equals("DELETE")) return "Receptionist application rejected";

        if (path.equals("/api/medicines") && method.equals("POST")) return "Medicine added to inventory";
        if (path.startsWith("/api/medicines/") && method.equals("PUT")) return "Medicine updated";
        if (path.startsWith("/api/medicines/") && method.equals("DELETE")) return "Medicine deleted";

        if (path.equals("/api/prescriptions") && method.equals("POST")) return "Prescription issued";
        if (path.matches("/api/prescriptions/[^/]+/dispense")) return "Prescription dispensed";

        if (path.equals("/api/visitation") && method.equals("POST")) return "Visit request created";
        if (path.matches("/api/visitation/[^/]+/status")) return "Visit status changed";
        if (path.startsWith("/api/visitation/") && method.equals("DELETE")) return "Visit request deleted";

        if (path.matches("/api/reminders/[^/]+/read")) return null; // marking a notification read is not worth recording

        return method + " " + path;
    }

    private String categoryOf(String path) {
        if (path.equals("/login")) return "LOGIN";
        if (path.equals("/signup") || path.startsWith("/account") || path.equals("/forgot-password")
                || path.equals("/reset-password") || (path.startsWith("/patients/") && path.endsWith("/account"))) {
            return "ACCOUNT";
        }
        if (path.startsWith("/api/bills")) return "BILLING";
        if (path.startsWith("/api/diagnoses") || path.matches("/patients/[^/]+/diagnosis")) return "DIAGNOSIS";
        if (path.startsWith("/api/prescriptions")) return "PRESCRIPTION";
        if (path.startsWith("/patients")) return "PATIENT";
        if (path.startsWith("/appointments")) return "APPOINTMENT";
        if (path.startsWith("/api/frontdesk")) return "FRONT_DESK";
        if (path.startsWith("/api/medicines")) return "PHARMACY";
        if (path.startsWith("/api/visitation")) return "VISITATION";
        if (path.startsWith("/api/admin/export")) return "DATA";
        if (path.startsWith("/api/admin")) return "ADMIN";
        return "OTHER";
    }
}