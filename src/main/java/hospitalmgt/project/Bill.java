package hospitalmgt.project;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "bills")
public class Bill {

    @Id
    private String id;

    private String patientId;
    private String appointmentId;

    private List<BillItem> items;

    private double total;

    private String status;

    private String transactionId;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime paidAt;

    private boolean paymentReminderSent = false;

    // Payment information
    private String paymentMethod;

    private String hmoProvider;

    private String hmoMemberNumber;

    private double hmoCoveredAmount;

    private double patientPayableAmount;

    public static class BillItem {

        private String description;
        private double amount;

        public BillItem() {}

        public BillItem(String description, double amount) {
            this.description = description;
            this.amount = amount;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public double getAmount() {
            return amount;
        }

        public void setAmount(double amount) {
            this.amount = amount;
        }
    }

    public Bill() {}

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getPatientId() {
        return patientId;
    }

    public void setPatientId(String patientId) {
        this.patientId = patientId;
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(String appointmentId) {
        this.appointmentId = appointmentId;
    }

    public List<BillItem> getItems() {
        return items;
    }

    public void setItems(List<BillItem> items) {
        this.items = items;
    }

    public double getTotal() {
        return total;
    }

    public void setTotal(double total) {
        this.total = total;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(LocalDateTime paidAt) {
        this.paidAt = paidAt;
    }

    public boolean isPaymentReminderSent() {
        return paymentReminderSent;
    }

    public void setPaymentReminderSent(boolean paymentReminderSent) {
        this.paymentReminderSent = paymentReminderSent;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getHmoProvider() {
        return hmoProvider;
    }

    public void setHmoProvider(String hmoProvider) {
        this.hmoProvider = hmoProvider;
    }

    public String getHmoMemberNumber() {
        return hmoMemberNumber;
    }

    public void setHmoMemberNumber(String hmoMemberNumber) {
        this.hmoMemberNumber = hmoMemberNumber;
    }

    public double getHmoCoveredAmount() {
        return hmoCoveredAmount;
    }

    public void setHmoCoveredAmount(double hmoCoveredAmount) {
        this.hmoCoveredAmount = hmoCoveredAmount;
    }

    public double getPatientPayableAmount() {
        return patientPayableAmount;
    }

    public void setPatientPayableAmount(double patientPayableAmount) {
        this.patientPayableAmount = patientPayableAmount;
    }
}