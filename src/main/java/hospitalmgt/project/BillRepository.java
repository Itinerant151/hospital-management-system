package hospitalmgt.project;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface BillRepository extends MongoRepository<Bill, String> {
    List<Bill> findByPatientId(String patientId);
    List<Bill> findByStatus(String status);
}
