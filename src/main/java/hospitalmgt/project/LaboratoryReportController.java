package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/laboratory/orders")
public class LaboratoryReportController {

    private final LaboratoryOrderRepository laboratoryOrderRepository;
    private final PatientRepository patientRepository;
    private final BillRepository billRepository;

    public LaboratoryReportController(LaboratoryOrderRepository laboratoryOrderRepository,
                                      PatientRepository patientRepository,
                                      BillRepository billRepository) {
        this.laboratoryOrderRepository = laboratoryOrderRepository;
        this.patientRepository = patientRepository;
        this.billRepository = billRepository;
    }

    /** The printable report of one completed laboratory order. */
    @GetMapping("/{id}/report")
    public Map<String, Object> report(@PathVariable String id, HttpServletRequest request) {
        LaboratoryOrder order = laboratoryOrderRepository.findById(id)
                .orElseThrow(() -> new ApiException(404, "Laboratory order not found."));

        checkAccess(order, request);

        if (!LaboratoryOrder.COMPLETED.equals(order.getStatus())) {
            throw new ApiException(409, "The report is only available once the order is completed.");
        }

        Patient patient = patientRepository.findById(order.getPatientId()).orElse(null);
        Bill bill = order.getBillId() == null ? null : billRepository.findById(order.getBillId()).orElse(null);

        String patientId = order.getPatientId() == null ? "" : order.getPatientId();
        String orderId = order.getId() == null ? "" : order.getId();

        List<Map<String, Object>> tests = new ArrayList<>();
        boolean hasCritical = false;
        for (LaboratoryOrder.LaboratoryOrderItem item : order.getItems()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("testName", item.getTestName());
            row.put("category", item.getCategory());
            row.put("specimenType", item.getSpecimenType());
            row.put("referenceRange", item.getReferenceRange());
            row.put("resultValue", item.getResultValue());
            row.put("resultUnit", item.getResultUnit());
            row.put("resultFlag", item.getResultFlag());
            row.put("resultComment", item.getResultComment());
            tests.add(row);
            if ("CRITICAL".equals(item.getResultFlag())) hasCritical = true;
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("hospital", "MediCore Hospital");
        result.put("reportNumber", "LAB-" + orderId.substring(Math.max(0, orderId.length() - 8)).toUpperCase());
        result.put("patientName", patient == null ? order.getPatientName() : patient.getName());
        result.put("patientCode", "MC-" + patientId.substring(Math.max(0, patientId.length() - 8)).toUpperCase());
        result.put("doctorName", order.getDoctorName());
        result.put("priority", order.getPriority());
        result.put("clinicalReason", order.getClinicalReason());
        result.put("orderedAt", order.getOrderedAt());
        result.put("collectedAt", order.getCollectedAt());
        result.put("completedAt", order.getCompletedAt());
        result.put("completedBy", order.getCompletedBy());
        result.put("labNotes", order.getLabNotes());
        result.put("tests", tests);
        result.put("hasCritical", hasCritical);
        result.put("billTotal", order.getTotalPrice());
        result.put("billStatus", bill == null ? "NOT_BILLED" : bill.getStatus());
        return result;
    }

    private void checkAccess(LaboratoryOrder order, HttpServletRequest request) {
        Object role = request.getAttribute("role");

        if ("PATIENT".equals(role)) {
            String own = (String) request.getAttribute("patientId");
            if (own == null || !own.equals(order.getPatientId())) {
                throw new ApiException(403, "You can only view your own laboratory reports.");
            }
        } else if ("DOCTOR".equals(role)) {
            String own = (String) request.getAttribute("doctorId");
            if (own == null || !own.equals(order.getDoctorId())) {
                throw new ApiException(403, "You can only view reports for tests you ordered.");
            }
        }
        // ADMIN and LAB_STAFF are allowed through by SecurityConfig
    }
}