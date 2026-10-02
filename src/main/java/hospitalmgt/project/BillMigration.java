package hospitalmgt.project;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;

/**
 * Runs at startup. Gives bills created before HMO and partial payments existed
 * the new fields, and a payment record (so a receipt can be shown) if they were already paid.
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

            if (changed) {
                billRepository.save(bill);
            }
        }
    }
}