package com.example.CapStoneDesign.config;

import com.example.CapStoneDesign.security.JwtFilter;
import com.example.CapStoneDesign.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Spring Security 전역 설정
 *
 * 핵심 설계:
 *  - CSRF 비활성화 (REST API + JWT 방식이므로 불필요)
 *  - Session 비활성화 (STATELESS — JWT가 상태 관리)
 *  - 공개 API: 회원가입, 로그인, 정적 파일, H2 콘솔
 *  - 나머지 모든 API: JWT 토큰 필요
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtUtil jwtUtil;

    // ────────────────────────────────────────────────
    //  BCrypt 비밀번호 인코더 (Bean 등록)
    // ────────────────────────────────────────────────
    @Bean
    public PasswordEncoder passwordEncoder() {
        // strength 기본값 10 — 운영 환경에 충분한 강도
        return new BCryptPasswordEncoder();
    }

    // ────────────────────────────────────────────────
    //  CORS 설정
    // ────────────────────────────────────────────────
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // 허용 출처 — 개발 중에는 전체 허용, 운영 시 도메인 명시
        config.setAllowedOriginPatterns(List.of("*"));

        // 허용 메서드
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));

        // 허용 헤더 (Authorization 포함 필수)
        config.setAllowedHeaders(List.of("*"));

        // 쿠키/인증 정보 포함 허용
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // ────────────────────────────────────────────────
    //  Security 필터 체인
    // ────────────────────────────────────────────────
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CSRF 비활성화 (REST API는 불필요)
            .csrf(AbstractHttpConfigurer::disable)

            // CORS 활성화
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // 세션 사용 안 함 (JWT 기반이므로 STATELESS)
            .sessionManagement(sm ->
                sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // 경로별 인증 규칙
            .authorizeHttpRequests(auth -> auth

                // ✅ 정적 리소스 (HTML, CSS, JS)
                .requestMatchers("/", "/*.html", "/css/**", "/js/**", "/images/**").permitAll()

                // ✅ H2 콘솔 (개발용)
                .requestMatchers("/h2-console/**").permitAll()

                // ✅ 인증 없이 접근 가능한 API
                .requestMatchers(HttpMethod.POST, "/api/users/signup").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/users/login").permitAll()
                .requestMatchers(HttpMethod.GET,  "/api/users/check-email").permitAll()
                .requestMatchers(HttpMethod.GET,  "/api/users/check-nick").permitAll()

                // ✅ 시설 조회는 비로그인도 가능
                .requestMatchers(HttpMethod.GET, "/api/facilities/**").permitAll()

                // ✅ 날씨 조회는 비로그인도 가능
                .requestMatchers(HttpMethod.GET, "/api/weather/**").permitAll()

                // ✅ OPTIONS (CORS preflight)
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // 🔒 나머지 모든 요청은 JWT 필요
                .anyRequest().authenticated()
            )

            // H2 콘솔은 iframe 사용하므로 frameOptions 허용 (개발용)
            .headers(headers ->
                headers.frameOptions(fo -> fo.sameOrigin()))

            // JWT 필터를 UsernamePasswordAuthenticationFilter 앞에 삽입
            .addFilterBefore(
                new JwtFilter(jwtUtil),
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
}
