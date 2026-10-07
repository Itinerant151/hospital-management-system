package hospitalmgt.project;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface LaboratoryTestRepository extends MongoRepository<LaboratoryTest, String> {

    List<LaboratoryTest> findByActiveTrue();

    List<LaboratoryTest> findByCategoryIgnoreCase(String category);

    boolean existsByTestNameIgnoreCase(String testName);

    Optional<LaboratoryTest> findFirstByTestNameIgnoreCase(String testName);
}