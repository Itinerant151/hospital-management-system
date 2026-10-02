package hospitalmgt.project;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface DiagnosisRecordRepository extends MongoRepository<DiagnosisRecord, String> {
    List<DiagnosisRecord> findByPatientId(String patientId);
    List<DiagnosisRecord> findByDoctorId(String doctorId);
}