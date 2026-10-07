package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/bills")
public class BillController {

    private static final List<String> METHODS = List.of("Cash", "Card", "Bank Transfer", "Demo");
    private static final List<String> CLAIM_STATUSES = List.of("PENDING", "APPROVED", "PARTIALLY_APPROVED", "REJECTED");

    @Autowired
    private BillRepository billRepository;

    @Autowired
    private PatientRepository patientRepository;

    @GetMapping
    public List<Bill> getAll() {
        return billRepository.findAll();
    }

    @GetMapping("/patient/{patientId}")
    public List<Bill> getByPatient(@PathVariable String patientId, HttpServletRequest request) {
        if ("PATIENT".equals(request.getAttribute("role"))) {
            String own = (String) request.getAttribute("patientId");
            if (own == null || !own.equals(patientId)) {
                throw new ApiException(403, "You can only see your own bills.");
            }
        }
        return billRepository.findByPatientId(patientId);
    }

    @GetMapping("/mine")
    public List<Bill> getMine(HttpServletRequest request) {
        String patientId = (String) request.getAttribute("patientId");
        if (patientId == null) throw new ApiException(400, "No patient record is linked to this account.");
        return billRepository.findByPatientId(patientId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Bill> getOne(@PathVariable String id) {
        return billRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Bill create(@RequestBody Bill incoming, HttpServletRequest request) {
        if (incoming.getPatientId() == null || !patientRepository.existsById(incoming.getPatientId())) {
            throw new ApiException(404, "Select a valid patient.");
        }
        if (incoming.getItems() == null || incoming.getItems().isEmpty()) {
            throw new ApiException(400, "Add at least one line item.");
        }

        List<Bill.BillItem> items = new ArrayList<>();
        double total = 0;
        for (Bill.BillItem item : incoming.getItems()) {
            if (item.getDescription() == null || item.getDescription().isBlank() || item.getAmount() < 0) {
                throw new ApiException(400, "Every line item needs a description and a valid amount.");
            }
            items.add(new Bill.BillItem(item.getDescription().trim(), Bill.round(item.getAmount())));
            total += item.getAmount();
        }
        total = Bill.round(total);
        if (total <= 0) throw new ApiException(400, "The bill total must be more than zero.");

        Bill bill = new Bill();
        bill.setPatientId(incoming.getPatientId());
        bill.setAppointmentId(incoming.getAppointmentId());
        bill.setItems(items);
        bill.setTotal(total);

        double percent = Bill.round(incoming.getHmoCoveragePercent());
        if (percent < 0 || percent > 100) {
            throw new ApiException(400, "The HMO coverage must be between 0% and 100%.");
        }
        double covered = Bill.round(total * percent / 100.0);
        if (percent > 0) {
            String provider = incoming.getHmoProvider() == null ? "" : incoming.getHmoProvider().trim();
            String member = incoming.getHmoMemberNumber() == null ? "" : incoming.getHmoMemberNumber().trim();
            if (provider.isEmpty() || member.isEmpty()) {
                throw new ApiException(400, "Enter the HMO provider and the HMO member number.");
            }
            bill.setHmoProvider(provider);
            bill.setHmoMemberNumber(member);
            bill.setHmoCoveragePercent(percent);
            bill.setHmoCoveredAmount(covered);
            bill.setClaimStatus("PENDING");
            bill.setClaimUpdatedAt(LocalDateTime.now());
        }

        bill.recalculateStatus();
        Bill saved = billRepository.save(bill);
        request.setAttribute("auditDetail", "Bill of " + money(total) + " created"
                + (percent > 0 ? ", HMO covers " + pct(percent) + "% (" + money(covered) + ") via " + bill.getHmoProvider() : ""));
        return saved;
    }

    // Records a payment by the patient. No amount means "pay the whole balance". Demo only: no real gateway.
    @PostMapping("/{id}/pay")
    public Bill pay(@PathVariable String id,
                    @RequestBody(required = false) Map<String, Object> body,
                    HttpServletRequest request) {
        Bill bill = billRepository.findById(id).orElseThrow(() -> new ApiException(404, "Bill not found."));
        checkOwnership(bill, request);

        if ("PAID".equals(bill.getStatus())) {
            throw new ApiException(409, "This bill is already fully paid.");
        }
        double balance = bill.getBalance();
        if (balance <= 0.005) {
            throw new ApiException(409, "The patient owes nothing right now. The rest is waiting for the HMO.");
        }

        double amount = balance;
        String method = "Demo";
        if (body != null) {
            Object rawAmount = body.get("amount");
            if (rawAmount != null && !rawAmount.toString().isBlank()) amount = toDouble(rawAmount);
            Object rawMethod = body.get("method");
            if (rawMethod != null && !rawMethod.toString().isBlank()) method = rawMethod.toString().trim();
        }
        if (Double.isNaN(amount) || amount <= 0) {
            throw new ApiException(400, "Enter an amount greater than zero.");
        }
        amount = Bill.round(amount);
        if (amount > balance + 0.005) {
            throw new ApiException(400, "The amount is more than the remaining balance of " + money(balance) + ".");
        }
        amount = Math.min(amount, balance);
        if (!METHODS.contains(method)) {
            throw new ApiException(400, "Choose a valid payment method.");
        }

        Bill.Payment payment = new Bill.Payment();
        payment.setReceiptNumber("RCP-" + LocalDate.now().toString().replace("-", "") + "-"
                + UUID.randomUUID().toString().substring(0, 5).toUpperCase());
        payment.setAmount(amount);
        payment.setMethod(method);
        payment.setPaidAt(LocalDateTime.now());
        payment.setReceivedBy((String) request.getAttribute("username"));

        if (bill.getPayments() == null) bill.setPayments(new ArrayList<>());
        bill.getPayments().add(payment);
        bill.setAmountPaid(Bill.round(bill.getAmountPaid() + amount));
        bill.setTransactionId(payment.getReceiptNumber());
        bill.recalculateStatus();
        if ("PAID".equals(bill.getStatus())) bill.setPaymentReminderSent(true);
        payment.setBalanceAfter(bill.getBalance());

        request.setAttribute("auditDetail", "Payment of " + money(amount) + " by " + method
                + " (receipt " + payment.getReceiptNumber() + "), balance " + money(bill.getBalance()));
        return billRepository.save(bill);
    }

    // Staff update where the HMO claim stands
    @PutMapping("/{id}/claim")
    public Bill updateClaim(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        Bill bill = billRepository.findById(id).orElseThrow(() -> new ApiException(404, "Bill not found."));
        if (bill.getHmoCoveredAmount() <= 0) {
            throw new ApiException(409, "This bill has no HMO portion.");
        }
        if (bill.isHmoPaid()) {
            throw new ApiException(409, "The HMO has already paid this claim, so it can no longer be changed.");
        }

        String status = body.get("claimStatus") == null ? "" : body.get("claimStatus").toString();
        if (!CLAIM_STATUSES.contains(status)) {
            throw new ApiException(400, "Claim status must be Pending, Approved, Partially approved or Rejected.");
        }

        double approved = 0;
        double approvedPercent = 0;
        if (status.equals("APPROVED")) {
            approved = bill.getHmoCoveredAmount();
            approvedPercent = bill.getHmoCoveragePercent();
        } else if (status.equals("PARTIALLY_APPROVED")) {
            approvedPercent = Bill.round(toDouble(body.get("approvedPercent")));
            if (Double.isNaN(approvedPercent) || approvedPercent <= 0 || approvedPercent >= bill.getHmoCoveragePercent()) {
                throw new ApiException(400, "For a partial approval, enter a percentage above 0 and below "
                        + pct(bill.getHmoCoveragePercent()) + "%.");
            }
            approved = Bill.round(bill.getTotal() * approvedPercent / 100.0);
        }

        bill.setClaimStatus(status);
        bill.setHmoApprovedAmount(approved);
        bill.setHmoApprovedPercent(approvedPercent);
        Object note = body.get("note");
        bill.setClaimNote(note == null || note.toString().isBlank() ? null : note.toString().trim());
        bill.setClaimUpdatedAt(LocalDateTime.now());
        bill.recalculateStatus();

        request.setAttribute("auditDetail", "HMO claim set to " + status
                + (status.equals("PARTIALLY_APPROVED") ? " (" + pct(approvedPercent) + "% approved, " + money(approved) + ")" : ""));
        return billRepository.save(bill);
    }

    // The HMO has paid its share: staff mark it as paid and a receipt is created
    @PostMapping("/{id}/hmo-pay")
    public Bill hmoPay(@PathVariable String id,
                       @RequestBody(required = false) Map<String, Object> body,
                       HttpServletRequest request) {
        Bill bill = billRepository.findById(id).orElseThrow(() -> new ApiException(404, "Bill not found."));
        if (bill.getHmoCoveredAmount() <= 0) {
            throw new ApiException(409, "This bill has no HMO portion.");
        }
        if (bill.isHmoPaid()) {
            throw new ApiException(409, "The HMO payment for this bill is already marked as paid.");
        }
        String claim = bill.getClaimStatus();
        if (!"APPROVED".equals(claim) && !"PARTIALLY_APPROVED".equals(claim)) {
            throw new ApiException(409, "Approve the HMO claim before marking it as paid.");
        }

        double amount = Bill.round(bill.getHmoAmount());
        String reference = "";
        if (body != null && body.get("reference") != null) {
            reference = body.get("reference").toString().trim();
            if (reference.length() > 120) reference = reference.substring(0, 120);
        }

        bill.setHmoPaid(true);
        bill.setHmoPaidAmount(amount);
        bill.setHmoPaidAt(LocalDateTime.now());
        bill.setHmoPaidBy((String) request.getAttribute("username"));
        bill.setHmoPaymentReference(reference.isEmpty() ? null : reference);
        bill.setHmoReceiptNumber("HMO-" + LocalDate.now().toString().replace("-", "") + "-"
                + UUID.randomUUID().toString().substring(0, 5).toUpperCase());
        bill.recalculateStatus();

        request.setAttribute("auditDetail", "HMO payment of " + money(amount) + " from " + bill.getHmoProvider()
                + " marked as paid (receipt " + bill.getHmoReceiptNumber() + ")");
        return billRepository.save(bill);
    }

    // Everything needed to show or print the receipt for the HMO's payment
    @GetMapping("/{id}/hmo-receipt")
    public Map<String, Object> hmoReceipt(@PathVariable String id, HttpServletRequest request) {
        Bill bill = billRepository.findById(id).orElseThrow(() -> new ApiException(404, "Bill not found."));
        checkOwnership(bill, request);
        if (!bill.isHmoPaid()) {
            throw new ApiException(404, "The HMO has not paid this bill yet.");
        }

        Patient patient = patientRepository.findById(bill.getPatientId()).orElse(null);
        String patientId = bill.getPatientId() == null ? "" : bill.getPatientId();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("hospital", "MediCore Hospital");
        result.put("receiptNumber", bill.getHmoReceiptNumber());
        result.put("paidAt", bill.getHmoPaidAt());
        result.put("hmoProvider", bill.getHmoProvider());
        result.put("hmoMemberNumber", bill.getHmoMemberNumber());
        result.put("reference", bill.getHmoPaymentReference());
        result.put("patientName", patient == null ? "Unknown patient" : patient.getName());
        result.put("patientCode", "MC-" + patientId.substring(Math.max(0, patientId.length() - 8)).toUpperCase());
        result.put("items", bill.getItems());
        result.put("total", bill.getTotal());
        result.put("hmoCoveragePercent", bill.getHmoCoveragePercent());
        result.put("claimStatus", bill.getClaimStatus());
        result.put("hmoApprovedPercent", bill.getHmoApprovedPercent());
        result.put("hmoPaidAmount", bill.getHmoPaidAmount());
        result.put("patientShare", bill.getPatientShare());
        result.put("patientBalance", bill.getBalance());
        result.put("receivedBy", bill.getHmoPaidBy());
        result.put("status", bill.getStatus());
        return result;
    }

    // Everything needed to show or print a receipt for one payment (defaults to the latest payment)
    @GetMapping("/{id}/receipt")
    public Map<String, Object> receipt(@PathVariable String id,
                                       @RequestParam(required = false) String payment,
                                       HttpServletRequest request) {
        Bill bill = billRepository.findById(id).orElseThrow(() -> new ApiException(404, "Bill not found."));
        checkOwnership(bill, request);

        List<Bill.Payment> payments = bill.getPayments() == null ? new ArrayList<>() : bill.getPayments();
        Bill.Payment chosen = null;
        for (Bill.Payment p : payments) {
            if (payment == null || payment.isBlank() || payment.equals(p.getReceiptNumber())) chosen = p;
            if (payment != null && !payment.isBlank() && payment.equals(p.getReceiptNumber())) break;
        }
        if (chosen == null) {
            throw new ApiException(404, "No payment has been recorded for this bill yet.");
        }

        Patient patient = patientRepository.findById(bill.getPatientId()).orElse(null);
        String patientId = bill.getPatientId() == null ? "" : bill.getPatientId();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("hospital", "MediCore Hospital");
        result.put("receiptNumber", chosen.getReceiptNumber());
        result.put("paidAt", chosen.getPaidAt());
        result.put("patientName", patient == null ? "Unknown patient" : patient.getName());
        result.put("patientCode", "MC-" + patientId.substring(Math.max(0, patientId.length() - 8)).toUpperCase());
        result.put("items", bill.getItems());
        result.put("total", bill.getTotal());
        result.put("hmoProvider", bill.getHmoProvider());
        result.put("hmoMemberNumber", bill.getHmoMemberNumber());
        result.put("hmoCoveragePercent", bill.getHmoCoveragePercent());
        result.put("hmoCoveredAmount", bill.getHmoCoveredAmount());
        result.put("hmoAmount", bill.getHmoAmount());
        result.put("claimStatus", bill.getClaimStatus());
        result.put("patientShare", bill.getPatientShare());
        result.put("paymentAmount", chosen.getAmount());
        result.put("method", chosen.getMethod());
        result.put("receivedBy", chosen.getReceivedBy());
        result.put("totalPaid", bill.getAmountPaid());
        result.put("balance", bill.getBalance());
        result.put("status", bill.getStatus());
        return result;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, HttpServletRequest request) {
        request.setAttribute("auditDetail", "Bill " + id + " deleted");
        billRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    private void checkOwnership(Bill bill, HttpServletRequest request) {
        if ("PATIENT".equals(request.getAttribute("role"))) {
            String own = (String) request.getAttribute("patientId");
            if (own == null || !own.equals(bill.getPatientId())) {
                throw new ApiException(403, "You can only use your own bills.");
            }
        }
    }

    private double toDouble(Object value) {
        if (value == null) return Double.NaN;
        if (value instanceof Number) return ((Number) value).doubleValue();
        try {
            return Double.parseDouble(value.toString().trim());
        } catch (NumberFormatException e) {
            return Double.NaN;
        }
    }

    private String pct(double value) {
        return value == Math.rint(value) ? String.valueOf((long) value) : String.valueOf(value);
    }

    private String money(double value) {
        return "NGN " + String.format(Locale.US, "%,.2f", value);
    }
}