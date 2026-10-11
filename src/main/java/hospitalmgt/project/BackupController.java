package hospitalmgt.project;

import org.bson.Document;
import org.bson.json.JsonMode;
import org.bson.json.JsonWriterSettings;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;

@RestController
@RequestMapping("/api/backup")
public class BackupController {

    private final MongoTemplate mongo;

    public BackupController(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    // Admin only: your SecurityConfig already makes every unlisted path admin-only
    @GetMapping("/export")
    public ResponseEntity<byte[]> export() {
        JsonWriterSettings settings = JsonWriterSettings.builder()
                .outputMode(JsonMode.RELAXED)
                .build();

        List<String> collectionJson = new ArrayList<>();
        for (String name : new TreeSet<>(mongo.getCollectionNames())) {
            List<String> rows = new ArrayList<>();
            for (Document d : mongo.findAll(Document.class, name)) {
                // Never export password hashes or reset/verification tokens
                d.keySet().removeIf(k ->
                        k.equalsIgnoreCase("password") || k.toLowerCase().contains("token"));
                rows.add(d.toJson(settings));
            }
            collectionJson.add("\"" + name + "\":[" + String.join(",", rows) + "]");
        }

        String json = "{\"exportedAt\":\"" + Instant.now() + "\","
                + "\"database\":\"" + mongo.getDb().getName() + "\","
                + "\"collections\":{" + String.join(",", collectionJson) + "}}";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"medicore-export.json\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(json.getBytes(StandardCharsets.UTF_8));
    }
}