package hospitalmgt.project;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface WardRepository extends MongoRepository<Ward, String> {
}