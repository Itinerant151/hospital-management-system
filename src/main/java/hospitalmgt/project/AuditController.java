package hospitalmgt.project;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    @Autowired
    private AuditLogRepository auditLogRepository;

    // Newest first. Looks at the latest 1000 entries, then filters.
    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String category,
                                    @RequestParam(required = false) String search,
                                    @RequestParam(defaultValue = "200") int limit) {
        int max = Math.max(1, Math.min(limit, 1000));
        String wanted = category == null ? "" : category.trim();
        String query = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);

        List<AuditLog> recent = auditLogRepository
                .findAll(PageRequest.of(0, 1000, Sort.by(Sort.Direction.DESC, "timestamp")))
                .getContent();

        List<AuditLog> entries = recent.stream()
                .filter(e -> wanted.isEmpty() || wanted.equalsIgnoreCase("ALL") || wanted.equalsIgnoreCase(e.getCategory()))
                .filter(e -> query.isEmpty()
                        || contains(e.getUsername(), query)
                        || contains(e.getDetail(), query)
                        || contains(e.getRole(), query)
                        || contains(e.getPath(), query))
                .limit(max)
                .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", auditLogRepository.count());
        result.put("shown", entries.size());
        result.put("entries", entries);
        return result;
    }

    private boolean contains(String value, String query) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(query);
    }
}