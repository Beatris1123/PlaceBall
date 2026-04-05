package com.example.CapStoneDesign.repository;

import com.example.CapStoneDesign.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    /** 이메일로 회원 조회 (로그인, 중복 검사) */
    Optional<User> findByEmail(String email);

    /** 이메일 중복 여부 */
    boolean existsByEmail(String email);

    /** 닉네임 중복 여부 */
    boolean existsByNick(String nick);

    // ❌ findByEmailAndPw() 제거
    // 비밀번호 검증은 BCryptPasswordEncoder.matches()로 처리
    // DB 쿼리로 비밀번호를 비교하는 것은 보안상 위험
}
