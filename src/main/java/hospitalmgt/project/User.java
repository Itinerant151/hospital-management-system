package hospitalmgt.project;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "users")
public class User {

    @Id
    private String id;
    private String username;
    @JsonIgnore
    private String password;
    private String role;
    private String email;
    private String patientId;
    private String doctorId;
    private boolean approved = true;
    private String requestedRole;
    private String fullName;
    private String phoneNumber;
    // true while the account still uses a password that staff set for the person
    private boolean temporaryPassword = false;
    // Existing accounts count as verified; new signups are set to false until they enter the emailed code
    private boolean emailVerified = true;

    // Professional licence details (doctors and laboratory staff).
    // All null for everyone else, and for accounts created before licence checks existed.
    private String licenceBody;       // MDCN, MLSCN, NMCN, PCN or OTHER
    private String licenceNumber;
    private String licenceExpiry;     // yyyy-MM-dd
    private String licenceStatus;     // PENDING, VERIFIED or REJECTED
    private String licenceCheckedBy;  // the admin who checked it on the official register
    private String licenceCheckedAt;  // date and time of that check
    private String licenceNote;

    public User() {}

    public User(String username, String password, String role) {
        this.username = username;
        this.password = password;
        this.role = role;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }
    public boolean isApproved() { return approved; }
    public void setApproved(boolean approved) { this.approved = approved; }
    public String getRequestedRole() { return requestedRole; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public void setRequestedRole(String requestedRole) { this.requestedRole = requestedRole; }
    public boolean isTemporaryPassword() { return temporaryPassword; }
    public void setTemporaryPassword(boolean temporaryPassword) { this.temporaryPassword = temporaryPassword; }
    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }

    public String getLicenceBody() { return licenceBody; }
    public void setLicenceBody(String licenceBody) { this.licenceBody = licenceBody; }
    public String getLicenceNumber() { return licenceNumber; }
    public void setLicenceNumber(String licenceNumber) { this.licenceNumber = licenceNumber; }
    public String getLicenceExpiry() { return licenceExpiry; }
    public void setLicenceExpiry(String licenceExpiry) { this.licenceExpiry = licenceExpiry; }
    public String getLicenceStatus() { return licenceStatus; }
    public void setLicenceStatus(String licenceStatus) { this.licenceStatus = licenceStatus; }
    public String getLicenceCheckedBy() { return licenceCheckedBy; }
    public void setLicenceCheckedBy(String licenceCheckedBy) { this.licenceCheckedBy = licenceCheckedBy; }
    public String getLicenceCheckedAt() { return licenceCheckedAt; }
    public void setLicenceCheckedAt(String licenceCheckedAt) { this.licenceCheckedAt = licenceCheckedAt; }
    public String getLicenceNote() { return licenceNote; }
    public void setLicenceNote(String licenceNote) { this.licenceNote = licenceNote; }
}