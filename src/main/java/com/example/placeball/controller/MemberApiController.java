package com.example.placeball.controller;

import com.example.placeball.domain.Member;
import com.example.placeball.repository.MemberRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MemberApiController {

    private final MemberRepository memberRepository;

    // 1. 아이디 중복 확인
    @GetMapping("/check-id")
    public Map<String, Boolean> checkId(@RequestParam String id) {
        return Map.of("available", !memberRepository.existsByLoginId(id));
    }

    // 2. 닉네임 중복 확인
    @GetMapping("/check-nickname")
    public Map<String, Boolean> checkNickname(@RequestParam String nickname) {
        return Map.of("available", !memberRepository.existsByNickname(nickname));
    }

    // 3. 회원가입
    @PostMapping("/signup")
    public Map<String, Object> signup(@RequestBody SignupRequest req) {
        // 필드 검증
        if (req.getId()       == null || req.getId().isBlank())
            return Map.of("success", false, "message", "아이디를 입력해주세요.");
        if (!req.getId().matches("^[a-zA-Z0-9]{4,20}$"))
            return Map.of("success", false, "message", "아이디는 영문·숫자 4~20자로 입력해주세요.");
        if (req.getNickname() == null || req.getNickname().isBlank())
            return Map.of("success", false, "message", "닉네임을 입력해주세요.");
        if (req.getPassword() == null || req.getPassword().length() < 8)
            return Map.of("success", false, "message", "비밀번호는 8자 이상이어야 합니다.");
        if (req.getFavoriteTeam() == null || req.getFavoriteTeam().isBlank())
            return Map.of("success", false, "message", "응원 팀을 선택해주세요.");

        // 중복 확인
        if (memberRepository.existsByLoginId(req.getId()))
            return Map.of("success", false, "message", "이미 사용 중인 아이디입니다.");
        if (memberRepository.existsByNickname(req.getNickname()))
            return Map.of("success", false, "message", "이미 사용 중인 닉네임입니다.");

        Member member = new Member();
        member.setLoginId(req.getId());
        member.setNickname(req.getNickname());
        member.setPassword(req.getPassword());   // 평문 저장 (기존 방식 유지)
        member.setFavoriteTeam(req.getFavoriteTeam());
        memberRepository.save(member);

        return Map.of("success", true);
    }

    // 4. 로그인
    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginRequest req) {
        Optional<Member> opt = memberRepository.findByLoginId(req.getId());
        if (opt.isPresent() && opt.get().getPassword().equals(req.getPassword())) {
            Member m = opt.get();
            String nick = (m.getNickname() != null && !m.getNickname().isBlank())
                    ? m.getNickname() : m.getLoginId();
            return Map.of(
                    "success",      true,
                    "nickname",     nick,
                    "favoriteTeam", m.getFavoriteTeam() != null ? m.getFavoriteTeam() : ""
            );
        }
        return Map.of("success", false, "message", "아이디 또는 비밀번호가 올바르지 않습니다.");
    }

    // 5. 내 정보 조회
    @GetMapping("/my-info")
    public Map<String, Object> myInfo(@RequestParam String nickname) {
        return memberRepository.findByNickname(nickname)
                .map(m -> Map.<String, Object>of(
                        "nickname",     m.getNickname(),
                        "favoriteTeam", m.getFavoriteTeam() != null ? m.getFavoriteTeam() : ""
                ))
                .orElse(Map.of("error", "not found"));
    }
}

@Data class SignupRequest {
    private String id;
    private String nickname;
    private String password;
    private String favoriteTeam;
}

@Data class LoginRequest {
    private String id;
    private String password;
}