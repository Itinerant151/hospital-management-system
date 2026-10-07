package hospitalmgt.project;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface UserRepository extends MongoRepository<User, String> {
    User findByUsername(String username);
    User findByPatientId(String patientId);
    User findByDoctorId(String doctorId);
    User findByEmail(String email);
    List<User> findByRequestedRoleAndApprovedFalse(String requestedRole);
    List<User> findByRequestedRoleInAndApprovedFalse(List<String> requestedRoles);
}