package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/laboratory/orders")
public class LaboratoryOrderController {

    private static final List<String> FLAGS =
            List.of("NORMAL", "LOW", "HIGH", "CRITICAL", "ABNORMAL");

    private final LaboratoryOrderRepository laboratoryOrderRepository;
    private final LaboratoryTestRepository laboratoryTestRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    public LaboratoryOrderController(
            LaboratoryOrderRepository laboratoryOrderRepository,
            LaboratoryTestRepository laboratoryTestRepository,
            PatientRepository patientRepository,
            DoctorRepository doctorRepository
    ) {
        this.laboratoryOrderRepository = laboratoryOrderRepository;
        this.laboratoryTestRepository = laboratoryTestRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
    }

    // ---------- doctor side ----------

    @GetMapping("/mine")
    public List<LaboratoryOrder> getMyOrders(
            HttpServletRequest request
    ) {
        String doctorId = getDoctorId(request);

        return laboratoryOrderRepository
                .findByDoctorIdOrderByOrderedAtDesc(doctorId);
    }

    @PostMapping
    public LaboratoryOrder createOrder(
            @RequestBody Map<String, Object> body,
            HttpServletRequest request
    ) {
        String doctorId = getDoctorId(request);

        String patientId = requiredText(
                body,
                "patientId",
                "Please select a patient."
        );

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() ->
                        new ApiException(
                                404,
                                "Patient not found."
                        )
                );

