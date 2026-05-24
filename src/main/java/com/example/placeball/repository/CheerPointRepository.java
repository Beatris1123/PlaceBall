package com.example.placeball.repository;

import com.example.placeball.domain.CheerPoint;
import com.example.placeball.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface CheerPointRepository extends JpaRepository<CheerPoint, Long> {

    // ── 구역별 포인트 합산 (gameDate 기준) ──
    // BATTLE_TICKET + 커뮤니티 활동 모두 포함. seatZone 있는 행만 집계.
    @Query("""
        SELECT COALESCE(SUM(cp.amount), 0)
        FROM CheerPoint cp
        WHERE cp.member.favoriteTeam = :team
          AND cp.gameDate = :gameDate
          AND cp.seatZone = :seatZone
        """)
    int sumByTeamAndGameDateAndZone(
            @Param("team")     String team,
            @Param("gameDate") LocalDate gameDate,
            @Param("seatZone") String seatZone
    );

    // ── 온라인 활동 포인트 합산 (gameDate 기준) ──
    @Query("""
        SELECT COALESCE(SUM(cp.amount), 0)
        FROM CheerPoint cp
        WHERE cp.member.favoriteTeam = :team
          AND cp.gameDate = :gameDate
          AND cp.pointType IN ('POST_WRITE', 'COMMENT_WRITE', 'ATTENDANCE', 'PHOTO_UPLOAD')
        """)
    int sumOnlineByTeamAndGameDate(
            @Param("team")     String team,
            @Param("gameDate") LocalDate gameDate
    );

    // ── BATTLE_TICKET 합산 (gameDate 기준, finalize·buildBattleStatus용) ──
    @Query("""
        SELECT COALESCE(SUM(cp.amount), 0)
        FROM CheerPoint cp
        WHERE cp.member.favoriteTeam = :team
          AND cp.gameDate = :gameDate
          AND cp.pointType = 'BATTLE_TICKET'
        """)
    int sumTicketByTeamAndGameDate(
            @Param("team")     String team,
            @Param("gameDate") LocalDate gameDate
    );

    // ── 오늘 이후 가장 가까운 인증 티켓 조회 (커뮤니티 활동 연결용) ──
    @Query("""
        SELECT cp
        FROM CheerPoint cp
        WHERE cp.member = :member
          AND cp.pointType = 'BATTLE_TICKET'
          AND cp.gameDate >= :today
          AND cp.seatZone IS NOT NULL
        ORDER BY cp.gameDate ASC
        """)
    List<CheerPoint> findUpcomingTickets(
            @Param("member") Member member,
            @Param("today")  LocalDate today
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
            @Param("today")     LocalDate today
    );

    // ── 중복 인증 체크 (티켓 인증용) ──
    boolean existsByMemberAndPointTypeAndDescription(
            Member member, String pointType, String description);
}
