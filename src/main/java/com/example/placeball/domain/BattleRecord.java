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

    // 참여한 회원
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    // 대상 경기
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id")
    private Game game;

    // 점령전 정보
    @Column(name = "zone", length = 50)
    private String zone;                    // 참여 구역 (중앙 응원석, 1루 오렌지 등)

    @Column(name = "my_team", length = 20)
    private String myTeam;                  // 응원 팀

    // 티켓 OCR 결과
    @Column(name = "ticket_image_url", length = 500)
    private String ticketImageUrl;          // 업로드된 티켓 이미지 URL

    @Column(name = "ocr_date", length = 50)
    private String ocrDate;                 // OCR로 추출한 날짜

    @Column(name = "ocr_match", length = 100)
    private String ocrMatch;                // OCR로 추출한 경기 (KIA vs LG)

    @Column(name = "ocr_stadium", length = 100)
    private String ocrStadium;              // OCR로 추출한 구장

    @Column(name = "ocr_seat", length = 100)
    private String ocrSeat;                 // OCR로 추출한 좌석

    @Column(name = "ocr_raw_text", columnDefinition = "TEXT")
    private String ocrRawText;              // OCR 원문 전체

    @Column(name = "ocr_confidence")
    private Integer ocrConfidence = 0;      // OCR 신뢰도 (0~100)

    // 처리 상태
    @Column(name = "status", length = 20)
    private String status = "pending";      // pending / approved / rejected

    // 포인트
    @Column(name = "point_earned")
    private Integer pointEarned = 0;        // 획득한 포인트

    @Column(name = "participated_at")
    private LocalDateTime participatedAt;   // 참여 일시

    @PrePersist
    public void prePersist() {
        this.participatedAt = LocalDateTime.now();
    }
}
