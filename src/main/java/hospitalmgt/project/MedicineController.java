package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/medicines")
public class MedicineController {

    @Autowired
    private MedicineRepository medicineRepository;

    @GetMapping
    public List<Medicine> getAll() {
        return medicineRepository.findAll();
    }

    // One row per category: how many medicines, total units, and whether anything in it is low
    @GetMapping("/categories")
    public List<Map<String, Object>> categories() {
        List<Medicine> all = medicineRepository.findAll();
        List<String> order = new ArrayList<>(Medicine.CATEGORIES);
        order.add(Medicine.UNCATEGORISED);

        List<Map<String, Object>> out = new ArrayList<>();
        for (String category : order) {
            List<Medicine> inCategory = all.stream()
                    .filter(m -> category.equals(Medicine.categoryOf(m)))
                    .toList();
            if (Medicine.UNCATEGORISED.equals(category) && inCategory.isEmpty()) continue;

            int units = inCategory.stream().mapToInt(Medicine::getStockQuantity).sum();
            long low = inCategory.stream().filter(m -> m.getStockQuantity() < Medicine.LOW_STOCK_LIMIT).count();

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("category", category);
            row.put("medicineCount", inCategory.size());
            row.put("totalUnits", units);
            row.put("lowStockCount", low);
            row.put("lowStock", low > 0);
            out.add(row);
        }
        return out;
    }

    @PostMapping
    public Medicine create(@RequestBody Medicine medicine, HttpServletRequest request) {
        checkBasics(medicine);
        medicine.setId(null);
        medicine.setCategory(cleanCategory(medicine.getCategory()));
        Medicine saved = medicineRepository.save(medicine);
        request.setAttribute("auditDetail", "Medicine added: " + saved.getName());
        return saved;
    }

    @PutMapping("/{id}")
    public Medicine update(@PathVariable String id, @RequestBody Medicine updated, HttpServletRequest request) {
        Medicine m = medicineRepository.findById(id)
                .orElseThrow(() -> new ApiException(404, "Medicine not found."));
        checkBasics(updated);
        m.setName(updated.getName());
        m.setStockQuantity(updated.getStockQuantity());
        m.setPrice(updated.getPrice());
        m.setExpiryDate(updated.getExpiryDate());
        String category = cleanCategory(updated.getCategory());
        if (category != null) m.setCategory(category);   // an older form that sends no category keeps the current one
        request.setAttribute("auditDetail", "Medicine updated: " + m.getName());
        return medicineRepository.save(m);
    }

    // Pharmacists (and admin) set how many units are available
    @PutMapping("/{id}/stock")
    public Medicine setStock(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        Medicine m = medicineRepository.findById(id)
                .orElseThrow(() -> new ApiException(404, "Medicine not found."));

        int quantity;
        try {
            quantity = Integer.parseInt(String.valueOf(body.get("stockQuantity")).trim());
        } catch (NumberFormatException e) {
            throw new ApiException(400, "Enter the number of units as a whole number.");
        }
        if (quantity < 0 || quantity > 1_000_000) {
            throw new ApiException(400, "Enter a number between 0 and 1,000,000.");
        }

        int before = m.getStockQuantity();
        m.setStockQuantity(quantity);
        request.setAttribute("auditDetail", "Stock of " + m.getName() + " changed from " + before + " to " + quantity);
        return medicineRepository.save(m);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        medicineRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    private void checkBasics(Medicine m) {
        String name = m.getName() == null ? "" : m.getName().trim();
        if (name.isEmpty()) throw new ApiException(400, "Enter the medicine name.");
        if (m.getStockQuantity() < 0) throw new ApiException(400, "Stock cannot be negative.");
        if (m.getPrice() < 0) throw new ApiException(400, "Price cannot be negative.");
        m.setName(name);
    }

    // Blank means "no category chosen"; anything else must be in the list
    private String cleanCategory(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String c = raw.trim();
        if (!Medicine.CATEGORIES.contains(c)) {
            throw new ApiException(400, "Choose a category from the list.");
        }
        return c;
    }
}