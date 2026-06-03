package com.example.placeball.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "cheer_point")
@Getter @Setter
public class CheerPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 포인트 획득한 회원
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    // 포인트 종류
    @Column(name = "point_type", length = 50, nullable = false)
    private String pointType;
    // 예: BATTLE_TICKET  (점령전 티켓 인증)
    //     DIARY_WRITE    (다이어리 작성)
    //     POST_WRITE     (게시글 작성)
    //     COMMENT_WRITE  (댓글 작성)
    //     ATTENDANCE     (출석 체크)

    @Column(name = "amount", nullable = false)
    private Integer amount;                 // 획득량 (음수면 차감)

    @Column(name = "description", length = 200)
    private String description;            // 상세 설명 (예: "KIA vs LG 직관 티켓 인증")

    // 좌석 구역 — 티켓 인증 시 OCR 좌석 정보에서 추출 (온라인 활동은 null)
    // 예: "1루", "3루", "외야", "중앙", "내야"
    @Column(name = "seat_zone", length = 20)
    private String seatZone;

    // 티켓 인증 시 실제 경기 날짜 (커뮤니티 활동은 연결된 티켓의 경기 날짜)
    @Column(name = "game_date")
    private LocalDate gameDate;

    @Column(name = "earned_at")
    private LocalDateTime earnedAt;        // 획득 일시

    @PrePersist
    public void prePersist() {
        this.earnedAt = LocalDateTime.now();
    }
}
