package hospitalmgt.project;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * One billed visit to a visiting doctor. Created when the patient is checked in at the front desk.
 * The hospital share is copied here at that moment, so later rate changes never rewrite old earnings.
 */
@Document(collection = "consultations")
public class Consultation {

    @Id
    private String id;
    private String appointmentId;
    private String patientId;
    private String doctorId;
    private String billId;
    private double fee;
    private double hospitalSharePercent;
    private LocalDateTime createdAt = LocalDateTime.now();
    private String createdBy; // front-desk username

    public Consultation() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getAppointmentId() { return appointmentId; }
    public void setAppointmentId(String appointmentId) { this.appointmentId = appointmentId; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }
    public String getBillId() { return billId; }
    public void setBillId(String billId) { this.billId = billId; }
    public double getFee() { return fee; }
    public void setFee(double fee) { this.fee = fee; }
    public double getHospitalSharePercent() { return hospitalSharePercent; }
    public void setHospitalSharePercent(double hospitalSharePercent) { this.hospitalSharePercent = hospitalSharePercent; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
}