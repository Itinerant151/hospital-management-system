package hospitalmgt.project;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        User user = userRepository.findByUsername(username);

        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid username or password");
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole(), user.getPatientId(), user.getDoctorId());

        Map<String, String> result = new HashMap<>();
        result.put("token", token);
        result.put("role", user.getRole());
        if (user.getPatientId() != null) result.put("patientId", user.getPatientId());
        if (user.getDoctorId() != null) result.put("doctorId", user.getDoctorId());
        return result;
    }

    @PostMapping("/signup")
    public String signup(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        String role = body.get("role");

        if (!role.equals("DOCTOR") && !role.equals("PATIENT")) {
            throw new RuntimeException("Invalid role for signup");
        }

        if (userRepository.findByUsername(username) != null) {
            throw new RuntimeException("Username already taken");
        }

        User user = new User(username, passwordEncoder.encode(password), role);

        if (role.equals("PATIENT")) {
            String name = body.get("name");
            String ageStr = body.get("age");
            String gender = body.get("gender");

            if (name == null || ageStr == null || gender == null) {
                throw new RuntimeException("Name, age, and gender are required for patient signup");
            }

            Patient patient = new Patient(name, Integer.parseInt(ageStr), gender, "", null);
            Patient savedPatient = patientRepository.save(patient);
            user.setPatientId(savedPatient.getId());
        }

        if (role.equals("DOCTOR")) {
            String name = body.get("name");
            String specialization = body.get("specialization");
            String phoneNumber = body.get("phoneNumber");

            if (name == null || specialization == null || phoneNumber == null) {
                throw new RuntimeException("Name, specialization, and phone number are required for doctor signup");
            }

            Doctor doctor = new Doctor(name, specialization, phoneNumber);
            Doctor savedDoctor = doctorRepository.save(doctor);
            user.setDoctorId(savedDoctor.getId());
        }

        userRepository.save(user);
        return "Account created successfully";
    }
}