package com.example.placeball.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "game",
       uniqueConstraints = @UniqueConstraint(columnNames = {"game_date", "home_team", "away_team"}))
@Getter @Setter
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_date", nullable = false)
    private LocalDate gameDate;          // 경기 날짜 (예: 2025-05-02)

    @Column(name = "game_time")
    private LocalTime gameTime;          // 경기 시작 시간 (예: 18:30)

    @Column(name = "home_team", nullable = false, length = 20)
    private String homeTeam;             // 홈팀 (예: KIA)

    @Column(name = "away_team", nullable = false, length = 20)
    private String awayTeam;             // 원정팀 (예: LG)

    @Column(name = "home_score")
    private Integer homeScore;           // 홈팀 점수 (경기 전이면 null)

    @Column(name = "away_score")
    private Integer awayScore;           // 원정팀 점수 (경기 전이면 null)

    @Column(name = "status", length = 20)
    private String status;               // "upcoming" | "live" | "finished" | "canceled"

    @Column(name = "venue", length = 100)
    private String venue;                // 구장명

    @Column(name = "inning", length = 20)
    private String inning;               // 현재 이닝 (live일 때만)

    @Column(name = "weather", length = 20)
    private String weather;              // 날씨 이모지
}
