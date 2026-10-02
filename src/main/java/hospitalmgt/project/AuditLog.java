package hospitalmgt.project;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/** One recorded action: who did what, and when. */
@Document(collection = "audit_logs")
public class AuditLog {

    @Id
    private String id;
    private LocalDateTime timestamp = LocalDateTime.now();
    private String username;
    private String role;
    private String category; // LOGIN, ACCOUNT, BILLING, DIAGNOSIS, PRESCRIPTION, PATIENT, ...
    private String detail;   // plain-English description of what happened
    private String method;
    private String path;
    private int status;
    private String ipAddress;

    public AuditLog() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }
    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }
    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
    public int getStatus() { return status; }
    public void setStatus(int status) { this.status = status; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
}