package hospitalmgt.project;

import org.springframework.stereotype.Service;

/**
 * Keeps the account email (User) and the patient profile email (Patient) identical.
 * The account email is the source of truth.
 */
@Service
public class AccountEmailService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;

    public AccountEmailService(UserRepository userRepository, PatientRepository patientRepository) {
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
    }

    /**
     * Repairs any mismatch between the two emails. Used when an account or profile is loaded,
     * and once at startup for accounts created before emails were linked.
     */
    public void reconcile(User user) {
        if (user == null || user.getPatientId() == null) return;

        Patient patient = patientRepository.findById(user.getPatientId()).orElse(null);
        if (patient == null) return;

        String accountEmail = clean(user.getEmail());
        String profileEmail = clean(patient.getEmail());

        if (!accountEmail.isEmpty()) {
            // The account email wins
            if (!accountEmail.equalsIgnoreCase(profileEmail)) {
                patient.setEmail(accountEmail);
                patientRepository.save(patient);
            }
        } else if (!profileEmail.isEmpty()) {
            // Older account with no email: adopt the one on the profile, if it is valid and unused
            try {
                String cleaned = AccountRules.cleanEmail(profileEmail);
                User owner = userRepository.findByEmail(cleaned);
                if (owner == null || owner.getId().equals(user.getId())) {
                    user.setEmail(cleaned);
                    userRepository.save(user);
                }
            } catch (ApiException ignored) {
                // The profile email was not a valid address, so leave it alone
            }
        }
    }

    /**
     * Changes the account email and copies it to the linked patient profile.
     */
    public void applyEmail(User user, String rawEmail) {
        String cleaned = AccountRules.cleanEmail(rawEmail);

        User owner = userRepository.findByEmail(cleaned);
        if (owner != null && !owner.getId().equals(user.getId())) {
            throw new ApiException(409, "An account with that email already exists.");
        }

        user.setEmail(cleaned);
        userRepository.save(user);

        if (user.getPatientId() != null) {
            patientRepository.findById(user.getPatientId()).ifPresent(patient -> {
                patient.setEmail(cleaned);
                patientRepository.save(patient);
            });
        }
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}