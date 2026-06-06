package com.example.jeevashwan.repository;

import com.example.jeevashwan.entity.Receipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ReceiptRepository extends JpaRepository<Receipt, Long> {
    @Query("SELECT r FROM Receipt r WHERE r.quotation.id = :quotationId")
    Optional<Receipt> findByQuotationId(@Param("quotationId") Long quotationId);

    List<Receipt> findAllByOrderByIdDesc();
}
