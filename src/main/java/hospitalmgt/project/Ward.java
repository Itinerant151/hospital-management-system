package hospitalmgt.project;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "wards")
public class Ward {

    @Id
    private String id;
    private String name;
    private String type;        // General, Private, Maternity, Intensive care, ...
    private String floor;       // free text, for example "Ground floor"
    private double dailyRate;   // charge per bed per 24 hours
    private LocalDateTime createdAt = LocalDateTime.now();

    public Ward() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getFloor() { return floor; }
    public void setFloor(String floor) { this.floor = floor; }
    public double getDailyRate() { return dailyRate; }
    public void setDailyRate(double dailyRate) { this.dailyRate = dailyRate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}