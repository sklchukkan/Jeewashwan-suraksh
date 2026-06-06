package com.example.jeevashwan.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "complaints")
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private String phone;

    @Column
    private String name;

    @Column
    private String email;

    @Column(name = "area_name")
    @JsonProperty("area_name")
    private String areaName;

    @Column
    private String landmark;

    @Column(name = "dog_count")
    @JsonProperty("dog_count")
    private Integer dogCount;

    @Column
    private String behavior;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "location_lat")
    @JsonProperty("location_lat")
    private Double locationLat;

    @Column(name = "location_lng")
    @JsonProperty("location_lng")
    private Double locationLng;

    @Column(nullable = false)
    private String status = "Pending"; // 'Pending', 'Assigned', 'Completed', 'Rejected'

    @Column(name = "reject_reason")
    @JsonProperty("reject_reason")
    private String rejectReason;

    @JsonIgnore
    @Column(name = "image_data", columnDefinition = "BLOB")
    private byte[] imageData;

    @Column(name = "image_mime")
    @JsonProperty("image_mime")
    private String imageMime;

    @Column(name = "created_at", nullable = false)
    @JsonProperty("created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // Constructors
    public Complaint() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    @JsonProperty("user_id")
    public Long getUserId() {
        return user != null ? user.getId() : null;
    }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

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

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRejectReason() { return rejectReason; }
    public void setRejectReason(String rejectReason) { this.rejectReason = rejectReason; }

    public byte[] getImageData() { return imageData; }
    public void setImageData(byte[] imageData) { this.imageData = imageData; }

    public String getImageMime() { return imageMime; }
    public void setImageMime(String imageMime) { this.imageMime = imageMime; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @JsonProperty("has_image")
    public int getHasImage() {
        return imageData != null ? 1 : 0;
    }
}