        /*
         * Important security check:
         * A doctor can only order laboratory tests for a patient
         * assigned to that doctor.
         */
        if (patient.getDoctorId() == null
                || !patient.getDoctorId().equals(doctorId)) {

            throw new ApiException(
                    403,
                    "You can only order laboratory tests for your own patients."
            );
        }

        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() ->
                        new ApiException(
                                404,
                                "Doctor record not found."
                        )
                );

        Object rawItems = body.get("items");

        if (!(rawItems instanceof List<?> requestedItems)
                || requestedItems.isEmpty()) {

            throw new ApiException(
                    400,
                    "Select at least one laboratory test."
            );
        }

        List<LaboratoryOrder.LaboratoryOrderItem> orderItems =
                new ArrayList<>();

        double totalPrice = 0;

        for (Object rawItem : requestedItems) {

            if (!(rawItem instanceof Map<?, ?> itemMap)) {
                throw new ApiException(
                        400,
                        "Invalid laboratory test selection."
                );
            }

            Object rawTestId = itemMap.get("testId");

            if (rawTestId == null
                    || String.valueOf(rawTestId).isBlank()) {

                throw new ApiException(
                        400,
                        "Every laboratory order item must contain a test."
                );
            }

            String testId = String.valueOf(rawTestId);

            LaboratoryTest test = laboratoryTestRepository
                    .findById(testId)
                    .orElseThrow(() ->
                            new ApiException(
                                    404,
                                    "One of the selected laboratory tests no longer exists."
                            )
                    );

            if (!test.isActive()) {
                throw new ApiException(
                        400,
                        "The laboratory test '" +
                                test.getTestName() +
                                "' is currently inactive."
                );
            }

            LaboratoryOrder.LaboratoryOrderItem orderItem =
                    new LaboratoryOrder.LaboratoryOrderItem();

            orderItem.setTestId(test.getId());
            orderItem.setTestName(test.getTestName());
            orderItem.setCategory(test.getCategory());
            orderItem.setSpecimenType(test.getSpecimenType());
            orderItem.setReferenceRange(test.getReferenceRange());
            orderItem.setPrice(test.getPrice());

            orderItems.add(orderItem);

            totalPrice += test.getPrice();
        }

        String priority = optionalText(body, "priority");

        if (!priority.equals("NORMAL")
                && !priority.equals("URGENT")) {

            priority = "NORMAL";
        }

        LaboratoryOrder order = new LaboratoryOrder();

        order.setPatientId(patient.getId());
        order.setPatientName(patient.getName());

        order.setDoctorId(doctor.getId());
        order.setDoctorName(doctor.getName());

        order.setItems(orderItems);

        order.setClinicalReason(
                optionalText(body, "clinicalReason")
        );

        order.setNotes(
                optionalText(body, "notes")
        );

        order.setPriority(priority);
        order.setStatus(LaboratoryOrder.PENDING);

        order.setTotalPrice(totalPrice);

        LocalDateTime now = LocalDateTime.now();

        order.setOrderedAt(now);
        order.setUpdatedAt(now);

        LaboratoryOrder saved =
                laboratoryOrderRepository.save(order);

        request.setAttribute(
                "auditDetail",
                "Laboratory order created for patient "
                        + patient.getName()
                        + " by Dr. "
                        + doctor.getName()
        );

        return saved;
    }

    // ---------- patient side ----------

    /** Patient: my own laboratory orders. Results are only shown once an order is completed. */
    @GetMapping("/my-results")
    public List<LaboratoryOrder> getMyResults(HttpServletRequest request) {

        String patientId = (String) request.getAttribute("patientId");

        if (patientId == null || patientId.isBlank()) {
            throw new ApiException(
                    401,
                    "Your account is not linked to a patient record."
            );
        }

        List<LaboratoryOrder> orders =
                laboratoryOrderRepository.findByPatientIdOrderByOrderedAtDesc(patientId);

        // These changes are never saved: they only hide unfinished results from the response
        for (LaboratoryOrder order : orders) {
            if (LaboratoryOrder.COMPLETED.equals(order.getStatus())) {
                continue;
            }

            order.setLabNotes(null);

            for (LaboratoryOrder.LaboratoryOrderItem item : order.getItems()) {
                item.setResultValue(null);
                item.setResultUnit(null);
                item.setResultFlag(null);
                item.setResultComment(null);
                item.setResultEnteredAt(null);
                item.setResultEnteredBy(null);
            }
        }

        return orders;
    }

    // ---------- laboratory side ----------

    /**
     * The laboratory queue. Open orders come first (urgent ones on top, then oldest first),
     * followed by completed orders, newest first.
     */
    @GetMapping
    public List<LaboratoryOrder> getQueue() {

        List<LaboratoryOrder> open = new ArrayList<>();
        List<LaboratoryOrder> done = new ArrayList<>();

        for (LaboratoryOrder order : laboratoryOrderRepository.findAll()) {
            if (LaboratoryOrder.COMPLETED.equals(order.getStatus())) {
                done.add(order);
            } else {
                open.add(order);
            }
        }

        open.sort(
                Comparator
                        .comparing((LaboratoryOrder o) -> "URGENT".equals(o.getPriority()) ? 0 : 1)
                        .thenComparing(
                                LaboratoryOrder::getOrderedAt,
                                Comparator.nullsLast(Comparator.<LocalDateTime>naturalOrder())
                        )
        );

        done.sort(
                Comparator.comparing(
                        LaboratoryOrder::getCompletedAt,
                        Comparator.nullsLast(Comparator.<LocalDateTime>reverseOrder())
                )
        );

        List<LaboratoryOrder> result = new ArrayList<>(open);
        result.addAll(done);

        return result;
    }

    /** Step 1: the specimen has been taken from the patient. */
    @PutMapping("/{id}/collect")
    public LaboratoryOrder collectSpecimen(
            @PathVariable String id,
            HttpServletRequest request
    ) {
        LaboratoryOrder order = findOrder(id);

        if (!LaboratoryOrder.PENDING.equals(order.getStatus())) {
            throw new ApiException(
                    409,
                    "The specimen for this order has already been collected."
            );
        }

        LocalDateTime now = LocalDateTime.now();

        order.setStatus(LaboratoryOrder.COLLECTED);
        order.setCollectedAt(now);
        order.setCollectedBy(currentUsername(request));
        order.setUpdatedAt(now);

        LaboratoryOrder saved = laboratoryOrderRepository.save(order);

        request.setAttribute(
                "auditDetail",
                "Specimen collected for " + order.getPatientName()
                        + "'s laboratory order"
        );

        return saved;
    }

    /**
     * Step 2: enter or update results. Results can be saved as a draft any number of times
     * until the order is completed. A blank result value clears that test's result.
     */
    @PutMapping("/{id}/results")
    public LaboratoryOrder saveResults(
            @PathVariable String id,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request
    ) {
        LaboratoryOrder order = findOrder(id);

        if (LaboratoryOrder.COMPLETED.equals(order.getStatus())) {
            throw new ApiException(
                    409,
                    "This order is already completed. Its results can no longer be changed."
            );
        }

        if (LaboratoryOrder.PENDING.equals(order.getStatus())) {
            throw new ApiException(
                    409,
                    "Collect the specimen before entering results."
            );
        }

        Object rawItems = body.get("items");

        if (!(rawItems instanceof List<?> sent)) {
            throw new ApiException(400, "No results were sent.");
        }

        String username = currentUsername(request);
        LocalDateTime now = LocalDateTime.now();

        for (Object raw : sent) {

            if (!(raw instanceof Map<?, ?> map)) {
                throw new ApiException(400, "Invalid result entry.");
            }

            String testId = text(map.get("testId"));

            LaboratoryOrder.LaboratoryOrderItem item = order.getItems().stream()
                    .filter(i -> testId.equals(i.getTestId()))
                    .findFirst()
                    .orElseThrow(() ->
                            new ApiException(
                                    400,
                                    "A result was sent for a test that is not part of this order."
                            )
                    );

            String value = limit(text(map.get("resultValue")), 200);

            if (value.isBlank()) {
                item.setResultValue(null);
                item.setResultUnit(null);
                item.setResultFlag(null);
                item.setResultComment(null);
                item.setResultEnteredAt(null);
                item.setResultEnteredBy(null);
                continue;
            }

            String flag = text(map.get("resultFlag")).toUpperCase();

            if (flag.isBlank()) {
                flag = "NORMAL";
            }

            if (!FLAGS.contains(flag)) {
                throw new ApiException(
                        400,
                        "Result flag must be Normal, Low, High, Critical or Abnormal."
                );
            }

            item.setResultValue(value);
            item.setResultUnit(limit(text(map.get("resultUnit")), 50));
            item.setResultFlag(flag);
            item.setResultComment(limit(text(map.get("resultComment")), 500));
            item.setResultEnteredAt(now);
            item.setResultEnteredBy(username);
        }

        if (body.containsKey("labNotes")) {
            order.setLabNotes(limit(text(body.get("labNotes")), 1000));
        }

        order.setStatus(LaboratoryOrder.IN_PROGRESS);
        order.setUpdatedAt(now);

        LaboratoryOrder saved = laboratoryOrderRepository.save(order);

        request.setAttribute(
                "auditDetail",
                "Laboratory results saved for " + order.getPatientName()
        );

        return saved;
    }

    /** Step 3: every test has a result, so the order is finished and locked. */
    @PutMapping("/{id}/complete")
    public LaboratoryOrder completeOrder(
            @PathVariable String id,
            HttpServletRequest request
    ) {
        LaboratoryOrder order = findOrder(id);

        if (LaboratoryOrder.COMPLETED.equals(order.getStatus())) {
            throw new ApiException(409, "This order is already completed.");
        }

        if (LaboratoryOrder.PENDING.equals(order.getStatus())) {
            throw new ApiException(
                    409,
                    "Collect the specimen and enter results first."
            );
        }

        List<String> missing = new ArrayList<>();

        for (LaboratoryOrder.LaboratoryOrderItem item : order.getItems()) {
            if (item.getResultValue() == null
                    || item.getResultValue().isBlank()) {
                missing.add(item.getTestName());
            }
        }

        if (!missing.isEmpty()) {
            throw new ApiException(
                    400,
                    "Enter a result for every test before completing the order. Missing: "
                            + String.join(", ", missing)
            );
        }

        LocalDateTime now = LocalDateTime.now();

        order.setStatus(LaboratoryOrder.COMPLETED);
        order.setCompletedAt(now);
        order.setCompletedBy(currentUsername(request));
        order.setUpdatedAt(now);

        LaboratoryOrder saved = laboratoryOrderRepository.save(order);

        request.setAttribute(
                "auditDetail",
                "Laboratory order completed for " + order.getPatientName()
        );

        return saved;
    }

    // ---------- helpers ----------

    private LaboratoryOrder findOrder(String id) {
        return laboratoryOrderRepository.findById(id)
                .orElseThrow(() ->
                        new ApiException(
                                404,
                                "Laboratory order not found."
                        )
                );
    }

    private String currentUsername(HttpServletRequest request) {
        Object username = request.getAttribute("username");

        return username == null ? "" : username.toString();
    }

    private String getDoctorId(HttpServletRequest request) {

        String doctorId =
                (String) request.getAttribute("doctorId");

        if (doctorId == null || doctorId.isBlank()) {

            throw new ApiException(
                    401,
                    "Your doctor account is not linked to a doctor record."
            );
        }

        return doctorId;
    }

    private String text(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String limit(String value, int max) {
        return value.length() > max ? value.substring(0, max) : value;
    }

    private String requiredText(
            Map<String, Object> body,
            String key,
            String message
    ) {
        String value = optionalText(body, key);

        if (value.isBlank()) {
            throw new ApiException(
                    400,
                    message
            );
        }

        return value;
    }

    private String optionalText(
            Map<String, Object> body,
            String key
    ) {
        Object value = body.get(key);

        if (value == null) {
            return "";
        }

        return String.valueOf(value).trim();
    }
}