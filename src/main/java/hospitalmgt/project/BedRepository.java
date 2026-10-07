package hospitalmgt.project;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface BedRepository extends MongoRepository<Bed, String> {
    List<Bed> findByWardId(String wardId);
}