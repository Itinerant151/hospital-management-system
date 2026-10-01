package hospitalmgt.project;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final UserRepository userRepository;
    public AdminController(UserRepository userRepository) { this.userRepository = userRepository; }

    @GetMapping("/receptionist-requests")
    public List<User> getReceptionistRequests() {
        return userRepository.findByRequestedRoleAndApprovedFalse("RECEPTIONIST");
    }

    @PutMapping("/receptionist-requests/{id}/approve")
    public ResponseEntity<User> approveReceptionist(@PathVariable String id) {
        return userRepository.findById(id).map(user -> {
            user.setRole("RECEPTIONIST");
            user.setApproved(true);
            user.setRequestedRole(null);
            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/receptionist-requests/{id}")
    public ResponseEntity<Void> rejectReceptionist(@PathVariable String id) {
        if (!userRepository.existsById(id)) return ResponseEntity.notFound().build();
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
