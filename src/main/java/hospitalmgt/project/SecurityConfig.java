package hospitalmgt.project;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", config);

        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http
    ) throws Exception {

        http
                .cors(cors ->
                        cors.configurationSource(
                                corsConfigurationSource()
                        )
                )
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm ->
                        sm.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/login", "/signup", "/forgot-password", "/reset-password").permitAll()
                        .requestMatchers("/account/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/admin/receptionist-requests").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/admin/receptionist-requests/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/admin/receptionist-requests/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/visiting-doctors/earnings/mine").hasRole("DOCTOR")
                        .requestMatchers(HttpMethod.GET, "/api/visiting-doctors/earnings").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/visiting-doctors/mine").hasRole("DOCTOR")
                        .requestMatchers(HttpMethod.GET, "/api/visiting-doctors").hasAnyRole("DOCTOR", "PATIENT", "ADMIN", "RECEPTIONIST")
                        .requestMatchers("/api/visiting-doctors/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/wards/**").hasAnyRole("ADMIN", "RECEPTIONIST", "DOCTOR")
                        .requestMatchers(HttpMethod.PUT, "/api/wards/beds/*/status").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers("/api/wards/**").hasRole("ADMIN")

                        /*
                         * Laboratory test catalogue
                         */
                        .requestMatchers(HttpMethod.GET, "/api/laboratory/tests").hasAnyRole("ADMIN", "RECEPTIONIST", "DOCTOR", "LAB_STAFF")
                        .requestMatchers(HttpMethod.GET, "/api/laboratory/tests/active").hasAnyRole("ADMIN", "RECEPTIONIST", "DOCTOR")
                        .requestMatchers(HttpMethod.POST, "/api/laboratory/tests").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/laboratory/tests/*/status").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/laboratory/tests/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/laboratory/tests/*").hasRole("ADMIN")

                        /*
                         * Laboratory orders: doctor, patient and laboratory staff
                         */
                        .requestMatchers(HttpMethod.GET, "/api/laboratory/orders/mine").hasRole("DOCTOR")
                        .requestMatchers(HttpMethod.GET, "/api/laboratory/orders/my-results").hasRole("PATIENT")
                        .requestMatchers(HttpMethod.POST, "/api/laboratory/orders").hasRole("DOCTOR")
                        .requestMatchers(HttpMethod.GET, "/api/laboratory/orders").hasAnyRole("LAB_STAFF", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/laboratory/orders/*/collect").hasRole("LAB_STAFF")
                        .requestMatchers(HttpMethod.PUT, "/api/laboratory/orders/*/results").hasRole("LAB_STAFF")
                        .requestMatchers(HttpMethod.PUT, "/api/laboratory/orders/*/complete").hasRole("LAB_STAFF")

                        /*
                         * Keep all other laboratory endpoints protected.
                         */
                        .requestMatchers("/api/laboratory/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/admissions/mine").hasRole("PATIENT")
                        .requestMatchers(HttpMethod.GET, "/api/admissions/**").hasAnyRole("ADMIN", "RECEPTIONIST", "DOCTOR")
                        .requestMatchers(HttpMethod.POST, "/api/admissions/**").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.PUT, "/api/admissions/**").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers("/api/admissions/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/doctors/**").hasAnyRole("DOCTOR", "PATIENT", "ADMIN", "RECEPTIONIST")
                        .requestMatchers("/doctors/**").hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/patients/me").hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/patients/me").hasRole("PATIENT")
                        .requestMatchers(HttpMethod.GET, "/patients").hasAnyRole("ADMIN", "DOCTOR", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.GET, "/patients/emergency").hasAnyRole("DOCTOR", "ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.POST, "/patients/emergency").hasAnyRole("DOCTOR", "ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.GET, "/patients/by-doctor/**").hasAnyRole("DOCTOR", "ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.GET, "/patients/*/account").hasAnyRole("DOCTOR", "ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.POST, "/patients/*/account").hasAnyRole("DOCTOR", "ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.PUT, "/patients/*/assign-doctor").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.GET, "/patients/*").hasAnyRole("ADMIN", "DOCTOR", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.PUT, "/patients/*/medical-profile").hasAnyRole("DOCTOR", "ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.PUT, "/patients/*/diagnosis").hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers("/patients/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/appointments/availability").hasAnyRole("PATIENT", "DOCTOR", "ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.GET, "/appointments/mine").hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/appointments").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.POST, "/appointments").hasAnyRole("PATIENT", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.DELETE, "/appointments/**").hasAnyRole("PATIENT", "ADMIN", "RECEPTIONIST")
                        .requestMatchers("/appointments/**").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.GET, "/api/reminders/inbox/**").hasAnyRole("PATIENT", "DOCTOR", "ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.PUT, "/api/reminders/*/read").hasAnyRole("PATIENT", "DOCTOR", "ADMIN", "RECEPTIONIST")
                        .requestMatchers("/api/reminders/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/bills/mine").hasRole("PATIENT")
                        .requestMatchers(HttpMethod.GET, "/api/bills/patient/**").hasAnyRole("PATIENT", "DOCTOR", "ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.GET, "/api/bills").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.POST, "/api/bills/*/pay").hasAnyRole("PATIENT", "ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.PUT, "/api/bills/*/claim").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.POST, "/api/bills/*/hmo-pay").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.GET, "/api/bills/*/hmo-receipt").hasAnyRole("PATIENT", "ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.GET, "/api/bills/*/receipt").hasAnyRole("PATIENT", "ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.POST, "/api/bills").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.DELETE, "/api/bills/**").hasRole("ADMIN")
                        .requestMatchers("/api/bills/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/medicines").hasAnyRole("ADMIN", "DOCTOR")
                        .requestMatchers("/api/medicines/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/prescriptions/mine").hasAnyRole("PATIENT", "DOCTOR")
                        .requestMatchers(HttpMethod.POST, "/api/prescriptions").hasRole("DOCTOR")
                        .requestMatchers(HttpMethod.PUT, "/api/prescriptions/*").hasRole("DOCTOR")
                        .requestMatchers(HttpMethod.GET, "/api/prescriptions/patient/**").hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers("/api/prescriptions/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/statistics/me").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/dashboard/me").authenticated()
                        .requestMatchers("/api/statistics/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/diagnoses/*").hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/diagnoses/*").hasRole("DOCTOR")
                        .requestMatchers(HttpMethod.GET, "/api/timeline/mine").hasRole("PATIENT")
                        .requestMatchers(HttpMethod.GET, "/api/timeline/patient/*").hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers("/api/audit/**").hasRole("ADMIN")
                        .requestMatchers("/api/admin/export").hasRole("ADMIN")
                        .requestMatchers("/api/frontdesk/**").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.POST, "/api/visitation/walk-in").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.GET, "/api/visitation/account-patients").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.GET, "/api/visitation/mine-visiting").hasRole("PATIENT")
                        .requestMatchers(HttpMethod.POST, "/api/visitation").hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/visitation").hasAnyRole("ADMIN", "DOCTOR", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.GET, "/api/visitation/mine").hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/visitation/**").hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/visitation/*/status").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers("/api/visitation/**").hasRole("ADMIN")
                        .anyRequest().hasRole("ADMIN")
                )
                .addFilterBefore(
                        jwtAuthFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}