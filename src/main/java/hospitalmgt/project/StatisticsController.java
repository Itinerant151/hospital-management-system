package hospitalmgt.project;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/statistics")
public class StatisticsController {

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private MedicineRepository medicineRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @GetMapping("/summary")
    public Map<String, Object> summary() {
        Map<String, Object> stats = new HashMap<>();

        stats.put("totalPatients", patientRepository.count());
        stats.put("totalDoctors", doctorRepository.count());
        stats.put("totalAppointments", appointmentRepository.count());

        String today = LocalDate.now().toString(); // e.g. "2026-09-22"
        long appointmentsToday = appointmentRepository.findAll().stream()
                .filter(a -> a.getAppointmentDate() != null && a.getAppointmentDate().startsWith(today))
                .count();
        stats.put("appointmentsToday", appointmentsToday);

        stats.put("totalBills", billRepository.count());
        stats.put("pendingBills", billRepository.findByStatus("PENDING").size());
        stats.put("paidBills", billRepository.findByStatus("PAID").size());
        stats.put("totalMedicines", medicineRepository.count());
        stats.put("lowStockMedicines", medicineRepository.findAll().stream()
                .filter(m -> m.getStockQuantity() < 10)
                .count());

        return stats;
    }
}
