package hospitalmgt.project;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Validates visiting schedules and checks that a booking falls inside one. */
@Service
public class VisitingScheduleService {

    public static final List<String> DAYS = List.of(
            "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY");

    // Visiting hours are on the hour, the same grid the booking screens use
    public static final List<String> HOURS = List.of(
            "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00");

    private final VisitingDoctorRepository repository;

    public VisitingScheduleService(VisitingDoctorRepository repository) {
        this.repository = repository;
    }

    /** Turns the schedule sent by the browser into clean slots, or throws a 400 with a clear message. */
    public List<VisitingDoctor.ScheduleSlot> cleanSchedule(Object raw) {
        if (!(raw instanceof List<?> list) || list.isEmpty()) {
            throw new ApiException(400, "Add at least one visiting day to the weekly schedule.");
        }

        Map<String, VisitingDoctor.ScheduleSlot> byDay = new HashMap<>();
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> map)) {
                throw new ApiException(400, "Each schedule entry needs a day, a start time and an end time.");
            }
            String day = text(map.get("day")).toUpperCase();
            String start = text(map.get("startTime"));
            String end = text(map.get("endTime"));

            if (!DAYS.contains(day)) {
                throw new ApiException(400, "Unknown day in the schedule.");
            }
            if (!HOURS.contains(start) || !HOURS.contains(end)) {
                throw new ApiException(400, "Visiting hours must be on the hour, between 09:00 and 18:00.");
            }
            if (start.compareTo(end) >= 0) {
                throw new ApiException(400, label(day) + ": the end time must be later than the start time.");
            }
            if (byDay.containsKey(day)) {
                throw new ApiException(400, label(day) + " appears twice. Use one visiting window per day.");
            }
            byDay.put(day, new VisitingDoctor.ScheduleSlot(day, start, end));
        }

        List<VisitingDoctor.ScheduleSlot> result = new ArrayList<>(byDay.values());
        result.sort((a, b) -> Integer.compare(DAYS.indexOf(a.getDay()), DAYS.indexOf(b.getDay())));
        return result;
    }

    /**
     * Throws if the doctor is a visiting doctor and the date and time are outside the weekly schedule.
     * Regular doctors are never restricted.
     */
    public void checkBooking(String doctorId, String appointmentDate) {
        VisitingDoctor visiting = repository.findByDoctorId(doctorId);
        if (visiting == null) return;

        if (!visiting.isActive()) {
            throw new ApiException(409, "This visiting doctor is not taking bookings right now.");
        }

        LocalDateTime when;
        try {
            when = LocalDateTime.parse(appointmentDate);
        } catch (DateTimeParseException e) {
            throw new ApiException(400, "Enter a valid date and time.");
        }

        String day = when.getDayOfWeek().name();
        String time = String.format("%02d:%02d", when.getHour(), when.getMinute());

        boolean inside = visiting.getSchedule().stream().anyMatch(slot ->
                slot.getDay().equals(day)
                        && time.compareTo(slot.getStartTime()) >= 0
                        && time.compareTo(slot.getEndTime()) < 0);

        if (!inside) {
            throw new ApiException(400, "That time is outside the doctor's visiting schedule ("
                    + describe(visiting.getSchedule()) + ").");
        }
    }

    public String describe(List<VisitingDoctor.ScheduleSlot> schedule) {
        List<String> parts = new ArrayList<>();
        for (VisitingDoctor.ScheduleSlot slot : schedule) {
            parts.add(label(slot.getDay()).substring(0, 3) + " " + slot.getStartTime() + "-" + slot.getEndTime());
        }
        return String.join(", ", parts);
    }

    private String label(String day) {
        return day.charAt(0) + day.substring(1).toLowerCase();
    }

    private String text(Object value) {
        return value == null ? "" : value.toString().trim();
    }
}