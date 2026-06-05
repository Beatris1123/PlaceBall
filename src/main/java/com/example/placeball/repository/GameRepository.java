package com.example.placeball.repository;

import com.example.placeball.domain.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface GameRepository extends JpaRepository<Game, Long> {

    // ── 기존 (GameApiController 에서 사용 중) ──────────────────

    // 연도+월+팀 필터
    @Query("""
        SELECT g FROM Game g
        WHERE YEAR(g.gameDate) = :year
          AND MONTH(g.gameDate) = :month
          AND (:team IS NULL OR g.homeTeam = :team OR g.awayTeam = :team)
        ORDER BY g.gameDate ASC, g.gameTime ASC
        """)
    List<Game> findByYearAndMonthAndTeam(
            @Param("year") int year,
            @Param("month") int month,
            @Param("team") String team);

    // 연도+월+상태 필터
    @Query("""
        SELECT g FROM Game g
        WHERE YEAR(g.gameDate) = :year
          AND MONTH(g.gameDate) = :month
          AND g.status = :status
        ORDER BY g.gameDate ASC, g.gameTime ASC
        """)
    List<Game> findByYearAndMonthAndStatus(
            @Param("year") int year,
            @Param("month") int month,
            @Param("status") String status);

    // 연도+월 전체
    @Query("""
        SELECT g FROM Game g
        WHERE YEAR(g.gameDate) = :year
          AND MONTH(g.gameDate) = :month
        ORDER BY g.gameDate ASC, g.gameTime ASC
        """)
    List<Game> findByYearAndMonth(
            @Param("year") int year,
            @Param("month") int month);

    // 날짜 + 시간 오름차순
    List<Game> findByGameDateOrderByGameTimeAsc(LocalDate gameDate);

    // 날짜 + 시간 (오름차순, alias)
    List<Game> findByGameDateOrderByGameTime(LocalDate gameDate);

    // ── 신규 (BattleApiController 에서 사용) ───────────────────

    // 날짜로 경기 목록 조회
    List<Game> findByGameDate(LocalDate gameDate);

    // 날짜 범위 조회
    List<Game> findByGameDateBetweenOrderByGameDateAscGameTimeAsc(LocalDate from, LocalDate to);

    // 날짜 + 홈팀 + 원정팀으로 단일 경기 조회
    Optional<Game> findByGameDateAndHomeTeamAndAwayTeam(
            LocalDate gameDate, String homeTeam, String awayTeam);

    // 상태별 조회
    List<Game> findByStatus(String status);

    // 날짜 + 상태 조회
    List<Game> findByGameDateAndStatus(LocalDate gameDate, String status);

    // ── 특정 팀의 오늘 포함 이후 가장 가까운 예정 경기 ──
    @org.springframework.data.jpa.repository.Query("""
        SELECT g FROM Game g
        WHERE (g.homeTeam = :team OR g.awayTeam = :team)
          AND g.gameDate >= :today
        ORDER BY g.gameDate ASC, g.gameTime ASC
        """)
    List<Game> findUpcomingByTeam(
            @org.springframework.data.repository.query.Param("team") String team,
            @org.springframework.data.repository.query.Param("today") LocalDate today,
            org.springframework.data.domain.Pageable pageable);

    // ── 특정 팀의 가장 최근 과거 경기 ──
    @org.springframework.data.jpa.repository.Query("""
        SELECT g FROM Game g
        WHERE (g.homeTeam = :team OR g.awayTeam = :team)
          AND g.gameDate < :today
        ORDER BY g.gameDate DESC, g.gameTime DESC
        """)
    List<Game> findPastByTeam(
            @org.springframework.data.repository.query.Param("team") String team,
            @org.springframework.data.repository.query.Param("today") LocalDate today,
            org.springframework.data.domain.Pageable pageable);
}
