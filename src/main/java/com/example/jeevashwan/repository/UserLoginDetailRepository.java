package com.example.jeevashwan.repository;

import com.example.jeevashwan.entity.UserLoginDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserLoginDetailRepository extends JpaRepository<UserLoginDetail, Long> {
    Optional<UserLoginDetail> findFirstByUserIdOrderByIdDesc(Long userId);
    List<UserLoginDetail> findTop5ByUserIdOrderByIdDesc(Long userId);
}
