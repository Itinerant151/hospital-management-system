package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Staff applications: receptionists and laboratory staff sign up unapproved,
 * and an administrator accepts or rejects them here.
 * (The URL still says "receptionist-requests" so SecurityConfig and the audit log keep working.)
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final UserRepository userRepository;
    public AdminController(UserRepository userRepository) { this.userRepository = userRepository; }

    @GetMapping("/receptionist-requests")
    public List<User> getStaffRequests() {
        List<User> requests = new ArrayList<>(userRepository.findByRequestedRoleAndApprovedFalse("RECEPTIONIST"));
        requests.addAll(userRepository.findByRequestedRoleAndApprovedFalse("LAB_STAFF"));
        return requests;
    }

    @PutMapping("/receptionist-requests/{id}/approve")
    public ResponseEntity<User> approveStaff(@PathVariable String id, HttpServletRequest request) {
        return userRepository.findById(id).map(user -> {
            String requested = user.getRequestedRole() == null ? "RECEPTIONIST" : user.getRequestedRole();
            user.setRole(requested);
            user.setApproved(true);
            user.setRequestedRole(null);
            request.setAttribute("auditDetail",
                    ("LAB_STAFF".equals(requested) ? "Laboratory staff" : "Receptionist")
                            + " application approved (" + user.getUsername() + ")");
            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/receptionist-requests/{id}")
    public ResponseEntity<Void> rejectStaff(@PathVariable String id, HttpServletRequest request) {
        return userRepository.findById(id).map(user -> {
            request.setAttribute("auditDetail",
                    ("LAB_STAFF".equals(user.getRequestedRole()) ? "Laboratory staff" : "Receptionist")
                            + " application rejected (" + user.getUsername() + ")");
            userRepository.deleteById(id);
            return ResponseEntity.noContent().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }
}