package com.example.CapStoneDesign.controller;

import com.example.CapStoneDesign.dto.LoginRequest;
import com.example.CapStoneDesign.dto.LoginResponse;
import com.example.CapStoneDesign.dto.SignupRequest;
import com.example.CapStoneDesign.security.UserPrincipal;
import com.example.CapStoneDesign.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 회원 API 컨트롤러
 *
 * POST /api/users/signup       회원가입
 * POST /api/users/login        로그인 → JWT 발급
 * GET  /api/users/check-email  이메일 중복 확인
 * GET  /api/users/check-nick   닉네임 중복 확인
 * GET  /api/users/me           내 정보 조회 (JWT 필요)
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserApiController {

    private final UserService userService;

    // ────────────────────────────────────────────────
    //  회원가입
    //  POST /api/users/signup
    //  Body: { email, password, nick, team, color }
    //  Response 201: { "message": "회원가입이 완료되었습니다" }
    // ────────────────────────────────────────────────
    @PostMapping("/signup")
    public ResponseEntity<Map<String, String>> signup(
            @Valid @RequestBody SignupRequest request
    ) {
        userService.signup(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of("message", "회원가입이 완료되었습니다"));
    }

    // ────────────────────────────────────────────────
    //  로그인
    //  POST /api/users/login
    //  Body: { email, password }
    //  Response 200: { token, email, nick, team, color }
    // ────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        LoginResponse response = userService.login(request);
        return ResponseEntity.ok(response);
    }

    // ────────────────────────────────────────────────
    //  이메일 중복 확인
    //  GET /api/users/check-email?email=xxx@xxx.com
    //  Response: { "duplicate": true/false }
    // ────────────────────────────────────────────────
    @GetMapping("/check-email")
    public ResponseEntity<Map<String, Boolean>> checkEmail(
            @RequestParam String email
    ) {
        return ResponseEntity.ok(
                Map.of("duplicate", userService.isEmailDuplicate(email))
        );
    }

    // ────────────────────────────────────────────────
    //  닉네임 중복 확인
    //  GET /api/users/check-nick?nick=잠실팬
    //  Response: { "duplicate": true/false }
    // ────────────────────────────────────────────────
    @GetMapping("/check-nick")
    public ResponseEntity<Map<String, Boolean>> checkNick(
            @RequestParam String nick
    ) {
        return ResponseEntity.ok(
                Map.of("duplicate", userService.isNickDuplicate(nick))
        );
    }

    // ────────────────────────────────────────────────
    //  내 정보 조회 (JWT 인증 필요)
    //  GET /api/users/me
    //  Header: Authorization: Bearer <token>
    //  Response: { email, nick, team, color }
    // ────────────────────────────────────────────────
    @GetMapping("/me")
    public ResponseEntity<Map<String, String>> getMe(
            @AuthenticationPrincipal UserPrincipal me
    ) {
        return ResponseEntity.ok(Map.of(
                "email", me.getEmail(),
                "nick",  me.getNick()  != null ? me.getNick()  : "",
                "team",  me.getTeam() != null ? me.getTeam() : "",
                "color", me.getColor() != null ? me.getColor() : ""
        ));
    }
}
