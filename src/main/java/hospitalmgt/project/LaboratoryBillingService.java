package hospitalmgt.project;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/** Creates the bill for a laboratory order: one line per test. Safe to call twice. */
@Service
public class LaboratoryBillingService {

    private final BillRepository billRepository;
    private final LaboratoryOrderRepository laboratoryOrderRepository;

    public LaboratoryBillingService(BillRepository billRepository,
                                    LaboratoryOrderRepository laboratoryOrderRepository) {
        this.billRepository = billRepository;
        this.laboratoryOrderRepository = laboratoryOrderRepository;
    }

    /** Returns the bill, or null when the order has nothing to charge for. */
    public Bill billOrder(LaboratoryOrder order) {
        if (order.getBillId() != null && !order.getBillId().isBlank()) {
            Bill existing = billRepository.findById(order.getBillId()).orElse(null);
            if (existing != null) return existing;
        }

        List<Bill.BillItem> items = new ArrayList<>();
        double total = 0;
        for (LaboratoryOrder.LaboratoryOrderItem item : order.getItems()) {
            double amount = Bill.round(item.getPrice());
            items.add(new Bill.BillItem("Laboratory - " + item.getTestName(), amount));
            total += amount;
        }
        total = Bill.round(total);
        if (total <= 0) return null;

        Bill bill = new Bill();
        bill.setPatientId(order.getPatientId());
        bill.setLaboratoryOrderId(order.getId());
        bill.setItems(items);
        bill.setTotal(total);
        bill.recalculateStatus();
        Bill saved = billRepository.save(bill);

        order.setBillId(saved.getId());
        laboratoryOrderRepository.save(order);
        return saved;
    }
}