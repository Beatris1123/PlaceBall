package com.example.CapStoneDesign.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;

/**
 * JWT 토큰 생성 / 파싱 / 검증 유틸리티
 *
 * 토큰 구조:
 *   Header  { alg: HS256, typ: JWT }
 *   Payload { sub: email, nick: ..., team: ..., color: ..., iat: ..., exp: ... }
 *   Signature (서버 시크릿 키로 서명)
 */
@Slf4j
@Component
public class JwtUtil {

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms}") long expirationMs
    ) {
        // application.properties의 시크릿 키를 HMAC-SHA 키로 변환
        byte[] keyBytes = Base64.getDecoder().decode(secret);
        this.secretKey   = Keys.hmacShaKeyFor(keyBytes);
        this.expirationMs = expirationMs;
    }

    // ────────────────────────────────────────────────
    //  토큰 생성
    // ────────────────────────────────────────────────

    /**
     * 로그인 성공 시 JWT 발급
     * @param email 사용자 이메일 (subject)
     * @param nick  닉네임
     * @param team  응원 팀
     * @param color 팀 색상
     */
    public String generateToken(String email, String nick, String team, String color) {
        Date now    = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(email)                       // 표준 클레임: sub
                .claim("nick",  nick)                 // 커스텀 클레임
                .claim("team",  team)
                .claim("color", color)
                .issuedAt(now)                        // 표준 클레임: iat
                .expiration(expiry)                   // 표준 클레임: exp
                .signWith(secretKey)                  // HS256 서명
                .compact();
    }

    // ────────────────────────────────────────────────
    //  토큰 파싱
    // ────────────────────────────────────────────────

    /** 토큰에서 Claims(페이로드) 전체 추출 */
    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /** 토큰에서 이메일(subject) 추출 */
    public String getEmail(String token) {
        return parseClaims(token).getSubject();
    }

    /** 토큰에서 닉네임 추출 */
    public String getNick(String token) {
        return parseClaims(token).get("nick", String.class);
    }

    // ────────────────────────────────────────────────
    //  토큰 검증
    // ────────────────────────────────────────────────

    /**
     * 토큰 유효성 검사
     * @return true: 유효, false: 만료/위변조/형식오류
     */
    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("JWT 토큰 만료: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.warn("지원하지 않는 JWT 형식: {}", e.getMessage());
        } catch (MalformedJwtException e) {
            log.warn("JWT 형식 오류: {}", e.getMessage());
        } catch (SecurityException e) {
            log.warn("JWT 서명 오류: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.warn("JWT 토큰이 비어있음: {}", e.getMessage());
        }
        return false;
    }
}
