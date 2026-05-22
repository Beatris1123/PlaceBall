package com.example.placeball.repository;

import com.example.placeball.domain.CheerPoint;
import com.example.placeball.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface CheerPointRepository extends JpaRepository<CheerPoint, Long> {

    // ── 기존: 전체 랭킹 ──
    @Query("SELECT cp.member, SUM(cp.amount) FROM CheerPoint cp GROUP BY cp.member ORDER BY SUM(cp.amount) DESC")
    List<Object[]> findRanking();

    // ── 특정 기간 + 팀 + pointType 조건 포인트 합산 ──
    @Query("""
        SELECT COALESCE(SUM(cp.amount), 0)
        FROM CheerPoint cp
        WHERE cp.member.favoriteTeam = :team
          AND cp.earnedAt BETWEEN :from AND :to
          AND cp.pointType = :pointType
        """)
    int sumByTeamAndPeriodAndType(
            @Param("team")      String team,
            @Param("from")      LocalDateTime from,
            @Param("to")        LocalDateTime to,
            @Param("pointType") String pointType
    );

    // ── 특정 기간 + 팀 + 모든 pointType 합산 (기존 호환) ──
    @Query("""
        SELECT COALESCE(SUM(cp.amount), 0)
        FROM CheerPoint cp
        WHERE cp.member.favoriteTeam = :team
          AND cp.earnedAt BETWEEN :from AND :to
          AND cp.pointType = 'BATTLE_TICKET'
        """)
    int sumByTeamAndPeriod(
            @Param("team") String team,
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to
    );

    // ── 구역별 팀 포인트 합산 (티켓 인증만, seatZone 기준) ──
    @Query("""
        SELECT COALESCE(SUM(cp.amount), 0)
        FROM CheerPoint cp
        WHERE cp.member.favoriteTeam = :team
          AND cp.earnedAt BETWEEN :from AND :to
          AND cp.pointType = 'BATTLE_TICKET'
          AND cp.seatZone = :seatZone
        """)
    int sumByTeamAndPeriodAndZone(
            @Param("team")     String team,
            @Param("from")     LocalDateTime from,
            @Param("to")       LocalDateTime to,
            @Param("seatZone") String seatZone
    );

    // ── 온라인 활동 포인트 합산 (게시글/댓글/출석 등) ──
    @Query("""
        SELECT COALESCE(SUM(cp.amount), 0)
        FROM CheerPoint cp
        WHERE cp.member.favoriteTeam = :team
          AND cp.earnedAt BETWEEN :from AND :to
          AND cp.pointType IN ('POST_WRITE', 'COMMENT_WRITE', 'ATTENDANCE', 'PHOTO_UPLOAD')
        """)
    int sumOnlineByTeamAndPeriod(
            @Param("team") String team,
            @Param("from") LocalDateTime from,
            @Param("to")   LocalDateTime to
    );

    // ── 오늘 특정 타입 포인트 이미 적립했는지 체크 ──
    @Query("""
        SELECT COUNT(cp) > 0
        FROM CheerPoint cp
        WHERE cp.member = :member
          AND cp.pointType = :pointType
          AND CAST(cp.earnedAt AS date) = :today
        """)
    boolean existsTodayByMemberAndType(
            @Param("member")    Member member,
            @Param("pointType") String pointType,
            @Param("today")     java.time.LocalDate today
    );

    // ── 중복 인증 체크 ──
    boolean existsByMemberAndPointTypeAndDescription(
            Member member, String pointType, String description);
}
