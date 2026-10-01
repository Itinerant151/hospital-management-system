package hospitalmgt.project;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;
    private final AccountEmailService accountEmailService;

    public DataSeeder(UserRepository userRepository, PatientRepository patientRepository,
                      PasswordEncoder passwordEncoder, AccountEmailService accountEmailService) {
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.passwordEncoder = passwordEncoder;
        this.accountEmailService = accountEmailService;
    }

    @Override
    public void run(String... args) {
        if (userRepository.findByUsername("admin") == null) {
            User admin = new User("admin", passwordEncoder.encode("admin123"), "ADMIN");
            userRepository.save(admin);
            System.out.println("Default admin user created: admin / admin123");
        }

        // The "Other" gender option is now "Rather Not Say": update older records
        for (Patient patient : patientRepository.findAll()) {
            if ("Other".equalsIgnoreCase(patient.getGender())) {
                patient.setGender("Rather Not Say");
                patientRepository.save(patient);
            }
        }

        // Make sure every patient account and its profile share the same email
        for (User user : userRepository.findAll()) {
            if (user.getPatientId() != null) {
                try {
                    accountEmailService.reconcile(user);
                } catch (Exception e) {
                    System.out.println("Email sync skipped for " + user.getUsername() + ": " + e.getMessage());
                }
            }
        }
    }
}