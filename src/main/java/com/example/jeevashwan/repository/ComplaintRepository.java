package com.example.jeevashwan.repository;

import com.example.jeevashwan.entity.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    @Query("SELECT c FROM Complaint c WHERE c.user.id = :userId ORDER BY c.id DESC")
    List<Complaint> findByUserIdOrderByIdDesc(@Param("userId") Long userId);

    List<Complaint> findAllByOrderByIdDesc();
    List<Complaint> findByStatusNot(String status);
    long countByStatus(String status);
}
