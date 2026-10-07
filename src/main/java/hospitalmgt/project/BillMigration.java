package hospitalmgt.project;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;

/**
 * Runs at startup. Gives older bills the newer fields: payment records (so a receipt can be shown),
 * the HMO coverage percentage, and the new "HMO has paid" rule.
 */
@Component
public class BillMigration implements CommandLineRunner {

    private final BillRepository billRepository;

    public BillMigration(BillRepository billRepository) {
        this.billRepository = billRepository;
    }

    @Override
    public void run(String... args) {
        for (Bill bill : billRepository.findAll()) {
            boolean changed = false;

            if (bill.getClaimStatus() == null) {
                bill.setClaimStatus("NONE");
                changed = true;
            }
            if (bill.getPayments() == null) {
                bill.setPayments(new ArrayList<>());
                changed = true;
            }
            if ("PAID".equals(bill.getStatus()) && bill.getPayments().isEmpty() && bill.getAmountPaid() <= 0) {
                String suffix = bill.getId() == null ? "0000" : bill.getId().substring(Math.max(0, bill.getId().length() - 6));
                Bill.Payment payment = new Bill.Payment();
                payment.setReceiptNumber(bill.getTransactionId() != null ? bill.getTransactionId() : "OLD-" + suffix.toUpperCase());
                payment.setAmount(bill.getTotal());
                payment.setMethod("Demo");
                payment.setPaidAt(bill.getPaidAt() != null ? bill.getPaidAt() : (bill.getCreatedAt() != null ? bill.getCreatedAt() : LocalDateTime.now()));
                payment.setReceivedBy("system");
                payment.setBalanceAfter(0);
                bill.getPayments().add(payment);
                bill.setAmountPaid(bill.getTotal());
                changed = true;
            }

            // Bills made when HMO cover was a fixed amount: work out the percentage, then re-check the status
            if (bill.getHmoCoveredAmount() > 0) {
                if (bill.getHmoCoveragePercent() <= 0 && bill.getTotal() > 0) {
                    bill.setHmoCoveragePercent(Bill.round(bill.getHmoCoveredAmount() / bill.getTotal() * 100.0));
                    changed = true;
                }
                if ("PARTIALLY_APPROVED".equals(bill.getClaimStatus())
                        && bill.getHmoApprovedPercent() <= 0 && bill.getTotal() > 0) {
                    bill.setHmoApprovedPercent(Bill.round(bill.getHmoApprovedAmount() / bill.getTotal() * 100.0));
                    changed = true;
                }
                String before = bill.getStatus();
                bill.recalculateStatus();
                if (!before.equals(bill.getStatus())) changed = true;
            }

            if (changed) {
                billRepository.save(bill);
            }
        }
    }
}