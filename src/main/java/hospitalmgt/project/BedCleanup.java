package hospitalmgt.project;

import org.bson.Document;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;

/**
 * Runs at startup. Removes beds whose ward no longer exists (left behind when wards were recreated).
 * Only unused (AVAILABLE) beds are removed, and nothing is removed while there are no wards at all.
 */
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class BedCleanup implements CommandLineRunner {

    private final MongoTemplate mongo;

    public BedCleanup(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    @Override
    public void run(String... args) {
        Set<String> wardIds = new HashSet<>();
        for (Document w : mongo.findAll(Document.class, "wards")) {
            wardIds.add(String.valueOf(w.get("_id")));
        }
        if (wardIds.isEmpty()) return;

        int removed = 0;
        int kept = 0;
        for (Document b : mongo.findAll(Document.class, "beds")) {
            if (wardIds.contains(String.valueOf(b.get("wardId")))) continue;
            if ("AVAILABLE".equalsIgnoreCase(String.valueOf(b.get("status")))) {
                mongo.remove(Query.query(Criteria.where("_id").is(b.get("_id"))), "beds");
                removed++;
            } else {
                kept++;
            }
        }
        if (removed > 0 || kept > 0) {
            System.out.println("Bed cleanup: removed " + removed + " unused beds with no ward"
                    + (kept > 0 ? ", left " + kept + " in-use beds for review" : ""));
        }
    }
}