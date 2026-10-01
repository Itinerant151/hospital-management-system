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

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/login", "/signup", "/forgot-password", "/reset-password").permitAll()
                        .requestMatchers("/account/**").authenticated()

                        .requestMatchers(HttpMethod.GET, "/api/admin/receptionist-requests").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/admin/receptionist-requests/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/admin/receptionist-requests/**").hasRole("ADMIN")

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
                        .requestMatchers(HttpMethod.POST, "/api/bills").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.DELETE, "/api/bills/**").hasRole("ADMIN")
                        .requestMatchers("/api/bills/**").hasRole("ADMIN")
                        .requestMatchers("/api/medicines/**").hasRole("ADMIN")
                        .requestMatchers("/api/prescriptions/**").hasRole("ADMIN")
                        .requestMatchers("/api/statistics/**").hasRole("ADMIN")

                        .requestMatchers("/api/frontdesk/**").hasAnyRole("ADMIN", "RECEPTIONIST")

                        .requestMatchers(HttpMethod.POST, "/api/visitation").hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/visitation").hasAnyRole("ADMIN", "DOCTOR", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.GET, "/api/visitation/mine").hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/visitation/**").hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/visitation/*/status").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers("/api/visitation/**").hasRole("ADMIN")

                        .anyRequest().hasRole("ADMIN")
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}