package com.example.CapStoneDesign.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 회원가입 요청 DTO
 * 프론트에서 받는 JSON:
 * {
 *   "email":    "user@example.com",
 *   "password": "plainPassword123",  ← 서버에서 BCrypt 암호화
 *   "nick":     "잠실팬",
 *   "team":     "LG 트윈스",
 *   "color":    "#C30452"
 * }
 */
@Getter
@NoArgsConstructor
public class SignupRequest {

    @Email(message = "올바른 이메일 형식이 아닙니다")
    @NotBlank(message = "이메일은 필수입니다")
    private String email;

    @NotBlank(message = "비밀번호는 필수입니다")
    @Size(min = 8, message = "비밀번호는 최소 8자 이상이어야 합니다")
    private String password;  // 평문 비밀번호 (서버에서 즉시 암호화, 저장 안 함)

    @NotBlank(message = "닉네임은 필수입니다")
    @Size(min = 2, max = 20, message = "닉네임은 2~20자 사이여야 합니다")
    private String nick;

    private String team;   // nullable (팀 미선택 허용)
    private String color;  // nullable
}
