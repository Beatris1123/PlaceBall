package com.example.CapStoneDesign.service;

import com.example.CapStoneDesign.dto.LoginRequest;
import com.example.CapStoneDesign.dto.LoginResponse;
import com.example.CapStoneDesign.dto.SignupRequest;
import com.example.CapStoneDesign.entity.User;
import com.example.CapStoneDesign.exception.DuplicateException;
import com.example.CapStoneDesign.exception.InvalidCredentialsException;
import com.example.CapStoneDesign.repository.UserRepository;
import com.example.CapStoneDesign.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 회원 비즈니스 로직
 *
 * Controller ← Service ← Repository 레이어 분리:
 *  - Controller: HTTP 요청/응답 처리만
 *  - Service:    비즈니스 로직 (암호화, 검증, JWT 발급)
 *  - Repository: DB 접근만
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository   userRepository;
    private final PasswordEncoder  passwordEncoder;
    private final JwtUtil          jwtUtil;

    // ────────────────────────────────────────────────
    //  회원가입
    // ────────────────────────────────────────────────

    @Transactional
    public void signup(SignupRequest req) {
        // 1. 이메일 중복 검사
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new DuplicateException("이미 사용 중인 이메일입니다: " + req.getEmail());
        }
        // 2. 닉네임 중복 검사
        if (userRepository.existsByNick(req.getNick())) {
            throw new DuplicateException("이미 사용 중인 닉네임입니다: " + req.getNick());
        }

        // 3. 비밀번호 BCrypt 암호화 후 저장
        //    입력된 평문 비밀번호(req.getPassword())는 절대 DB에 저장하지 않음
        String hash = passwordEncoder.encode(req.getPassword());

        User user = User.builder()
                .email(req.getEmail())
                .passwordHash(hash)         // 암호화된 해시만 저장
                .nick(req.getNick())
                .team(req.getTeam())
                .color(req.getColor())
                .build();

        userRepository.save(user);
        log.info("회원가입 완료: email={}, nick={}", user.getEmail(), user.getNick());
    }

    // ────────────────────────────────────────────────
    //  로그인
    // ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest req) {
        // 1. 이메일로 회원 조회
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new InvalidCredentialsException("이메일 또는 비밀번호가 일치하지 않습니다"));

        // 2. 비밀번호 검증 (BCrypt matches)
        //    DB의 hash와 입력 평문을 비교 — 절대 역방향(복호화) 아님
        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("이메일 또는 비밀번호가 일치하지 않습니다");
        }

        // 3. JWT 발급
        String token = jwtUtil.generateToken(
                user.getEmail(),
                user.getNick(),
                user.getTeam(),
                user.getColor()
        );

        log.info("로그인 성공: email={}", user.getEmail());

        // 4. 응답 반환 (passwordHash 절대 포함 안 함)
        return new LoginResponse(
                token,
                user.getEmail(),
                user.getNick(),
                user.getTeam(),
                user.getColor()
        );
    }

    // ────────────────────────────────────────────────
    //  중복 검사
    // ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public boolean isEmailDuplicate(String email) {
        return userRepository.existsByEmail(email);
    }

    @Transactional(readOnly = true)
    public boolean isNickDuplicate(String nick) {
        return userRepository.existsByNick(nick);
    }
}
