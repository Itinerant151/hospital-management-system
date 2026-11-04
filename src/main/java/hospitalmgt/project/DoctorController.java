package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/doctors")
public class DoctorController {

    @Autowired
    private DoctorRepository doctorRepository;

    @GetMapping
    public List<Doctor> getAllDoctors() {
        return doctorRepository.findAll();
    }

    @PostMapping
    public Doctor addDoctor(@RequestBody Doctor doctor, HttpServletRequest request) {
        if (isAdmin(request)) {
            checkFee(doctor.getConsultationFee());
        } else {
            doctor.setConsultationFee(0);
        }
        return doctorRepository.save(doctor);
    }

    @GetMapping("/{id}")
    public Doctor getDoctorById(@PathVariable String id) {
        return doctorRepository.findById(id).orElse(null);
    }

    @DeleteMapping("/{id}")
    public String deleteDoctor(@PathVariable String id) {
        doctorRepository.deleteById(id);
        return "Doctor deleted successfully";
    }

    // Full update of any field on any doctor. Only an admin can change the consultation fee.
    @PutMapping("/{id}")
    public Doctor updateDoctor(@PathVariable String id, @RequestBody Doctor doctor, HttpServletRequest request) {
        if (isAdmin(request)) {
            checkFee(doctor.getConsultationFee());
        } else {
            Doctor existing = doctorRepository.findById(id).orElse(null);
            doctor.setConsultationFee(existing == null ? 0 : existing.getConsultationFee());
        }
        doctor.setId(id);
        return doctorRepository.save(doctor);
    }

    private boolean isAdmin(HttpServletRequest request) {
        return "ADMIN".equals(request.getAttribute("role"));
    }

    private void checkFee(double fee) {
        if (fee < 0) throw new ApiException(400, "The consultation fee cannot be negative.");
    }
}