package com.example.jeevashwan.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "receipts")
public class Receipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_id")
    private Quotation quotation;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ngo_id")
    private User ngo;

    @Column(name = "file_url")
    @JsonProperty("file_url")
    private String fileUrl;

    @JsonIgnore
    @Column(name = "image_data", columnDefinition = "BLOB")
    private byte[] imageData;

    @Column(name = "image_mime")
    @JsonProperty("image_mime")
    private String imageMime;

    @Column(name = "uploaded_at", nullable = false)
    @JsonProperty("uploaded_at")
    private LocalDateTime uploadedAt = LocalDateTime.now();

    // Constructors
    public Receipt() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Quotation getQuotation() { return quotation; }
    public void setQuotation(Quotation quotation) { this.quotation = quotation; }

    @JsonProperty("quotation_id")
    public Long getQuotationId() {
        return quotation != null ? quotation.getId() : null;
    }

    public User getNgo() { return ngo; }
    public void setNgo(User ngo) { this.ngo = ngo; }

    @JsonProperty("ngo_id")
    public Long getNgoId() {
        return ngo != null ? ngo.getId() : null;
    }

    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }

    public byte[] getImageData() { return imageData; }
    public void setImageData(byte[] imageData) { this.imageData = imageData; }

    public String getImageMime() { return imageMime; }
    public void setImageMime(String imageMime) { this.imageMime = imageMime; }

    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }

    @JsonProperty("has_image")
    public int getHasImage() {
        return imageData != null ? 1 : 0;
    }
}
