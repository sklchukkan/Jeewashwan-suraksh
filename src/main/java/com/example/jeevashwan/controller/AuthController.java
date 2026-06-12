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
            if (request.getName() == null || request.getName().trim().isEmpty() ||
                request.getUsername() == null || request.getUsername().trim().isEmpty() ||
                request.getPhone() == null || request.getPhone().trim().isEmpty() ||
                request.getEmail() == null || request.getEmail().trim().isEmpty() ||
                request.getPassword() == null || request.getPassword().isEmpty() ||
                request.getConfirmPassword() == null || request.getConfirmPassword().isEmpty() ||
                request.getRole() == null || request.getRole().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "All fields are required."));
            }

            // Username validation
            String username = request.getUsername().trim();
            if (username.length() < 4 || !username.matches("^[a-zA-Z0-9_]+$")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username must be at least 4 characters and contain only letters, numbers, and underscores."));
            }

            // Mobile number validation
            String phone = request.getPhone().trim();
            if (!phone.matches("^[6-9]\\d{9}$")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9."));
            }

            // Email validation
            String email = request.getEmail().trim();
            if (!email.matches("^[A-Za-z0-9._%+-]{6,64}@(gmail|outlook|yahoo)\\.[A-Za-z]{2,6}(\\.[A-Za-z]{2,6})?$")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Please enter a valid Gmail, Outlook, or Yahoo email address with a username part between 6 and 64 characters."));
            }

            // Password validation
            String password = request.getPassword();
            if (password.length() < 8 ||
                !password.matches(".*[A-Z].*") ||
                !password.matches(".*[a-z].*") ||
                !password.matches(".*[0-9].*") ||
                !password.matches(".*[^a-zA-Z0-9].*")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character."));
            }

            // Confirm password matching
            if (!password.equals(request.getConfirmPassword())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password and Confirm Password do not match."));
            }

            String role = request.getRole().toLowerCase();
            if (!role.equals("user") && !role.equals("ngo")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid role for registration."));
            }

            Optional<User> existingUser = userRepository.findByUsername(username);
            if (existingUser.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username already exists."));
            }

            String hashedPassword = passwordEncoder.encode(password);
            User user = new User(
                request.getName().trim(),
                username,
                email,
                phone,
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

    @GetMapping("/check-username")
    public ResponseEntity<?> checkUsername(@RequestParam("username") String username) {
        try {
            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity.ok(Map.of("available", true));
            }
            boolean exists = userRepository.findByUsername(username.trim()).isPresent();
            return ResponseEntity.ok(Map.of("available", !exists));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Server error checking username.", "details", e.getMessage()));
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
        private String confirmPassword;
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

        public String getConfirmPassword() { return confirmPassword; }
        public void setConfirmPassword(String confirmPassword) { this.confirmPassword = confirmPassword; }

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
