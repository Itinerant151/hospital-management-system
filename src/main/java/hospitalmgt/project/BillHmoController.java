package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

/** Staff add, change or remove the HMO part of a bill that has not been paid on yet. */
@RestController
@RequestMapping("/api/bills")
public class BillHmoController {

    private final BillRepository billRepository;

    public BillHmoController(BillRepository billRepository) {
        this.billRepository = billRepository;
    }

    @PutMapping("/{id}/hmo")
    public Bill setHmo(@PathVariable String id,
                       @RequestBody Map<String, Object> body,
                       HttpServletRequest request) {
        Bill bill = billRepository.findById(id)
                .orElseThrow(() -> new ApiException(404, "Bill not found."));

        String claim = bill.getClaimStatus() == null ? "NONE" : bill.getClaimStatus();
        boolean hasPayments = bill.getAmountPaid() > 0.005
                || (bill.getPayments() != null && !bill.getPayments().isEmpty());

        if ("PAID".equals(bill.getStatus())) {
            throw new ApiException(409, "This bill is already fully paid.");
        }
        if (bill.isHmoPaid()) {
            throw new ApiException(409, "The HMO has already paid this bill.");
        }
        if (!claim.equals("NONE") && !claim.equals("PENDING")) {
            throw new ApiException(409, "The HMO claim has already been decided, so the coverage can no longer be changed.");
        }
        if (hasPayments) {
            throw new ApiException(409, "A payment has already been recorded on this bill, so the HMO split can no longer be changed.");
        }

        double percent = Bill.round(toDouble(body.get("hmoCoveragePercent")));
        if (Double.isNaN(percent) || percent < 0 || percent > 100) {
            throw new ApiException(400, "The HMO coverage must be between 0% and 100%.");
        }

        if (percent == 0) {
            // Remove the HMO part
            bill.setHmoProvider(null);
            bill.setHmoMemberNumber(null);
            bill.setHmoCoveragePercent(0);
            bill.setHmoCoveredAmount(0);
            bill.setClaimStatus("NONE");
            request.setAttribute("auditDetail", "HMO removed from bill " + id);
        } else {
            String provider = body.get("hmoProvider") == null ? "" : body.get("hmoProvider").toString().trim();
            String member = body.get("hmoMemberNumber") == null ? "" : body.get("hmoMemberNumber").toString().trim();
            if (provider.isEmpty() || member.isEmpty()) {
                throw new ApiException(400, "Enter the HMO provider and the HMO member number.");
            }
            double covered = Bill.round(bill.getTotal() * percent / 100.0);
            bill.setHmoProvider(provider);
            bill.setHmoMemberNumber(member);
            bill.setHmoCoveragePercent(percent);
            bill.setHmoCoveredAmount(covered);
            bill.setClaimStatus("PENDING");
            request.setAttribute("auditDetail", "HMO set on bill " + id + ": " + provider
                    + " covers " + percent + "%");
        }

        bill.setHmoApprovedAmount(0);
        bill.setHmoApprovedPercent(0);
        bill.setClaimNote(null);
        bill.setClaimUpdatedAt(LocalDateTime.now());
        bill.recalculateStatus();
        return billRepository.save(bill);
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
}