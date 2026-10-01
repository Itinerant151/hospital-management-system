package hospitalmgt.project;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/bills")
public class BillController {

    @Autowired
    private BillRepository billRepository;

    @GetMapping
    public List<Bill> getAll() {
        return billRepository.findAll();
    }

    @GetMapping("/patient/{patientId}")
    public List<Bill> getByPatient(@PathVariable String patientId) {
        return billRepository.findByPatientId(patientId);
    }

    @GetMapping("/mine")
    public List<Bill> getMine(HttpServletRequest request) {
        String patientId = (String) request.getAttribute("patientId");

        if (patientId == null) {
            throw new ApiException(
                    400,
                    "No patient record is linked to this account."
            );
        }

        return billRepository.findByPatientId(patientId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Bill> getOne(@PathVariable String id) {
        return billRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Bill create(@RequestBody Bill bill) {

        double total = bill.getItems() == null
                ? 0
                : bill.getItems()
                .stream()
                .mapToDouble(Bill.BillItem::getAmount)
                .sum();

        bill.setTotal(total);
        bill.setStatus("PENDING");
        bill.setPaymentMethod(null);
        bill.setPatientPayableAmount(total);

        return billRepository.save(bill);
    }

    @PostMapping("/{id}/pay")
    public ResponseEntity<Bill> payDemo(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request
    ) {

        return billRepository.findById(id)
                .map(bill -> {

                    String role = (String) request.getAttribute("role");

                    if ("PATIENT".equals(role)) {

                        String ownPatientId =
                                (String) request.getAttribute("patientId");

                        if (
                                ownPatientId == null ||
                                        !ownPatientId.equals(bill.getPatientId())
                        ) {
                            throw new ApiException(
                                    403,
                                    "You can only pay your own bills."
                            );
                        }
                    }

                    String paymentMethod =
                            body == null
                                    ? "PATIENT"
                                    : String.valueOf(
                                    body.getOrDefault(
                                            "paymentMethod",
                                            "PATIENT"
                                    )
                            );

                    if (
                            !"PATIENT".equals(paymentMethod) &&
                                    !"HMO".equals(paymentMethod)
                    ) {
                        throw new ApiException(
                                400,
                                "Invalid payment method."
                        );
                    }

                    if ("HMO".equals(paymentMethod)) {

                        String provider =
                                body == null
                                        ? ""
                                        : String.valueOf(
                                        body.getOrDefault(
                                                "hmoProvider",
                                                ""
                                        )
                                ).trim();

                        String memberNumber =
                                body == null
                                        ? ""
                                        : String.valueOf(
                                        body.getOrDefault(
                                                "hmoMemberNumber",
                                                ""
                                        )
                                ).trim();

                        double coveredAmount;

                        try {
                            coveredAmount =
                                    body == null
                                            ? 0
                                            : Double.parseDouble(
                                            String.valueOf(
                                                    body.getOrDefault(
                                                            "hmoCoveredAmount",
                                                            "0"
                                                    )
                                            )
                                    );
                        } catch (NumberFormatException ex) {
                            throw new ApiException(
                                    400,
                                    "HMO covered amount must be a valid number."
                            );
                        }

                        if (provider.isBlank() || memberNumber.isBlank()) {
                            throw new ApiException(
                                    400,
                                    "HMO provider and member number are required."
                            );
                        }

                        if (
                                coveredAmount <= 0 ||
                                        coveredAmount > bill.getTotal()
                        ) {
                            throw new ApiException(
                                    400,
                                    "HMO covered amount must be greater than 0 and not exceed the bill total."
                            );
                        }

                        bill.setPaymentMethod("HMO");
                        bill.setHmoProvider(provider);
                        bill.setHmoMemberNumber(memberNumber);
                        bill.setHmoCoveredAmount(coveredAmount);

                        bill.setPatientPayableAmount(
                                Math.max(
                                        0,
                                        bill.getTotal() - coveredAmount
                                )
                        );

                    } else {

                        bill.setPaymentMethod("PATIENT");

                        double patientAmount =
                                bill.getPatientPayableAmount() > 0
                                        ? bill.getPatientPayableAmount()
                                        : bill.getTotal();

                        bill.setPatientPayableAmount(patientAmount);
                    }

                    boolean hmoPayment =
                            "HMO".equals(paymentMethod);

                    if (
                            hmoPayment &&
                                    bill.getHmoCoveredAmount() < bill.getTotal()
                    ) {
                        bill.setStatus("PARTIALLY_PAID");
                    } else {
                        bill.setStatus("PAID");
                    }

                    bill.setPaymentReminderSent(true);

                    bill.setTransactionId(
                            (hmoPayment ? "HMO-" : "DEMO-") +
                                    UUID.randomUUID()
                                            .toString()
                                            .substring(0, 8)
                                            .toUpperCase()
                    );

                    bill.setPaidAt(LocalDateTime.now());

                    return ResponseEntity.ok(
                            billRepository.save(bill)
                    );
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        billRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}