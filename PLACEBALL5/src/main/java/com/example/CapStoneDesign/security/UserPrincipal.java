package com.example.CapStoneDesign.security;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * JWT 토큰에서 추출한 로그인 사용자 정보
 * SecurityContext의 principal로 저장됨
 *
 * 컨트롤러에서 사용:
 *   @GetMapping("/me")
 *   public ResponseEntity<?> getMe(@AuthenticationPrincipal UserPrincipal me) {
 *       return ResponseEntity.ok(me.getEmail());
 *   }
 */
@Getter
@AllArgsConstructor
public class UserPrincipal {
    private final String email;
    private final String nick;
    private final String team;
    private final String color;
}
