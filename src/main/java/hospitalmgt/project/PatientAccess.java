package hospitalmgt.project;

import jakarta.servlet.http.HttpServletRequest;

/** Who may see or write a patient's clinical information. */
public final class PatientAccess {

    private PatientAccess() {
    }

    /**
     * A doctor may work with patients assigned to them, and with emergency patients
     * (who often have no assigned doctor yet). Other roles are not restricted here.
     */
    public static void checkDoctorAccess(HttpServletRequest request, Patient patient) {
        if (!"DOCTOR".equals(request.getAttribute("role"))) return;

        String doctorId = (String) request.getAttribute("doctorId");
        boolean own = doctorId != null && doctorId.equals(patient.getDoctorId());
        if (!own && !patient.isEmergencyPatient()) {
            throw new ApiException(403, "You can only use patients assigned to you, or emergency patients.");
        }
    }
}