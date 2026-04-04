
package com.example.CapStoneDesign.repository;

import com.example.CapStoneDesign.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // 이메일 중복 검사용
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email); //
    boolean existsByNick(String nick); // 닉네임 중복확인용
    // 로그인용 (이메일과 비밀번호가 모두 일치하는 유저 찾기)
    Optional<User> findByEmailAndPw(String email, String pw);

}