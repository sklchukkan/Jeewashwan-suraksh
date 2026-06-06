package com.example.jeevashwan.repository;

import com.example.jeevashwan.entity.Quotation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface QuotationRepository extends JpaRepository<Quotation, Long> {
    @Query("SELECT q FROM Quotation q WHERE q.ngo.id = :ngoId ORDER BY q.id DESC")
    List<Quotation> findByNgoIdOrderByIdDesc(@Param("ngoId") Long ngoId);

    @Query("SELECT q FROM Quotation q WHERE q.complaint.id = :complaintId")
    Optional<Quotation> findByComplaintId(@Param("complaintId") Long complaintId);
}
