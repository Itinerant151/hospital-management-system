package hospitalmgt.project;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medicines")
public class MedicineController {

    @Autowired
    private MedicineRepository medicineRepository;

    @GetMapping
    public List<Medicine> getAll() {
        return medicineRepository.findAll();
    }

    @PostMapping
    public Medicine create(@RequestBody Medicine medicine) {
        return medicineRepository.save(medicine);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Medicine> update(@PathVariable String id, @RequestBody Medicine updated) {
        return medicineRepository.findById(id).map(m -> {
            m.setName(updated.getName());
            m.setStockQuantity(updated.getStockQuantity());
            m.setPrice(updated.getPrice());
            m.setExpiryDate(updated.getExpiryDate());
            return ResponseEntity.ok(medicineRepository.save(m));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        medicineRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
