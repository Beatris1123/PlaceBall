package com.example.CapStoneDesign.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 로그인 요청 DTO
 * {
 *   "email":    "user@example.com",
 *   "password": "plainPassword123"
 * }
 */
@Getter
@NoArgsConstructor
public class LoginRequest {

    @Email(message = "올바른 이메일 형식이 아닙니다")
    @NotBlank(message = "이메일은 필수입니다")
    private String email;

    @NotBlank(message = "비밀번호는 필수입니다")
    private String password;
}
