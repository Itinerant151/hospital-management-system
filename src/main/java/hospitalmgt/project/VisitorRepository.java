package hospitalmgt.project;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface VisitorRepository extends MongoRepository<Visitor, String> {
    List<Visitor> findByPatientId(String patientId);
    List<Visitor> findByVisitorPatientId(String visitorPatientId);
}