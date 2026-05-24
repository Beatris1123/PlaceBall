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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(name = "point_type", length = 50, nullable = false)
    private String pointType;
    // BATTLE_TICKET  (점령전 티켓 인증)
    // POST_WRITE     (게시글 작성)
    // COMMENT_WRITE  (댓글 작성)
    // ATTENDANCE     (출석 체크)
    // PHOTO_UPLOAD   (인증샷 업로드)

    @Column(name = "amount", nullable = false)
    private Integer amount;

    @Column(name = "description", length = 200)
    private String description;

    // 좌석 구역 — BATTLE_TICKET: OCR 추출값, 커뮤니티 활동: 해당 경기 티켓에서 자동 연결
    // 예: "1루", "3루", "외야", "중앙", "내야"
    @Column(name = "seat_zone", length = 20)
    private String seatZone;

    // 연결된 경기 날짜 —
    //   BATTLE_TICKET: 티켓의 실제 경기 날짜 (미래 티켓도 해당 날짜 저장)
    //   커뮤니티 활동: 글 작성 시점에 활성화된 경기 날짜 (오늘 이후 최근 티켓 기준)
    //   null이면 구역 집계 제외 (티켓 인증 없이 활동한 경우)
    @Column(name = "game_date")
    private LocalDate gameDate;

    @Column(name = "earned_at")
    private LocalDateTime earnedAt;

    @PrePersist
    public void prePersist() {
        this.earnedAt = LocalDateTime.now();
    }
}
