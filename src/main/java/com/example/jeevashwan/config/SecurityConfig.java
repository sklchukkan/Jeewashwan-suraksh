package com.example.jeevashwan.config;

import com.example.jeevashwan.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Allow static resources
                .requestMatchers("/", "/index.html", "/login.html", "/register.html", "/report.html", 
                                 "/map.html", "/admin-complaints.html", "/dashboard-admin.html", 
                                 "/dashboard-ngo.html", "/dashboard-user.html", "/admin-ngos.html", "/*.css", "/*.js", 
                                 "/*.geojson", "/assets/**", "/favicon.ico").permitAll()
                // Auth endpoints
                .requestMatchers("/api/auth/**").permitAll()
                // Public endpoints
                .requestMatchers("/api/public-stats", "/api/public-map-data").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/reports").permitAll() // Anonymous reporting
                // Admin endpoints
                .requestMatchers("/api/admin/**").hasRole("admin")
                // NGO endpoints
                .requestMatchers("/api/ngo/**").hasRole("ngo")
                // Authenticated image endpoints
                .requestMatchers("/api/reports/{id}/image", "/api/receipts/{id}/image").authenticated()
                // Any other request
                .anyRequest().authenticated()
            );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
