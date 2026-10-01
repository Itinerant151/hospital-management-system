package hospitalmgt.project;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface PasswordResetTokenRepository extends MongoRepository<PasswordResetToken, String> {
    PasswordResetToken findByTokenHash(String tokenHash);
    void deleteByUserId(String userId);
}