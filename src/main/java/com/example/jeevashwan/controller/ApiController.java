package com.example.jeevashwan.controller;

import com.example.jeevashwan.entity.Complaint;
import com.example.jeevashwan.entity.Quotation;
import com.example.jeevashwan.entity.Receipt;
import com.example.jeevashwan.entity.User;
import com.example.jeevashwan.entity.UserLoginDetail;
import com.example.jeevashwan.repository.ComplaintRepository;
import com.example.jeevashwan.repository.QuotationRepository;
import com.example.jeevashwan.repository.ReceiptRepository;
import com.example.jeevashwan.repository.UserRepository;
import com.example.jeevashwan.repository.UserLoginDetailRepository;
import com.example.jeevashwan.security.CustomUserDetails;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final UserRepository userRepository;
    private final ComplaintRepository complaintRepository;
    private final QuotationRepository quotationRepository;
    private final ReceiptRepository receiptRepository;
    private final UserLoginDetailRepository userLoginDetailRepository;

    public ApiController(UserRepository userRepository,
                         ComplaintRepository complaintRepository,
                         QuotationRepository quotationRepository,
                         ReceiptRepository receiptRepository,
                         UserLoginDetailRepository userLoginDetailRepository) {
        this.userRepository = userRepository;
        this.complaintRepository = complaintRepository;
        this.quotationRepository = quotationRepository;
        this.receiptRepository = receiptRepository;
        this.userLoginDetailRepository = userLoginDetailRepository;
    }

    /* ==========================================
       PUBLIC API ENDPOINTS
       ========================================== */

    @GetMapping("/public-stats")
    public ResponseEntity<?> getPublicStats() {
        long totalCases = complaintRepository.count();
        long completedCases = complaintRepository.countByStatus("Completed");
        long ngoCount = userRepository.findByRole("ngo").size();

        return ResponseEntity.ok(Map.of(
            "casesReported", totalCases,
            "casesCompleted", completedCases,
            "activeVolunteers", ngoCount
        ));
    }

    @GetMapping("/public-map-data")
    public ResponseEntity<?> getPublicMapData() {
        // Find all complaints that are not Rejected
        List<Complaint> complaints = complaintRepository.findByStatusNot("Rejected");
        List<Map<String, Object>> mapData = complaints.stream().map(c -> {
            Map<String, Object> data = new HashMap<>();
            data.put("id", c.getId());
            data.put("area_name", c.getAreaName());
            data.put("dog_count", c.getDogCount());
            data.put("behavior", c.getBehavior());
            data.put("location_lat", c.getLocationLat());
            data.put("location_lng", c.getLocationLng());
            data.put("status", c.getStatus());
            data.put("created_at", c.getCreatedAt());
            return data;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(mapData);
    }

    @PostMapping("/reports")
    public ResponseEntity<?> submitReport(
            @RequestParam("phone") String phone,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "email", required = false) String email,
            @RequestParam(value = "areaName", required = false) String areaName,
            @RequestParam(value = "landmark", required = false) String landmark,
            @RequestParam(value = "dogCount", required = false) Integer dogCount,
            @RequestParam(value = "behavior", required = false) String behavior,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("latitude") Double latitude,
            @RequestParam("longitude") Double longitude,
            @RequestParam(value = "photo", required = false) MultipartFile photo,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        try {
            if (phone == null || latitude == null || longitude == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Phone number and location are required."));
            }

            // Server-side validations
            if (!phone.matches("^[6-9]\\d{9}$")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Please enter a valid mobile number starting with 6, 7, 8, or 9."));
            }

            if (email != null && !email.trim().isEmpty()) {
                if (!email.matches("^[A-Za-z0-9._%+-]{6,64}@(gmail|outlook|yahoo)\\.[A-Za-z]{2,6}(\\.[A-Za-z]{2,6})?$")) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Please enter a valid Gmail, Outlook, or Yahoo email address with a username part between 6 and 64 characters."));
                }
            }

            Complaint complaint = new Complaint();
            complaint.setPhone(phone);
            complaint.setName(name);
            complaint.setEmail(email);
            complaint.setAreaName(areaName);
            complaint.setLandmark(landmark);
            complaint.setDogCount(dogCount != null ? dogCount : 1);
            complaint.setBehavior(behavior);
            complaint.setDescription(description);
            complaint.setLocationLat(latitude);
            complaint.setLocationLng(longitude);
            complaint.setStatus("Pending");

            if (userDetails != null) {
                complaint.setUser(userDetails.getUser());
            }

            if (photo != null && !photo.isEmpty()) {
                complaint.setImageData(photo.getBytes());
                complaint.setImageMime(photo.getContentType());
            }

            Complaint saved = complaintRepository.save(complaint);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Report submitted successfully!",
                "complaint_id", saved.getId()
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Server error.", "details", e.getMessage()));
        }
    }

    @GetMapping("/reports/{id}/image")
    public ResponseEntity<byte[]> getReportImage(@PathVariable("id") Long id,
                                                 @AuthenticationPrincipal CustomUserDetails userDetails) {
        Optional<Complaint> complaintOpt = complaintRepository.findById(id);
        if (complaintOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Complaint complaint = complaintOpt.get();
        if (complaint.getImageData() == null) {
            return ResponseEntity.notFound().build();
        }

        // Authorization checks
        User currentUser = userDetails.getUser();
        boolean authorized = false;

        if (currentUser.getRole().equals("admin")) {
            authorized = true;
        } else if (currentUser.getRole().equals("user") && complaint.getUser() != null &&
                   complaint.getUser().getId().equals(currentUser.getId())) {
            authorized = true;
        } else if (currentUser.getRole().equals("ngo")) {
            // Authorized if there's a quotation for this complaint assigned to this NGO
            List<Quotation> quotations = quotationRepository.findByNgoIdOrderByIdDesc(currentUser.getId());
            for (Quotation q : quotations) {
                if (q.getComplaint() != null && q.getComplaint().getId().equals(id)) {
                    authorized = true;
                    break;
                }
            }
        }

        if (!authorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        MediaType mediaType = MediaType.IMAGE_JPEG;
        if (complaint.getImageMime() != null) {
            try {
                mediaType = MediaType.parseMediaType(complaint.getImageMime());
            } catch (Exception e) {
                // fallback to jpeg
            }
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header("Cache-Control", "private, max-age=3600")
                .body(complaint.getImageData());
    }

    /* ==========================================
       USER API ENDPOINTS
       ========================================== */

    @GetMapping("/users/me")
    public ResponseEntity<?> getMyProfile(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }

        User user = userDetails.getUser();
        Optional<UserLoginDetail> loginDetailOpt = userLoginDetailRepository.findFirstByUserIdOrderByIdDesc(user.getId());
        
        String name = user.getName();
        String phone = user.getPhone();
        String email = user.getEmail() != null ? user.getEmail() : "";
        
        if (loginDetailOpt.isPresent()) {
            UserLoginDetail loginDetail = loginDetailOpt.get();
            name = loginDetail.getName();
            phone = loginDetail.getPhone();
            email = loginDetail.getEmail() != null ? loginDetail.getEmail() : "";
        }

        return ResponseEntity.ok(Map.of(
            "id", user.getId(),
            "name", name,
            "username", user.getUsername(),
            "phone", phone,
            "email", email,
            "role", user.getRole()
        ));
    }

    @GetMapping("/users/me/logins")
    public ResponseEntity<?> getMyLogins(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }

        List<UserLoginDetail> logins = userLoginDetailRepository.findTop5ByUserIdOrderByIdDesc(userDetails.getId());
        List<Map<String, Object>> response = logins.stream().map(l -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", l.getId());
            map.put("loginTime", l.getLoginTime());
            map.put("name", l.getName());
            map.put("phone", l.getPhone());
            map.put("email", l.getEmail() != null ? l.getEmail() : "");
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/reports/me")
    public ResponseEntity<?> getMyReports(@AuthenticationPrincipal CustomUserDetails userDetails) {
        List<Complaint> reports = complaintRepository.findByUserIdOrderByIdDesc(userDetails.getId());
        return ResponseEntity.ok(reports);
    }

    /* ==========================================
       ADMIN API ENDPOINTS
       ========================================== */

    @GetMapping("/admin/reports")
    public ResponseEntity<?> getAdminReports() {
        List<Complaint> reports = complaintRepository.findAllByOrderByIdDesc();
        return ResponseEntity.ok(reports);
    }

    @GetMapping("/admin/complaints/{id}/receipt")
    public ResponseEntity<?> getComplaintReceipt(@PathVariable("id") Long complaintId) {
        Optional<Quotation> quotationOpt = quotationRepository.findByComplaintId(complaintId);
        if (quotationOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Quotation not found for complaint."));
        }

        Optional<Receipt> receiptOpt = receiptRepository.findByQuotationId(quotationOpt.get().getId());
        if (receiptOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Receipt not found for quotation."));
        }

        Receipt r = receiptOpt.get();
        Map<String, Object> map = new HashMap<>();
        map.put("id", r.getId());
        map.put("uploaded_at", r.getUploadedAt());
        map.put("has_image", r.getImageData() != null ? 1 : 0);
        map.put("amount", quotationOpt.get().getAmount());

        return ResponseEntity.ok(map);
    }

    @PostMapping("/admin/reports/{id}/reject")
    public ResponseEntity<?> rejectReport(@PathVariable("id") Long id, @RequestBody Map<String, String> body) {
        Optional<Complaint> complaintOpt = complaintRepository.findById(id);
        if (complaintOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Complaint not found."));
        }

        Complaint complaint = complaintOpt.get();
        if (!complaint.getStatus().equals("Pending")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only pending complaints can be rejected."));
        }

        String reason = body.getOrDefault("reason", "False or unimportant report").trim();
        complaint.setStatus("Rejected");
        complaint.setRejectReason(reason);
        complaintRepository.save(complaint);

        return ResponseEntity.ok(Map.of(
            "message", "Complaint rejected successfully.",
            "complaint_id", id
        ));
    }

    @PostMapping("/admin/quotations")
    public ResponseEntity<?> createQuotation(@RequestBody Map<String, Object> body) {
        try {
            Long complaintId = Long.valueOf(body.get("complaint_id").toString());
            Long ngoId = Long.valueOf(body.get("ngo_id").toString());
            Double amount = Double.valueOf(body.get("amount").toString());

            Optional<Complaint> complaintOpt = complaintRepository.findById(complaintId);
            Optional<User> ngoOpt = userRepository.findById(ngoId);

            if (complaintOpt.isEmpty() || ngoOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Complaint or NGO not found."));
            }

            Complaint complaint = complaintOpt.get();
            User ngo = ngoOpt.get();

            Quotation quotation = new Quotation();
            quotation.setComplaint(complaint);
            quotation.setNgo(ngo);
            quotation.setAmount(amount);
            quotation.setStatus("Sent");

            quotationRepository.save(quotation);

            complaint.setStatus("Assigned");
            complaintRepository.save(complaint);

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Quotation sent successfully."));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Database error while creating quotation.", "details", e.getMessage()));
        }
    }

    @GetMapping("/admin/ngos")
    public ResponseEntity<?> getAdminNgos() {
        List<User> ngos = userRepository.findByRole("ngo");
        List<Map<String, Object>> response = ngos.stream().map(n -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", n.getId());
            map.put("name", n.getName());
            map.put("phone", n.getPhone());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /* ==========================================
       NGO API ENDPOINTS
       ========================================== */

    @GetMapping("/ngo/quotations")
    public ResponseEntity<?> getNgoQuotations(@AuthenticationPrincipal CustomUserDetails userDetails) {
        List<Quotation> quotations = quotationRepository.findByNgoIdOrderByIdDesc(userDetails.getId());
        List<NgoQuotationResponse> response = quotations.stream().map(q -> {
            Complaint c = q.getComplaint();
            Optional<Receipt> receiptOpt = receiptRepository.findByQuotationId(q.getId());
            Receipt r = receiptOpt.orElse(null);

            NgoQuotationResponse dto = new NgoQuotationResponse();
            dto.setQuotationId(q.getId());
            dto.setAmount(q.getAmount());
            dto.setStatus(q.getStatus());
            dto.setCreatedAt(q.getCreatedAt());

            if (c != null) {
                dto.setComplaintId(c.getId());
                dto.setReporterName(c.getName());
                dto.setReporterPhone(c.getPhone());
                dto.setReporterEmail(c.getEmail());
                dto.setAreaName(c.getAreaName());
                dto.setLandmark(c.getLandmark());
                dto.setDogCount(c.getDogCount());
                dto.setBehavior(c.getBehavior());
                dto.setDescription(c.getDescription());
                dto.setLocationLat(c.getLocationLat());
                dto.setLocationLng(c.getLocationLng());
                dto.setComplaintStatus(c.getStatus());
                dto.setReportedAt(c.getCreatedAt());
                dto.setHasReportImage(c.getImageData() != null ? 1 : 0);
            }

            if (r != null) {
                dto.setReceiptId(r.getId());
                dto.setHasReceiptImage(r.getImageData() != null ? 1 : 0);
            } else {
                dto.setHasReceiptImage(0);
            }

            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/ngo/receipts")
    public ResponseEntity<?> uploadReceipt(
            @RequestParam("quotation_id") Long quotationId,
            @RequestParam("receipt") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        try {
            if (quotationId == null || file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Quotation ID and receipt image are required."));
            }

            Optional<Quotation> quotationOpt = quotationRepository.findById(quotationId);
            if (quotationOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Quotation not found."));
            }

            Quotation quotation = quotationOpt.get();
            Complaint complaint = quotation.getComplaint();

            Receipt receipt = new Receipt();
            receipt.setQuotation(quotation);
            receipt.setNgo(userDetails.getUser());
            receipt.setImageData(file.getBytes());
            receipt.setImageMime(file.getContentType());

            Receipt savedReceipt = receiptRepository.save(receipt);

            quotation.setStatus("Completed");
            quotationRepository.save(quotation);

            if (complaint != null) {
                complaint.setStatus("Completed");
                complaintRepository.save(complaint);
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Receipt uploaded successfully.",
                "receipt_id", savedReceipt.getId()
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Server error.", "details", e.getMessage()));
        }
    }

    @GetMapping("/receipts/{id}/image")
    public ResponseEntity<byte[]> getReceiptImage(@PathVariable("id") Long id,
                                                  @AuthenticationPrincipal CustomUserDetails userDetails) {
        Optional<Receipt> receiptOpt = receiptRepository.findById(id);
        if (receiptOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Receipt receipt = receiptOpt.get();
        if (receipt.getImageData() == null) {
            return ResponseEntity.notFound().build();
        }

        // Authorization checks: Admin or NGO that uploaded it
        User currentUser = userDetails.getUser();
        boolean authorized = false;

        if (currentUser.getRole().equals("admin")) {
            authorized = true;
        } else if (currentUser.getRole().equals("ngo") && receipt.getNgo() != null &&
                   receipt.getNgo().getId().equals(currentUser.getId())) {
            authorized = true;
        }

        if (!authorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        MediaType mediaType = MediaType.IMAGE_JPEG;
        if (receipt.getImageMime() != null) {
            try {
                mediaType = MediaType.parseMediaType(receipt.getImageMime());
            } catch (Exception e) {
                // fallback
            }
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(receipt.getImageData());
    }

    @GetMapping("/admin/receipts")
    public ResponseEntity<?> getAdminReceipts() {
        List<Receipt> receipts = receiptRepository.findAllByOrderByIdDesc();
        List<Map<String, Object>> response = receipts.stream().map(r -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId());
            map.put("uploaded_at", r.getUploadedAt());
            map.put("amount", r.getQuotation() != null ? r.getQuotation().getAmount() : 0.0);
            map.put("ngo_name", r.getNgo() != null ? r.getNgo().getUsername() : "Unknown");
            map.put("has_image", r.getImageData() != null ? 1 : 0);
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // Custom DTO class to represent NGO quotations list response in the format expected by the frontend
    public static class NgoQuotationResponse {
        @JsonProperty("quotation_id")
        private Long quotationId;
        private Double amount;
        private String status;
        @JsonProperty("created_at")
        private LocalDateTime createdAt;

        @JsonProperty("complaint_id")
        private Long complaintId;
        @JsonProperty("reporter_name")
        private String reporterName;
        @JsonProperty("reporter_phone")
        private String reporterPhone;
        @JsonProperty("reporter_email")
        private String reporterEmail;
        @JsonProperty("area_name")
        private String areaName;
        private String landmark;
        @JsonProperty("dog_count")
        private Integer dogCount;
        private String behavior;
        private String description;
        @JsonProperty("location_lat")
        private Double locationLat;
        @JsonProperty("location_lng")
        private Double locationLng;
        @JsonProperty("complaint_status")
        private String complaintStatus;
        @JsonProperty("reported_at")
        private LocalDateTime reportedAt;
        @JsonProperty("has_report_image")
        private int hasReportImage;

        @JsonProperty("receipt_id")
        private Long receiptId;
        @JsonProperty("has_receipt_image")
        private int hasReceiptImage;

        // Getters and Setters
        public Long getQuotationId() { return quotationId; }
        public void setQuotationId(Long quotationId) { this.quotationId = quotationId; }

        public Double getAmount() { return amount; }
        public void setAmount(Double amount) { this.amount = amount; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

        public Long getComplaintId() { return complaintId; }
        public void setComplaintId(Long complaintId) { this.complaintId = complaintId; }

        public String getReporterName() { return reporterName; }
        public void setReporterName(String reporterName) { this.reporterName = reporterName; }

        public String getReporterPhone() { return reporterPhone; }
        public void setReporterPhone(String reporterPhone) { this.reporterPhone = reporterPhone; }

        public String getReporterEmail() { return reporterEmail; }
        public void setReporterEmail(String reporterEmail) { this.reporterEmail = reporterEmail; }

        public String getAreaName() { return areaName; }
        public void setAreaName(String areaName) { this.areaName = areaName; }

        public String getLandmark() { return landmark; }
        public void setLandmark(String landmark) { this.landmark = landmark; }

        public Integer getDogCount() { return dogCount; }
        public void setDogCount(Integer dogCount) { this.dogCount = dogCount; }

        public String getBehavior() { return behavior; }
        public void setBehavior(String behavior) { this.behavior = behavior; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public Double getLocationLat() { return locationLat; }
        public void setLocationLat(Double locationLat) { this.locationLat = locationLat; }

        public Double getLocationLng() { return locationLng; }
        public void setLocationLng(Double locationLng) { this.locationLng = locationLng; }

        public String getComplaintStatus() { return complaintStatus; }
        public void setComplaintStatus(String complaintStatus) { this.complaintStatus = complaintStatus; }

        public LocalDateTime getReportedAt() { return reportedAt; }
        public void setReportedAt(LocalDateTime reportedAt) { this.reportedAt = reportedAt; }

        public int getHasReportImage() { return hasReportImage; }
        public void setHasReportImage(int hasReportImage) { this.hasReportImage = hasReportImage; }

        public Long getReceiptId() { return receiptId; }
        public void setReceiptId(Long receiptId) { this.receiptId = receiptId; }

        public int getHasReceiptImage() { return hasReceiptImage; }
        public void setHasReceiptImage(int hasReceiptImage) { this.hasReceiptImage = hasReceiptImage; }
    }
}
