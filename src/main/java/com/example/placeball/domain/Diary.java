package com.example.placeball.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "diary")
@Getter @Setter
public class Diary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 작성한 회원
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    // 경기 정보
    @Column(name = "game_date", nullable = false)
    private LocalDate gameDate;             // 직관 날짜

    @Column(name = "home_team", length = 20)
    private String homeTeam;               // 홈팀

    @Column(name = "away_team", length = 20)
    private String awayTeam;               // 원정팀

    @Column(name = "home_score")
    private Integer homeScore;             // 홈팀 점수

    @Column(name = "away_score")
    private Integer awayScore;             // 원정팀 점수

    @Column(name = "my_team", length = 20)
    private String myTeam;                 // 응원한 팀

    @Column(name = "result", length = 10)
    private String result;                 // win / lose / draw / cancel

    // 직관 상세
    @Column(name = "stadium", length = 100)
    private String stadium;                // 구장명

    @Column(name = "seat", length = 100)
    private String seat;                   // 좌석 정보

    @Column(name = "weather", length = 10)
    private String weather;                // 날씨 이모지

    @Column(name = "mate", length = 100)
    private String mate;                   // 동행 (혼자, 친구 등)

    @Column(name = "mood", length = 10)
    private String mood;                   // 기분 이모지

    @Column(name = "memo", columnDefinition = "TEXT")
    private String memo;                   // 직관 메모

    // 가계부
    @Column(name = "cost_ticket")
    private Integer costTicket = 0;        // 티켓 비용

    @Column(name = "cost_transport")
    private Integer costTransport = 0;     // 교통 비용

    @Column(name = "cost_food")
    private Integer costFood = 0;          // 식비

    @Column(name = "cost_goods")
    private Integer costGoods = 0;         // 굿즈 비용

    @Column(name = "created_at")
    private LocalDateTime createdAt;       // 작성 일시

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
