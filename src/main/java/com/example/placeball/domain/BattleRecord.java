package com.example.placeball.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 점령전 확정 결과 테이블 (battle_record)
 *
 * 컬럼:
 *  - game_id          : 연결된 경기 (FK, unique)
 *  - home_team        : 홈팀명
 *  - away_team        : 원정팀명
 *  - home_cheer_score : 홈팀 응원 포인트 합산
 *  - away_cheer_score : 원정팀 응원 포인트 합산
 *  - home_score       : 실제 야구 경기 홈팀 득점
 *  - away_score       : 실제 야구 경기 원정팀 득점
 *  - cheer_winner     : 점령전 승자 팀명 ("draw" | "cancel")
 *  - cheer_loser      : 점령전 패자 팀명 (무승부/취소이면 null)
 *  - created_at       : 저장 일시
 */
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

    // ── 팀명 (Game에서 복사 — 조회 편의용) ──────────────
    @Column(name = "home_team", length = 20, nullable = false)
    private String homeTeam;

    @Column(name = "away_team", length = 20, nullable = false)
    private String awayTeam;

    // ── 응원 포인트 합산 ────────────────────────────────
    @Column(name = "home_cheer_score", nullable = false)
    private Integer homeCheerScore = 0;

    @Column(name = "away_cheer_score", nullable = false)
    private Integer awayCheerScore = 0;

    // ── 실제 야구 경기 스코어 (없으면 null) ─────────────
    @Column(name = "home_score")
    private Integer homeScore;

    @Column(name = "away_score")
    private Integer awayScore;

    // ── 점령전 승/패 ────────────────────────────────────
    /** 점령전 승자: 팀명 | "draw" | "cancel" */
    @Column(name = "cheer_winner", length = 20)
    private String cheerWinner;

    /** 점령전 패자: 팀명 | null (무승부·취소) */
    @Column(name = "cheer_loser", length = 20)
    private String cheerLoser;

    // ── 저장 일시 ───────────────────────────────────────
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
