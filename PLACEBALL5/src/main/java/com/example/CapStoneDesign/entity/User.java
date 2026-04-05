package com.example.CapStoneDesign.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 회원 엔티티
 * - pw 필드 제거 → passwordHash (BCrypt 암호화 저장)
 * - createdAt 자동 기록
 */
@Entity
@Table(name = "users")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── 인증 정보 ──────────────────────────────────
    @Column(unique = true, nullable = false, length = 100)
    @Email(message = "올바른 이메일 형식이 아닙니다")
    @NotBlank(message = "이메일은 필수입니다")
    private String email;

    /**
     * BCrypt 암호화된 비밀번호 저장
     * 절대로 평문 비밀번호를 여기에 저장하지 않습니다
     */
    @Column(nullable = false)
    private String passwordHash;

    // ── 프로필 정보 ────────────────────────────────
    @Column(unique = true, nullable = false, length = 20)
    @NotBlank(message = "닉네임은 필수입니다")
    @Size(min = 2, max = 20, message = "닉네임은 2~20자 사이여야 합니다")
    private String nick;

    /** 응원 팀 (예: "LG 트윈스") */
    @Column(length = 50)
    private String team;

    /** 팀 대표 색상 HEX (예: "#C30452") */
    @Column(length = 10)
    private String color;

    // ── 메타 정보 ──────────────────────────────────
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
