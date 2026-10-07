package hospitalmgt.project;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "beds")
public class Bed {

    @Id
    private String id;
    private String wardId;
    private String label;        // for example "A3"
    private String status = "AVAILABLE"; // AVAILABLE, OCCUPIED or MAINTENANCE
    private String admissionId;  // set while the bed is occupied

    public Bed() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getWardId() { return wardId; }
    public void setWardId(String wardId) { this.wardId = wardId; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getAdmissionId() { return admissionId; }
    public void setAdmissionId(String admissionId) { this.admissionId = admissionId; }
}