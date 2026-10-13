package hospitalmgt.project;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reminders")
public class ReminderController {

    @Autowired
    private ReminderRepository reminderRepository;

    @Autowired
    private ReminderScheduler reminderScheduler;

    // Manually trigger reminder generation now (handy for testing without waiting on the schedule)
    @PostMapping("/generate")
    public ResponseEntity<String> generateNow() {
        int created = reminderScheduler.runNow();
        return ResponseEntity.ok(created + " reminder(s) generated");
    }

    @GetMapping
    public List<Reminder> getAll() {
        return reminderRepository.findAll();
    }

    // "Inbox" for a given email — this is what your Notifications.jsx page will call
    @GetMapping("/inbox/{email}")
    public List<Reminder> getInbox(@PathVariable String email) {
        return reminderRepository.findByRecipientEmailOrderBySentAtDesc(email);
    }

    // Manually create a reminder (handy for testing without waiting on the schedule)
    @PostMapping
    public Reminder create(@RequestBody Reminder reminder) {
        return reminderRepository.save(reminder);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Reminder> markRead(@PathVariable String id) {
        return reminderRepository.findById(id).map(r -> {
            r.setRead(true);
            return ResponseEntity.ok(reminderRepository.save(r));
        }).orElse(ResponseEntity.notFound().build());
    }
}
