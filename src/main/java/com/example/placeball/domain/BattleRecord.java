package com.example.placeball.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "battle_record")
@Getter @Setter
public class BattleRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 연결된 경기
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false, unique = true)
    private Game game;

    // 홈팀 응원 포인트 합산
    @Column(name = "home_cheer_score", nullable = false)
    private Integer homeCheerScore = 0;

    // 원정팀 응원 포인트 합산
    @Column(name = "away_cheer_score", nullable = false)
    private Integer awayCheerScore = 0;

    // 점령전 승자 팀명 (무승부면 "draw")
    @Column(name = "cheer_winner", length = 20)
    private String cheerWinner;

    // 저장 일시
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
