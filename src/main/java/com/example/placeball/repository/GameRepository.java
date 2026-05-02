package com.example.placeball.repository;

import com.example.placeball.domain.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface GameRepository extends JpaRepository<Game, Long> {

    // 특정 년월의 경기 전체 조회 (캘린더용)
    @Query("SELECT g FROM Game g WHERE YEAR(g.gameDate) = :year AND MONTH(g.gameDate) = :month ORDER BY g.gameDate, g.gameTime")
    List<Game> findByYearAndMonth(@Param("year") int year, @Param("month") int month);

    // 특정 날짜 경기 조회
    List<Game> findByGameDateOrderByGameTime(LocalDate date);

    // 특정 팀 경기 조회 (년월)
    @Query("SELECT g FROM Game g WHERE YEAR(g.gameDate) = :year AND MONTH(g.gameDate) = :month AND (g.homeTeam = :team OR g.awayTeam = :team) ORDER BY g.gameDate, g.gameTime")
    List<Game> findByYearAndMonthAndTeam(@Param("year") int year, @Param("month") int month, @Param("team") String team);

    // 상태별 조회 (upcoming / finished / live)
    @Query("SELECT g FROM Game g WHERE YEAR(g.gameDate) = :year AND MONTH(g.gameDate) = :month AND g.status = :status ORDER BY g.gameDate, g.gameTime")
    List<Game> findByYearAndMonthAndStatus(@Param("year") int year, @Param("month") int month, @Param("status") String status);

    // 오늘 경기
    List<Game> findByGameDateOrderByGameTimeAsc(LocalDate date);

    // 특정 기간 경기
    List<Game> findByGameDateBetweenOrderByGameDateAscGameTimeAsc(LocalDate from, LocalDate to);
}
