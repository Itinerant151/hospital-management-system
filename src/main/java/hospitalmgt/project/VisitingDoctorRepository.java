package hospitalmgt.project;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface VisitingDoctorRepository extends MongoRepository<VisitingDoctor, String> {
    VisitingDoctor findByDoctorId(String doctorId);
}