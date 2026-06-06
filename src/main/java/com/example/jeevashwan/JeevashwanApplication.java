package com.example.jeevashwan;

import com.example.jeevashwan.entity.User;
import com.example.jeevashwan.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

@SpringBootApplication
public class JeevashwanApplication {

    public static void main(String[] args) {
        SpringApplication.run(JeevashwanApplication.class, args);
    }

    @Bean
    public CommandLineRunner seedDatabase(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            List<User> admins = userRepository.findByRole("admin");
            if (admins.isEmpty()) {
                String hashedPassword = passwordEncoder.encode("admin123");
                User admin = new User(
                    "Admin",
                    "admin",
                    "admin@jeevashwan.org",
                    "0000000000",
                    hashedPassword,
                    "admin"
                );
                userRepository.save(admin);
                System.out.println("✅ Default admin user seeded successfully (username: admin, password: admin123).");
            }
        };
    }
}
