package com.example.CapStoneDesign.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * JWT 인증 필터
 *
 * 모든 HTTP 요청 진입 시 실행:
 *   1. Authorization 헤더에서 "Bearer <token>" 추출
 *   2. 토큰 유효성 검사
 *   3. 유효하면 SecurityContext에 인증 정보 등록
 *   4. 이후 컨트롤러에서 @AuthenticationPrincipal 로 사용자 정보 접근 가능
 */
@Slf4j
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(
            HttpServletRequest  request,
            HttpServletResponse response,
            FilterChain         chain
    ) throws ServletException, IOException {

        String token = extractToken(request);

        if (StringUtils.hasText(token) && jwtUtil.validateToken(token)) {
            try {
                Claims claims = jwtUtil.parseClaims(token);
                String email  = claims.getSubject();
                String nick   = claims.get("nick",  String.class);
                String team   = claims.get("team",  String.class);
                String color  = claims.get("color", String.class);

                // Spring Security 인증 객체 생성
                // Principal로 email 저장, Details에 nick/team/color 담기 위해 UserPrincipal 사용
                UserPrincipal principal = new UserPrincipal(email, nick, team, color);

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                principal,    // principal
                                null,         // credentials (이미 토큰 검증 완료)
                                List.of()     // authorities (현재는 권한 없음, 추후 ROLE 추가)
                        );
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // SecurityContext에 인증 등록 → 이후 @AuthenticationPrincipal로 접근 가능
                SecurityContextHolder.getContext().setAuthentication(auth);

            } catch (Exception e) {
                log.error("JWT 인증 처리 중 오류: {}", e.getMessage());
                // SecurityContext 초기화 (안전을 위해)
                SecurityContextHolder.clearContext();
            }
        }

        chain.doFilter(request, response);
    }

    /**
     * Authorization 헤더에서 Bearer 토큰 추출
     * "Authorization: Bearer eyJhbGci..."  →  "eyJhbGci..."
     */
    private String extractToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }
}
