package com.example.placeball.domain;

import com.fasterxml.jackson.annotation.JsonFormat;
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

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @Column(name = "game_date", nullable = false)
    private LocalDate gameDate;          // 경기 날짜 → JSON: "2026-05-16"

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm:ss")
    @Column(name = "game_time")
    private LocalTime gameTime;          // 경기 시작 시간 → JSON: "18:30:00"

    @Column(name = "home_team", nullable = false, length = 20)
    private String homeTeam;

    @Column(name = "away_team", nullable = false, length = 20)
    private String awayTeam;

    @Column(name = "home_score")
    private Integer homeScore;

    @Column(name = "away_score")
    private Integer awayScore;

    @Column(name = "status", length = 20)
    private String status;               // "upcoming" | "live" | "finished" | "canceled"

    @Column(name = "venue", length = 100)
    private String venue;

    @Column(name = "inning", length = 20)
    private String inning;

    @Column(name = "weather", length = 20)
    private String weather;
}