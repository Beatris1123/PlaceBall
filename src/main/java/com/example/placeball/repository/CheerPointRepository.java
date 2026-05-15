package com.example.placeball.repository;

import com.example.placeball.domain.CheerPoint;
import com.example.placeball.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CheerPointRepository extends JpaRepository<CheerPoint, Long> {

    // 특정 회원의 포인트 내역 (최신순)
    List<CheerPoint> findByMemberOrderByEarnedAtDesc(Member member);

    // 특정 회원의 총 포인트 합계
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM CheerPoint p WHERE p.member = :member")
    int sumAmountByMember(@Param("member") Member member);

    // 특정 회원의 포인트 타입별 내역
    List<CheerPoint> findByMemberAndPointType(Member member, String pointType);

    // 포인트 랭킹 (상위 N명)
    @Query("SELECT p.member, SUM(p.amount) AS total FROM CheerPoint p " +
           "GROUP BY p.member ORDER BY total DESC")
    List<Object[]> findRanking();
}
