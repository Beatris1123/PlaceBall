package com.example.CapStoneDesign.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 로그인 성공 응답 DTO
 * 프론트에서 받는 JSON:
 * {
 *   "token":     "eyJhbGci...",   ← JWT 토큰 (localStorage에 저장)
 *   "email":     "user@example.com",
 *   "nick":      "잠실팬",
 *   "team":      "LG 트윈스",
 *   "color":     "#C30452"
 * }
 *
 * ⚠️ passwordHash는 절대 포함하지 않음
 */
@Getter
@AllArgsConstructor
public class LoginResponse {
    private final String token;
    private final String email;
    private final String nick;
    private final String team;
    private final String color;
}
