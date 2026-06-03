package com.example.placeball.repository;

import com.example.placeball.domain.BattleRecord;
import com.example.placeball.domain.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BattleRecordRepository extends JpaRepository<BattleRecord, Long> {

    // ── 단건 조회 ──────────────────────────────────────────────────
    Optional<BattleRecord> findByGame(Game game);
    Optional<BattleRecord> findByGameId(Long gameId);

    // ── 날짜 범위 조회 (최근 결과 목록용) ──────────────────────────
    @Query("""
        SELECT br FROM BattleRecord br
        JOIN br.game g
        WHERE g.gameDate BETWEEN :from AND :to
          AND br.cheerWinner <> 'cancel'
        ORDER BY g.gameDate DESC
        """)
    List<BattleRecord> findByGameDateBetween(
            @Param("from") LocalDate from,
            @Param("to")   LocalDate to
    );

    // ── 특정 날짜 조회 (다이어리 연동용) ───────────────────────────
    @Query("""
        SELECT br FROM BattleRecord br
        JOIN br.game g
        WHERE g.gameDate = :gameDate
        ORDER BY g.gameDate DESC
        """)
    List<BattleRecord> findByGameDate(@Param("gameDate") LocalDate gameDate);

    // ── 연도별 전체 (랭킹 집계용) ──────────────────────────────────
    @Query("""
        SELECT br FROM BattleRecord br
        JOIN br.game g
        WHERE YEAR(g.gameDate) = :year
          AND br.cheerWinner <> 'cancel'
        ORDER BY g.gameDate DESC
        """)
    List<BattleRecord> findByYear(@Param("year") int year);

    // ── 연도+월별 (월간 랭킹용) ────────────────────────────────────
    @Query("""
        SELECT br FROM BattleRecord br
        JOIN br.game g
        WHERE YEAR(g.gameDate) = :year
          AND MONTH(g.gameDate) = :month
          AND br.cheerWinner <> 'cancel'
        ORDER BY g.gameDate DESC
        """)
    List<BattleRecord> findByYearAndMonth(
            @Param("year")  int year,
            @Param("month") int month
    );

    // ── 팀별 승리 횟수 집계 ────────────────────────────────────────
    @Query("""
        SELECT br.cheerWinner, COUNT(br)
        FROM BattleRecord br
        WHERE YEAR(br.game.gameDate) = :year
          AND br.cheerWinner NOT IN ('draw','cancel')
        GROUP BY br.cheerWinner
        """)
    List<Object[]> countWinsByYear(@Param("year") int year);

    @Query("""
        SELECT br.cheerWinner, COUNT(br)
        FROM BattleRecord br
        WHERE YEAR(br.game.gameDate) = :year
          AND MONTH(br.game.gameDate) = :month
          AND br.cheerWinner NOT IN ('draw','cancel')
        GROUP BY br.cheerWinner
        """)
    List<Object[]> countWinsByYearAndMonth(
            @Param("year")  int year,
            @Param("month") int month
    );

    // ── 팀별 패배 횟수 집계 ────────────────────────────────────────
    @Query("""
        SELECT br.cheerLoser, COUNT(br)
        FROM BattleRecord br
        WHERE YEAR(br.game.gameDate) = :year
          AND br.cheerLoser IS NOT NULL
        GROUP BY br.cheerLoser
        """)
    List<Object[]> countLosesByYear(@Param("year") int year);

    @Query("""
        SELECT br.cheerLoser, COUNT(br)
        FROM BattleRecord br
        WHERE YEAR(br.game.gameDate) = :year
          AND MONTH(br.game.gameDate) = :month
          AND br.cheerLoser IS NOT NULL
        GROUP BY br.cheerLoser
        """)
    List<Object[]> countLosesByYearAndMonth(
            @Param("year")  int year,
            @Param("month") int month
    );

    // ── 팀이 참가한 전체 경기 수 (draw 포함, cancel 제외) ──────────
    @Query("""
        SELECT br.homeTeam, COUNT(br)
        FROM BattleRecord br
        WHERE YEAR(br.game.gameDate) = :year
          AND br.cheerWinner <> 'cancel'
        GROUP BY br.homeTeam
        """)
    List<Object[]> countHomePlayedByYear(@Param("year") int year);

    @Query("""
        SELECT br.awayTeam, COUNT(br)
        FROM BattleRecord br
        WHERE YEAR(br.game.gameDate) = :year
          AND br.cheerWinner <> 'cancel'
        GROUP BY br.awayTeam
        """)
    List<Object[]> countAwayPlayedByYear(@Param("year") int year);

    @Query("""
        SELECT br.homeTeam, COUNT(br)
        FROM BattleRecord br
        WHERE YEAR(br.game.gameDate) = :year
          AND MONTH(br.game.gameDate) = :month
          AND br.cheerWinner <> 'cancel'
        GROUP BY br.homeTeam
        """)
    List<Object[]> countHomePlayedByYearAndMonth(
            @Param("year") int year, @Param("month") int month);

    @Query("""
        SELECT br.awayTeam, COUNT(br)
        FROM BattleRecord br
        WHERE YEAR(br.game.gameDate) = :year
          AND MONTH(br.game.gameDate) = :month
          AND br.cheerWinner <> 'cancel'
        GROUP BY br.awayTeam
        """)
    List<Object[]> countAwayPlayedByYearAndMonth(
            @Param("year") int year, @Param("month") int month);

    // ── 팀별 총 응원 포인트 합산 ───────────────────────────────────
    @Query("""
        SELECT br.homeTeam,
               SUM(br.homeCheerScore)
        FROM BattleRecord br
        WHERE YEAR(br.game.gameDate) = :year
          AND br.cheerWinner <> 'cancel'
        GROUP BY br.homeTeam
        """)
    List<Object[]> sumHomeCheerPtsByYear(@Param("year") int year);

    @Query("""
        SELECT br.awayTeam,
               SUM(br.awayCheerScore)
        FROM BattleRecord br
        WHERE YEAR(br.game.gameDate) = :year
          AND br.cheerWinner <> 'cancel'
        GROUP BY br.awayTeam
        """)
    List<Object[]> sumAwayCheerPtsByYear(@Param("year") int year);

    @Query("""
        SELECT br.homeTeam, SUM(br.homeCheerScore)
        FROM BattleRecord br
        WHERE YEAR(br.game.gameDate) = :year
          AND MONTH(br.game.gameDate) = :month
          AND br.cheerWinner <> 'cancel'
        GROUP BY br.homeTeam
        """)
    List<Object[]> sumHomeCheerPtsByYearAndMonth(
            @Param("year") int year, @Param("month") int month);

    @Query("""
        SELECT br.awayTeam, SUM(br.awayCheerScore)
        FROM BattleRecord br
        WHERE YEAR(br.game.gameDate) = :year
          AND MONTH(br.game.gameDate) = :month
          AND br.cheerWinner <> 'cancel'
        GROUP BY br.awayTeam
        """)
    List<Object[]> sumAwayCheerPtsByYearAndMonth(
            @Param("year") int year, @Param("month") int month);
}
