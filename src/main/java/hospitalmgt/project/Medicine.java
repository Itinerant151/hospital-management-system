package hospitalmgt.project;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.List;

@Document(collection = "medicines")
public class Medicine {

    public static final List<String> CATEGORIES = List.of(
            "Antibiotics", "Anaesthetics", "Analgesics", "Antimalarials", "Antihypertensives",
            "Antidiabetics", "Antihistamines", "Antifungals", "Vitamins & Supplements",
            "IV Fluids", "Others");

    // Shown for medicines that were added before categories existed
    public static final String UNCATEGORISED = "Uncategorised";

    // A medicine with fewer units than this counts as low on stock
    public static final int LOW_STOCK_LIMIT = 10;

    @Id
    private String id;

    private String name;
    private String category;
    private int stockQuantity;
    private double price;
    private LocalDate expiryDate;

    public Medicine() {}

    public static String categoryOf(Medicine m) {
        return m.getCategory() == null || m.getCategory().isBlank() ? UNCATEGORISED : m.getCategory();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public int getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(int stockQuantity) { this.stockQuantity = stockQuantity; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }
}