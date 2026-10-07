package hospitalmgt.project;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ConsultationRepository extends MongoRepository<Consultation, String> {
    Consultation findByAppointmentId(String appointmentId);
    List<Consultation> findByDoctorId(String doctorId);
}