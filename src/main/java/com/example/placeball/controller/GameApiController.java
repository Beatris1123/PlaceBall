package com.example.placeball.controller;

import com.example.placeball.domain.Game;
import com.example.placeball.repository.GameRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/games")
@RequiredArgsConstructor
public class GameApiController {

    private final GameRepository gameRepository;

    /**
     * 월별 경기 목록 조회
     * GET /api/games?year=2025&month=5
     * GET /api/games?year=2025&month=5&team=KIA
     * GET /api/games?year=2025&month=5&status=upcoming
     */
    @GetMapping
    public List<Game> getGames(
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam(required = false) String team,
            @RequestParam(required = false) String status
    ) {
        if (team != null && !team.isBlank()) {
            return gameRepository.findByYearAndMonthAndTeam(year, month, team);
        }
        if (status != null && !status.isBlank()) {
            return gameRepository.findByYearAndMonthAndStatus(year, month, status);
        }
        return gameRepository.findByYearAndMonth(year, month);
    }

    /**
     * 오늘 경기 조회
     * GET /api/games/today
     */
    @GetMapping("/today")
    public List<Game> getTodayGames() {
        return gameRepository.findByGameDateOrderByGameTimeAsc(LocalDate.now());
    }

    /**
     * 특정 날짜 경기 조회
     * GET /api/games/date?date=2025-05-02
     */
    @GetMapping("/date")
    public List<Game> getGamesByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return gameRepository.findByGameDateOrderByGameTime(date);
    }

    /**
     * LIVE 경기 목록 조회 (프론트 폴링용)
     * GET /api/games/live
     */
    @GetMapping("/live")
    public List<Game> getLiveGames() {
        return gameRepository.findByYearAndMonthAndStatus(
                LocalDate.now().getYear(),
                LocalDate.now().getMonthValue(),
                "live"
        );
    }

    /**
     * 특정 경기 상세 조회
     * GET /api/games/{id}
     */
    @GetMapping("/{id}")
    public Game getGame(@PathVariable Long id) {
        return gameRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Game not found: " + id));
    }
}
