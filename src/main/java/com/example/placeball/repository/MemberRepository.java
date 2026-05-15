package com.example.placeball.repository;

import com.example.placeball.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {
    // 아이디 중복 확인용
    boolean existsByLoginId(String loginId);

    // 닉네임 중복 확인용
    boolean existsByNickname(String nickname);

    // 로그인 시 아이디로 회원 조회용
    Optional<Member> findByLoginId(String loginId);

    // 닉네임으로 회원 조회용
    Optional<Member> findByNickname(String nickname);
}