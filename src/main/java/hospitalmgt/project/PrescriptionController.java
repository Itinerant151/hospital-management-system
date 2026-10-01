package hospitalmgt.project;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/prescriptions")
public class PrescriptionController {

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private MedicineRepository medicineRepository;

    @GetMapping
    public List<Prescription> getAll() {
        return prescriptionRepository.findAll();
    }

    @GetMapping("/patient/{patientId}")
    public List<Prescription> getByPatient(@PathVariable String patientId) {
        return prescriptionRepository.findByPatientId(patientId);
    }

    @PostMapping
    public Prescription create(@RequestBody Prescription prescription) {
        return prescriptionRepository.save(prescription);
    }

    // Marks a prescription dispensed and decrements medicine stock accordingly
    @PostMapping("/{id}/dispense")
    public ResponseEntity<?> dispense(@PathVariable String id) {
        return prescriptionRepository.findById(id).map(p -> {
            if (p.isDispensed()) {
                return ResponseEntity.badRequest().body("Already dispensed");
            }
            for (Prescription.PrescribedItem item : p.getItems()) {
                Medicine med = medicineRepository.findById(item.getMedicineId()).orElse(null);
                if (med != null) {
                    med.setStockQuantity(Math.max(0, med.getStockQuantity() - item.getQuantity()));
                    medicineRepository.save(med);
                }
            }
            p.setDispensed(true);
            prescriptionRepository.save(p);
            return ResponseEntity.ok(p);
        }).orElse(ResponseEntity.notFound().build());
    }
}
