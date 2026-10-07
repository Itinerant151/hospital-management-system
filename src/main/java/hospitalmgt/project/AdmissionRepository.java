package hospitalmgt.project;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AdmissionRepository extends MongoRepository<Admission, String> {
    List<Admission> findByStatus(String status);
    List<Admission> findByPatientId(String patientId);
    boolean existsByPatientIdAndStatus(String patientId, String status);
}