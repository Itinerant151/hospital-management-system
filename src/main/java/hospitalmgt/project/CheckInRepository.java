package hospitalmgt.project;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CheckInRepository extends MongoRepository<CheckIn, String> {
    List<CheckIn> findByStatus(String status);
}