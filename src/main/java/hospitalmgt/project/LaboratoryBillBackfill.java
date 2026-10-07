package hospitalmgt.project;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** On startup, bills any laboratory order that was created before laboratory billing existed. */
@Component
public class LaboratoryBillBackfill implements CommandLineRunner {

    private final LaboratoryOrderRepository laboratoryOrderRepository;
    private final LaboratoryBillingService laboratoryBillingService;

    public LaboratoryBillBackfill(LaboratoryOrderRepository laboratoryOrderRepository,
                                  LaboratoryBillingService laboratoryBillingService) {
        this.laboratoryOrderRepository = laboratoryOrderRepository;
        this.laboratoryBillingService = laboratoryBillingService;
    }

    @Override
    public void run(String... args) {
        try {
            for (LaboratoryOrder order : laboratoryOrderRepository.findAll()) {
                if (order.getBillId() == null || order.getBillId().isBlank()) {
                    laboratoryBillingService.billOrder(order);
                }
            }
        } catch (Exception e) {
            System.out.println("Laboratory bill backfill skipped: " + e.getMessage());
        }
    }
}