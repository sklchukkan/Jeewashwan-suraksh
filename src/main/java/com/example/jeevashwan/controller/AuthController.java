package com.example.jeevashwan.controller;

import com.example.jeevashwan.entity.User;
import com.example.jeevashwan.entity.UserLoginDetail;
import com.example.jeevashwan.repository.UserRepository;
import com.example.jeevashwan.repository.UserLoginDetailRepository;
import com.example.jeevashwan.security.JwtTokenProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final UserLoginDetailRepository userLoginDetailRepository;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtTokenProvider tokenProvider, UserLoginDetailRepository userLoginDetailRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.userLoginDetailRepository = userLoginDetailRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            if (request.getName() == null || request.getUsername() == null ||
                request.getPhone() == null || request.getPassword() == null || request.getRole() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "All fields are required."));
            }

            String role = request.getRole().toLowerCase();
            if (!role.equals("user") && !role.equals("ngo")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid role for registration."));
            }

            Optional<User> existingUser = userRepository.findByUsername(request.getUsername());
            if (existingUser.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username already exists."));
            }

            String hashedPassword = passwordEncoder.encode(request.getPassword());
            User user = new User(
                request.getName(),
                request.getUsername(),
                request.getEmail(), // email (optional)
                request.getPhone(),
                hashedPassword,
                role
            );

            User savedUser = userRepository.save(user);

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "User registered successfully!",
                "id", savedUser.getId()
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Server error during registration.", "details", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            if (request.getUsername() == null || request.getPassword() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required."));
            }

            Optional<User> userOpt = userRepository.findByUsername(request.getUsername());
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Invalid username or password."));
            }

            User user = userOpt.get();
            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Invalid username or password."));
            }

            String token = tokenProvider.generateToken(user.getId(), user.getUsername(), user.getRole());

            // Save user login details snapshot
            UserLoginDetail loginDetail = new UserLoginDetail(
                user.getId(),
                user.getUsername(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                LocalDateTime.now()
            );
            userLoginDetailRepository.save(loginDetail);

            return ResponseEntity.ok(Map.of(
                "message", "Login successful",
                "token", token,
                "user", Map.of(
                    "id", user.getId(),
                    "username", user.getUsername(),
                    "name", user.getName(),
                    "phone", user.getPhone(),
                    "email", user.getEmail() != null ? user.getEmail() : "",
                    "role", user.getRole()
                )
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Server error during login.", "details", e.getMessage()));
        }
    }

    // Static DTO classes for request payloads
    public static class RegisterRequest {
        private String name;
        private String username;
        private String email;
        private String phone;
        private String password;
        private String role;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
    }

    public static class LoginRequest {
        private String username;
        private String password;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }

        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }
}
