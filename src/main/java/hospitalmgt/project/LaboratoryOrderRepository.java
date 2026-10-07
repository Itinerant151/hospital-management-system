package hospitalmgt.project;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface LaboratoryOrderRepository
        extends MongoRepository<LaboratoryOrder, String> {

    List<LaboratoryOrder> findByDoctorIdOrderByOrderedAtDesc(
            String doctorId
    );

    List<LaboratoryOrder> findByPatientIdOrderByOrderedAtDesc(
            String patientId
    );

    List<LaboratoryOrder> findByStatus(String status);
}