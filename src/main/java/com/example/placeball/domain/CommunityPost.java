package com.example.placeball.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "community_post")
@Getter @Setter
public class CommunityPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 작성자
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    // 카테고리: chat | photo | analysis | cheer | info
    @Column(name = "tab", nullable = false, length = 20)
    private String tab;

    @Column(name = "title", nullable = false, length = 100)
    private String title;

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    // 성향 이모지 (프론트에서 넘겨주는 값)
    @Column(name = "persona", length = 10)
    private String persona;

    @Column(name = "likes")
    private Integer likes = 0;

    @Column(name = "views")
    private Integer views = 0;

    @Column(name = "edited")
    private Boolean edited = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // 첨부 이미지들 (Base64 URL)
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sortOrder ASC")
    private List<PostImage> images = new ArrayList<>();

    // 좋아요 누른 닉네임 목록 (간단 구현 — 쉼표 구분 문자열)
    @Column(name = "liked_by", columnDefinition = "TEXT")
    private String likedBy = "";

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // 좋아요 여부 확인
    public boolean isLikedBy(String nickname) {
        if (likedBy == null || likedBy.isBlank()) return false;
        for (String n : likedBy.split(",")) {
            if (n.trim().equals(nickname)) return true;
        }
        return false;
    }

    // 좋아요 추가
    public void addLike(String nickname) {
        if (isLikedBy(nickname)) return;
        likedBy = (likedBy == null || likedBy.isBlank()) ? nickname : likedBy + "," + nickname;
        likes = (likes == null ? 0 : likes) + 1;
    }

    // 좋아요 취소
    public void removeLike(String nickname) {
        if (!isLikedBy(nickname)) return;
        List<String> list = new ArrayList<>();
        for (String n : likedBy.split(",")) {
            if (!n.trim().equals(nickname)) list.add(n.trim());
        }
        likedBy = String.join(",", list);
        likes = Math.max(0, (likes == null ? 0 : likes) - 1);
    }
}