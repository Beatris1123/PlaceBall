package com.example.placeball.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter @Setter
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // DB Primary Key

    @Column(unique = true, nullable = false)
    private String loginId; // 사용자가 입력할 아이디

    @Column(unique = true, nullable = false)
    private String nickname; // 닉네임

    @Column(nullable = false)
    private String password; // 비밀번호

    @Column(name = "favorite_team", nullable = false, length = 20)
    private String favoriteTeam; // 최애팀 (KIA, LG, 삼성, 두산, 롯데, SSG, NC, KT, 한화, 키움)
}