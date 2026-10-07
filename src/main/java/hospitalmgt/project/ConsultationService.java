package hospitalmgt.project;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/** Creates the consultation-fee bill when a patient checks in for a visiting doctor's appointment. */
@Service
public class ConsultationService {

    private final AppointmentRepository appointmentRepository;
    private final VisitingDoctorRepository visitingDoctorRepository;
    private final ConsultationRepository consultationRepository;
    private final BillRepository billRepository;
    private final DoctorRepository doctorRepository;

    public ConsultationService(AppointmentRepository appointmentRepository,
                               VisitingDoctorRepository visitingDoctorRepository,
                               ConsultationRepository consultationRepository,
                               BillRepository billRepository,
                               DoctorRepository doctorRepository) {
        this.appointmentRepository = appointmentRepository;
        this.visitingDoctorRepository = visitingDoctorRepository;
        this.consultationRepository = consultationRepository;
        this.billRepository = billRepository;
        this.doctorRepository = doctorRepository;
    }

    /**
     * Returns the new consultation, or null when nothing was billed: the appointment does not belong
     * to this patient, the doctor is not a visiting doctor, or this appointment was already billed.
     */
    public Consultation billCheckIn(String appointmentId, String patientId, String staffUsername) {
        Appointment appointment = appointmentRepository.findById(appointmentId).orElse(null);
        if (appointment == null || appointment.getPatientId() == null
                || !appointment.getPatientId().equals(patientId)) {
            return null;
        }

        VisitingDoctor visiting = visitingDoctorRepository.findByDoctorId(appointment.getDoctorId());
        if (visiting == null) return null;

        if (consultationRepository.findByAppointmentId(appointmentId) != null) return null;

        Doctor doctor = doctorRepository.findById(appointment.getDoctorId()).orElse(null);
        String doctorName = doctor == null ? "visiting doctor" : doctor.getName();
        double fee = Bill.round(visiting.getConsultationFee());

        List<Bill.BillItem> items = new ArrayList<>();
        items.add(new Bill.BillItem("Consultation fee - " + doctorName, fee));

        Bill bill = new Bill();
        bill.setPatientId(appointment.getPatientId());
        bill.setAppointmentId(appointment.getId());
        bill.setItems(items);
        bill.setTotal(fee);
        bill.recalculateStatus();
        Bill savedBill = billRepository.save(bill);

        Consultation consultation = new Consultation();
        consultation.setAppointmentId(appointment.getId());
        consultation.setPatientId(appointment.getPatientId());
        consultation.setDoctorId(appointment.getDoctorId());
        consultation.setBillId(savedBill.getId());
        consultation.setFee(fee);
        consultation.setHospitalSharePercent(visiting.getHospitalSharePercent());
        consultation.setCreatedBy(staffUsername);
        return consultationRepository.save(consultation);
    }
}