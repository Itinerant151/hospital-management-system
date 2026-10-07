package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/laboratory/tests")
public class LaboratoryTestController {

    public static final List<String> CATEGORIES = List.of(
            "Hematology",
            "Chemistry",
            "Microbiology",
            "Immunology",
            "Serology",
            "Urinalysis",
            "Parasitology"
    );

    private final LaboratoryTestRepository laboratoryTestRepository;

    public LaboratoryTestController(LaboratoryTestRepository laboratoryTestRepository) {
        this.laboratoryTestRepository = laboratoryTestRepository;
    }

    @GetMapping
    public List<LaboratoryTest> list() {
        return laboratoryTestRepository.findAll().stream()
                .sorted((a, b) -> a.getTestName().compareToIgnoreCase(b.getTestName()))
                .toList();
    }

    @GetMapping("/active")
    public List<LaboratoryTest> active() {
        return laboratoryTestRepository.findByActiveTrue().stream()
                .sorted((a, b) -> a.getTestName().compareToIgnoreCase(b.getTestName()))
                .toList();
    }

    @PostMapping
    public LaboratoryTest create(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String testName = requiredText(body, "testName", "Test name is required.");
        ensureUniqueName(testName, null);

        LaboratoryTest test = new LaboratoryTest();
        test.setTestName(testName);
        test.setCategory(requiredText(body, "category", "Test category is required."));
        test.setDescription(optionalText(body, "description"));
        test.setSpecimenType(requiredText(body, "specimenType", "Specimen type is required."));
        test.setPrice(readPrice(body.get("price")));
        test.setReferenceRange(optionalText(body, "referenceRange"));
        test.setActive(body.get("active") == null || Boolean.parseBoolean(String.valueOf(body.get("active"))));
        test.setCreatedAt(LocalDateTime.now());
        test.setUpdatedAt(LocalDateTime.now());

        LaboratoryTest saved = laboratoryTestRepository.save(test);

        request.setAttribute(
                "auditDetail",
                "Laboratory test " + saved.getTestName() + " created"
        );

        return saved;
    }

    @PutMapping("/{id}")
    public LaboratoryTest update(
            @PathVariable String id,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request
    ) {
        LaboratoryTest test = laboratoryTestRepository.findById(id)
                .orElseThrow(() -> new ApiException(404, "Laboratory test not found."));

        String testName = requiredText(body, "testName", "Test name is required.");
        ensureUniqueName(testName, id);

        test.setTestName(testName);
        test.setCategory(requiredText(body, "category", "Test category is required."));
        test.setDescription(optionalText(body, "description"));
        test.setSpecimenType(requiredText(body, "specimenType", "Specimen type is required."));
        test.setPrice(readPrice(body.get("price")));
        test.setReferenceRange(optionalText(body, "referenceRange"));

        if (body.get("active") != null) {
            test.setActive(Boolean.parseBoolean(String.valueOf(body.get("active"))));
        }

        test.setUpdatedAt(LocalDateTime.now());

        LaboratoryTest saved = laboratoryTestRepository.save(test);

        request.setAttribute(
                "auditDetail",
                "Laboratory test " + saved.getTestName() + " updated"
        );

        return saved;
    }

    @PutMapping("/{id}/status")
    public LaboratoryTest status(
            @PathVariable String id,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request
    ) {
        LaboratoryTest test = laboratoryTestRepository.findById(id)
                .orElseThrow(() -> new ApiException(404, "Laboratory test not found."));

        if (body.get("active") == null) {
            throw new ApiException(400, "Active status is required.");
        }

        boolean active = Boolean.parseBoolean(String.valueOf(body.get("active")));

        test.setActive(active);
        test.setUpdatedAt(LocalDateTime.now());

        LaboratoryTest saved = laboratoryTestRepository.save(test);

        request.setAttribute(
                "auditDetail",
                "Laboratory test " + saved.getTestName()
                        + (active ? " activated" : " deactivated")
        );

        return saved;
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(
            @PathVariable String id,
            HttpServletRequest request
    ) {
        LaboratoryTest test = laboratoryTestRepository.findById(id)
                .orElseThrow(() -> new ApiException(404, "Laboratory test not found."));

        laboratoryTestRepository.delete(test);

        request.setAttribute(
                "auditDetail",
                "Laboratory test " + test.getTestName() + " deleted"
        );

        Map<String, String> response = new LinkedHashMap<>();
        response.put("message", "Laboratory test deleted.");

        return response;
    }

    private void ensureUniqueName(String testName, String currentId) {
        laboratoryTestRepository.findFirstByTestNameIgnoreCase(testName).ifPresent(existing -> {
            if (currentId == null || !existing.getId().equals(currentId)) {
                throw new ApiException(
                        409,
                        "A laboratory test with this name already exists."
                );
            }
        });
    }

    private String requiredText(
            Map<String, Object> body,
            String key,
            String message
    ) {
        String value = optionalText(body, key);

        if (value == null || value.isBlank()) {
            throw new ApiException(400, message);
        }

        return value;
    }

    private String optionalText(Map<String, Object> body, String key) {
        Object value = body.get(key);

        if (value == null) {
            return "";
        }

        return String.valueOf(value).trim();
    }

    private double readPrice(Object raw) {
        if (raw == null || String.valueOf(raw).trim().isEmpty()) {
            throw new ApiException(400, "Test price is required.");
        }

        final double price;

        try {
            price = Double.parseDouble(String.valueOf(raw));
        } catch (NumberFormatException ex) {
            throw new ApiException(
                    400,
                    "Test price must be a valid number."
            );
        }

        if (!Double.isFinite(price) || price < 0) {
            throw new ApiException(
                    400,
                    "Test price cannot be negative."
            );
        }

        return price;
    }
}