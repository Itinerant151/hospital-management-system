package hospitalmgt.project;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Gives a brand new database a few wards and beds so the Wards screens are not empty. */
@Component
public class WardSeeder implements CommandLineRunner {

    private final WardRepository wardRepository;
    private final BedRepository bedRepository;

    public WardSeeder(WardRepository wardRepository, BedRepository bedRepository) {
        this.wardRepository = wardRepository;
        this.bedRepository = bedRepository;
    }

    @Override
    public void run(String... args) {
        if (wardRepository.count() > 0) return;

        seed("General Ward", "General", "Ground floor", 15000, "G", 8);
        seed("Private Ward", "Private", "First floor", 45000, "P", 4);
        seed("Maternity Ward", "Maternity", "First floor", 25000, "M", 6);
        seed("Intensive Care Unit", "Intensive care", "Second floor", 120000, "ICU", 3);
        System.out.println("Starter wards created.");
    }

    private void seed(String name, String type, String floor, double rate, String prefix, int beds) {
        Ward ward = new Ward();
        ward.setName(name);
        ward.setType(type);
        ward.setFloor(floor);
        ward.setDailyRate(rate);
        Ward saved = wardRepository.save(ward);

        for (int i = 1; i <= beds; i++) {
            Bed bed = new Bed();
            bed.setWardId(saved.getId());
            bed.setLabel(prefix + i);
            bedRepository.save(bed);
        }
    }
}