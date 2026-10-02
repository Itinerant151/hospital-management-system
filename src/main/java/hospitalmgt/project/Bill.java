package hospitalmgt.project;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "bills")
public class Bill {

    @Id
    private String id;

    private String patientId;
    private String appointmentId; // optional link back to an appointment
    private List<BillItem> items;
    private double total;
    // PENDING, PARTIALLY_PAID, AWAITING_HMO or PAID (always worked out by recalculateStatus)
    private String status = "PENDING";
    private String transactionId; // receipt number of the latest payment
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime paidAt;
    private boolean paymentReminderSent = false;

    // HMO (health insurance) part of the bill
    private String hmoProvider;
    private String hmoMemberNumber;
    private double hmoCoveredAmount;     // what the HMO is asked to pay
    private String claimStatus = "NONE"; // NONE, PENDING, APPROVED, PARTIALLY_APPROVED, REJECTED
    private double hmoApprovedAmount;    // only used when the claim is partially approved
    private String claimNote;
    private LocalDateTime claimUpdatedAt;

    // What the patient has paid so far
    private double amountPaid;
    private List<Payment> payments = new ArrayList<>();

    public static class BillItem {
        private String description;
        private double amount;

        public BillItem() {}
        public BillItem(String description, double amount) {
            this.description = description;
            this.amount = amount;
        }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public double getAmount() { return amount; }
        public void setAmount(double amount) { this.amount = amount; }
    }

    public static class Payment {
        private String receiptNumber;
        private double amount;
        private String method;
        private LocalDateTime paidAt;
        private String receivedBy;
        private double balanceAfter;

        public Payment() {}
        public String getReceiptNumber() { return receiptNumber; }
        public void setReceiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; }
        public double getAmount() { return amount; }
        public void setAmount(double amount) { this.amount = amount; }
        public String getMethod() { return method; }
        public void setMethod(String method) { this.method = method; }
        public LocalDateTime getPaidAt() { return paidAt; }
        public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
        public String getReceivedBy() { return receivedBy; }
        public void setReceivedBy(String receivedBy) { this.receivedBy = receivedBy; }
        public double getBalanceAfter() { return balanceAfter; }
        public void setBalanceAfter(double balanceAfter) { this.balanceAfter = balanceAfter; }
    }

    public Bill() {}

    public static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    /** The part of the bill the HMO is responsible for, given the state of the claim. */
    @Transient
    public double getHmoAmount() {
        String claim = claimStatus == null ? "NONE" : claimStatus;
        switch (claim) {
            case "PENDING":
            case "APPROVED":
                return hmoCoveredAmount;
            case "PARTIALLY_APPROVED":
                return hmoApprovedAmount;
            default:
                return 0;
        }
    }

    /** What the patient must pay out of pocket. */
    @Transient
    public double getPatientShare() {
        return round(Math.max(0, total - getHmoAmount()));
    }

    /** What the patient still owes. */
    @Transient
    public double getBalance() {
        // Bills paid before HMO support existed carry no payment records
        if ("PAID".equals(status) && amountPaid <= 0 && (payments == null || payments.isEmpty())) {
            return 0;
        }
        return round(Math.max(0, getPatientShare() - amountPaid));
    }

    public void recalculateStatus() {
        double balance = getBalance();
        boolean waitingForHmo = "PENDING".equals(claimStatus) && getHmoAmount() > 0;
        if (balance <= 0.005) {
            status = waitingForHmo ? "AWAITING_HMO" : "PAID";
        } else if (amountPaid > 0.005) {
            status = "PARTIALLY_PAID";
        } else {
            status = "PENDING";
        }
        if ("PAID".equals(status)) {
            if (paidAt == null) paidAt = LocalDateTime.now();
        } else {
            paidAt = null;
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getAppointmentId() { return appointmentId; }
    public void setAppointmentId(String appointmentId) { this.appointmentId = appointmentId; }
    public List<BillItem> getItems() { return items; }
    public void setItems(List<BillItem> items) { this.items = items; }
    public double getTotal() { return total; }
    public void setTotal(double total) { this.total = total; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
    public boolean isPaymentReminderSent() { return paymentReminderSent; }
    public void setPaymentReminderSent(boolean paymentReminderSent) { this.paymentReminderSent = paymentReminderSent; }
    public String getHmoProvider() { return hmoProvider; }
    public void setHmoProvider(String hmoProvider) { this.hmoProvider = hmoProvider; }
    public String getHmoMemberNumber() { return hmoMemberNumber; }
    public void setHmoMemberNumber(String hmoMemberNumber) { this.hmoMemberNumber = hmoMemberNumber; }
    public double getHmoCoveredAmount() { return hmoCoveredAmount; }
    public void setHmoCoveredAmount(double hmoCoveredAmount) { this.hmoCoveredAmount = hmoCoveredAmount; }
    public String getClaimStatus() { return claimStatus; }
    public void setClaimStatus(String claimStatus) { this.claimStatus = claimStatus; }
    public double getHmoApprovedAmount() { return hmoApprovedAmount; }
    public void setHmoApprovedAmount(double hmoApprovedAmount) { this.hmoApprovedAmount = hmoApprovedAmount; }
    public String getClaimNote() { return claimNote; }
    public void setClaimNote(String claimNote) { this.claimNote = claimNote; }
    public LocalDateTime getClaimUpdatedAt() { return claimUpdatedAt; }
    public void setClaimUpdatedAt(LocalDateTime claimUpdatedAt) { this.claimUpdatedAt = claimUpdatedAt; }
    public double getAmountPaid() { return amountPaid; }
    public void setAmountPaid(double amountPaid) { this.amountPaid = amountPaid; }
    public List<Payment> getPayments() { return payments; }
    public void setPayments(List<Payment> payments) { this.payments = payments; }
}